<?php

namespace App\Actions;

use App\BaselineAssessmentDecision;
use App\CatalogProposalStatus;
use App\Models\CatalogProposal;
use App\Models\CatalogProposalNode;
use App\Models\Competency;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApproveCatalogProposal
{
    public function __construct(private MaterializeBaselineAssessment $materializeBaselineAssessment) {}

    public function approve(CatalogProposal $catalogProposal, User $mentor): int
    {
        return DB::transaction(function () use ($catalogProposal, $mentor): int {
            $lockedProposal = CatalogProposal::query()
                ->with(['learner', 'nodes', 'baselineAssessments.node'])
                ->lockForUpdate()
                ->findOrFail($catalogProposal->id);

            $this->ensureReviewableBy($lockedProposal, $mentor);

            $selectedNodes = $lockedProposal->nodes
                ->where('selected', true)
                ->sortBy([['parent_id', 'asc'], ['position', 'asc'], ['id', 'asc']]);

            if ($selectedNodes->isEmpty()) {
                throw ValidationException::withMessages([
                    'decision' => __('Select at least one proposal branch before approval.'),
                ]);
            }

            $createdCount = $this->copySelectedNodes($lockedProposal, $selectedNodes);

            $lockedProposal->update([
                'status' => CatalogProposalStatus::Approved,
                'reviewed_by_id' => $mentor->id,
                'reviewed_at' => now(),
            ]);

            foreach ($lockedProposal->baselineAssessments as $baselineAssessment) {
                if ($baselineAssessment->decision === BaselineAssessmentDecision::Approved) {
                    $this->materializeBaselineAssessment->handle($baselineAssessment->fresh('node'));
                }
            }

            return $createdCount;
        });
    }

    public function reject(CatalogProposal $catalogProposal, User $mentor): void
    {
        DB::transaction(function () use ($catalogProposal, $mentor): void {
            $lockedProposal = CatalogProposal::query()
                ->with('learner')
                ->lockForUpdate()
                ->findOrFail($catalogProposal->id);

            $this->ensureReviewableBy($lockedProposal, $mentor);

            $lockedProposal->update([
                'status' => CatalogProposalStatus::Rejected,
                'reviewed_by_id' => $mentor->id,
                'reviewed_at' => now(),
            ]);
        });
    }

    /**
     * @param  Collection<int, CatalogProposalNode>  $selectedNodes
     */
    private function copySelectedNodes(CatalogProposal $catalogProposal, Collection $selectedNodes): int
    {
        $createdByProposalNode = collect();
        $pending = $selectedNodes->keyBy('id');
        $nextPositions = [];

        while ($pending->isNotEmpty()) {
            $createdThisPass = 0;

            foreach ($pending as $nodeId => $node) {
                if ($node->parent_id !== null && ! $createdByProposalNode->has($node->parent_id)) {
                    continue;
                }

                $catalogParentId = $node->parent_id === null
                    ? null
                    : $createdByProposalNode->get($node->parent_id)?->id;
                $positionKey = (string) ($catalogParentId ?? 'root');
                $nextPositions[$positionKey] ??= $this->nextPosition($catalogProposal->learner_id, $catalogParentId);

                $competency = Competency::query()->create([
                    'learner_id' => $catalogProposal->learner_id,
                    'parent_id' => $catalogParentId,
                    'position' => $nextPositions[$positionKey]++,
                    'name' => $node->name,
                    'definition' => $node->definition,
                    'demonstration_criteria' => $node->demonstration_criteria,
                    'prerequisites' => $node->prerequisites,
                    'work_opportunities' => $node->work_opportunities,
                    'technologies' => $node->technologies,
                ]);

                $node->update(['copied_competency_id' => $competency->id]);
                $createdByProposalNode->put($node->id, $competency);
                $pending->forget($nodeId);
                $createdThisPass++;
            }

            if ($createdThisPass === 0) {
                throw ValidationException::withMessages([
                    'decision' => __('Selected proposal nodes must include their parent branch.'),
                ]);
            }
        }

        return $createdByProposalNode->count();
    }

    private function nextPosition(int $learnerId, ?int $parentId): int
    {
        $maximumPosition = Competency::query()
            ->where('learner_id', $learnerId)
            ->where('parent_id', $parentId)
            ->max('position');

        return $maximumPosition === null ? 0 : $maximumPosition + 1;
    }

    private function ensureReviewableBy(CatalogProposal $catalogProposal, User $mentor): void
    {
        if (! $mentor->isMentor()
            || $catalogProposal->learner->mentor_id !== $mentor->id
            || ! $catalogProposal->isEditable()) {
            throw ValidationException::withMessages([
                'decision' => __('This Catalog Proposal is not available for review.'),
            ]);
        }
    }
}
