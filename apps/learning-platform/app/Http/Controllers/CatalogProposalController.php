<?php

namespace App\Http\Controllers;

use App\Models\BaselineAssessmentProposal;
use App\Models\CatalogProposal;
use App\Models\CatalogProposalNode;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CatalogProposalController extends Controller
{
    public function show(User $learner, CatalogProposal $catalogProposal): Response
    {
        Gate::authorize('manageCompetencyCatalog', $learner);
        abort_unless($catalogProposal->learner_id === $learner->id, 404);

        $catalogProposal->load(['nodes', 'baselineAssessments.node', 'clientConnection:id,name']);

        return Inertia::render('catalog-proposals/show', [
            'learner' => ['id' => $learner->id, 'name' => $learner->name, 'email' => $learner->email],
            'proposal' => [
                'id' => $catalogProposal->id,
                'status' => $catalogProposal->status->value,
                'submittedAt' => $catalogProposal->submitted_at?->toDateString(),
                'interviewContext' => $catalogProposal->interview_context ?? [],
                'clientName' => $catalogProposal->clientConnection->name,
                'nodes' => $catalogProposal->nodes->map(
                    fn (CatalogProposalNode $node): array => $this->serializeNode($node),
                ),
                'baselineAssessments' => $catalogProposal->baselineAssessments->map(
                    fn (BaselineAssessmentProposal $assessment): array => [
                        'id' => $assessment->id,
                        'nodeId' => $assessment->catalog_proposal_node_id,
                        'nodeName' => $assessment->node->name,
                        'level' => $assessment->level->value,
                        'rationale' => $assessment->rationale,
                        'decision' => $assessment->decision->value,
                        'applied' => $assessment->assessment()->exists(),
                    ],
                ),
            ],
        ]);
    }

    /** @return array<string, mixed> */
    private function serializeNode(CatalogProposalNode $node): array
    {
        return [
            'id' => $node->id,
            'parentId' => $node->parent_id,
            'position' => $node->position,
            'name' => $node->name,
            'definition' => $node->definition,
            'demonstrationCriteria' => $node->demonstration_criteria,
            'prerequisites' => $node->prerequisites ?? [],
            'workOpportunities' => $node->work_opportunities ?? [],
            'technologies' => $node->technologies ?? [],
            'selected' => $node->selected,
            'copiedCompetencyId' => $node->copied_competency_id,
        ];
    }
}
