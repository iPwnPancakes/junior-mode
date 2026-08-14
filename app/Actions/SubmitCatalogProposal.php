<?php

namespace App\Actions;

use App\BaselineAssessmentDecision;
use App\CatalogProposalStatus;
use App\Models\CatalogProposal;
use App\Models\CatalogProposalNode;
use App\Models\ClientConnection;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmitCatalogProposal
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(
        User $learner,
        ClientConnection $clientConnection,
        CatalogProposal $catalogProposal,
        array $data,
    ): CatalogProposal {
        if ($catalogProposal->learner_id !== $learner->id
            || $catalogProposal->client_connection_id !== $clientConnection->id
            || $catalogProposal->status !== CatalogProposalStatus::Interviewing) {
            throw ValidationException::withMessages([
                'proposal_id' => __('This Catalog Proposal is not available for submission.'),
            ]);
        }

        return DB::transaction(function () use ($catalogProposal, $data): CatalogProposal {
            $lockedProposal = CatalogProposal::query()->lockForUpdate()->findOrFail($catalogProposal->id);

            if ($lockedProposal->status !== CatalogProposalStatus::Interviewing) {
                throw ValidationException::withMessages([
                    'proposal_id' => __('This Catalog Proposal has already been submitted.'),
                ]);
            }

            $nodes = $this->nodesFrom($data);
            $keys = $nodes->pluck('key');

            if ($keys->unique()->count() !== $keys->count()) {
                throw ValidationException::withMessages([
                    'nodes' => __('Each proposed node key must be unique.'),
                ]);
            }

            $createdNodes = $this->createNodes($lockedProposal, $nodes);

            foreach ($this->baselineAssessmentsFrom($data) as $assessment) {
                $node = $createdNodes->get(Arr::get($assessment, 'node_key'));

                if (! $node instanceof CatalogProposalNode) {
                    throw ValidationException::withMessages([
                        'baseline_assessments' => __('Every baseline Assessment must reference a proposed node.'),
                    ]);
                }

                $lockedProposal->baselineAssessments()->create([
                    'catalog_proposal_node_id' => $node->id,
                    'level' => Arr::get($assessment, 'level'),
                    'rationale' => Arr::get($assessment, 'rationale'),
                    'decision' => BaselineAssessmentDecision::Pending,
                ]);
            }

            $lockedProposal->update([
                'interview_context' => Arr::only($data, [
                    'stacks',
                    'codebases',
                    'expected_work',
                    'development_goals',
                ]),
                'status' => CatalogProposalStatus::AwaitingReview,
                'submitted_at' => now(),
            ]);

            return $lockedProposal->fresh(['nodes', 'baselineAssessments.node']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     * @return Collection<int, array<string, mixed>>
     */
    private function nodesFrom(array $data): Collection
    {
        $nodes = new Collection;

        foreach ($data['nodes'] ?? [] as $node) {
            if (is_array($node)) {
                $nodes->push($node);
            }
        }

        return $nodes;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<int, array<string, mixed>>
     */
    private function baselineAssessmentsFrom(array $data): array
    {
        $assessments = [];

        foreach ($data['baseline_assessments'] ?? [] as $assessment) {
            if (is_array($assessment)) {
                $assessments[] = $assessment;
            }
        }

        return $assessments;
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $nodes
     * @return Collection<string, CatalogProposalNode>
     */
    private function createNodes(CatalogProposal $catalogProposal, Collection $nodes): Collection
    {
        $pending = $nodes->keyBy(fn (array $node): string => (string) Arr::get($node, 'key'));
        $created = collect();

        while ($pending->isNotEmpty()) {
            $createdThisPass = 0;

            foreach ($pending as $key => $node) {
                $parentKey = Arr::get($node, 'parent_key');

                if ($parentKey !== null && ! $created->has($parentKey)) {
                    continue;
                }

                $createdNode = $catalogProposal->nodes()->create([
                    'parent_id' => $parentKey === null ? null : $created->get($parentKey)?->id,
                    'position' => Arr::get($node, 'position', 0),
                    'name' => Arr::get($node, 'name'),
                    'definition' => Arr::get($node, 'definition'),
                    'demonstration_criteria' => Arr::get($node, 'demonstration_criteria'),
                    'prerequisites' => Arr::get($node, 'prerequisites'),
                    'work_opportunities' => Arr::get($node, 'work_opportunities'),
                    'technologies' => Arr::get($node, 'technologies'),
                    'selected' => true,
                ]);

                $created->put((string) $key, $createdNode);
                $pending->forget($key);
                $createdThisPass++;
            }

            if ($createdThisPass === 0) {
                throw ValidationException::withMessages([
                    'nodes' => __('Proposed node parents must exist and may not form a cycle.'),
                ]);
            }
        }

        return $created;
    }
}
