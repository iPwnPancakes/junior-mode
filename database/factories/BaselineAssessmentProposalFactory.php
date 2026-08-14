<?php

namespace Database\Factories;

use App\BaselineAssessmentDecision;
use App\BaselineAssessmentLevel;
use App\Models\BaselineAssessmentProposal;
use App\Models\CatalogProposal;
use App\Models\CatalogProposalNode;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BaselineAssessmentProposal>
 */
class BaselineAssessmentProposalFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'catalog_proposal_id' => CatalogProposal::factory(),
            'catalog_proposal_node_id' => CatalogProposalNode::factory(),
            'level' => BaselineAssessmentLevel::NotYetObserved,
            'rationale' => null,
            'decision' => BaselineAssessmentDecision::Pending,
            'reviewed_by_id' => null,
            'reviewed_at' => null,
        ];
    }
}
