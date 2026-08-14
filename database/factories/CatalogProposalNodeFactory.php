<?php

namespace Database\Factories;

use App\Models\CatalogProposal;
use App\Models\CatalogProposalNode;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CatalogProposalNode>
 */
class CatalogProposalNodeFactory extends Factory
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
            'parent_id' => null,
            'position' => 0,
            'name' => fake()->unique()->words(3, true),
            'definition' => fake()->sentence(),
            'demonstration_criteria' => fake()->sentence(),
            'prerequisites' => null,
            'work_opportunities' => null,
            'technologies' => null,
            'selected' => true,
            'copied_competency_id' => null,
        ];
    }
}
