<?php

namespace Database\Factories;

use App\CatalogProposalStatus;
use App\Models\CatalogProposal;
use App\Models\ClientConnection;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CatalogProposal>
 */
class CatalogProposalFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'learner_id' => User::factory()->learner(),
            'client_connection_id' => ClientConnection::factory(),
            'interview_context' => [
                'stacks' => [fake()->word()],
                'codebases' => [fake()->sentence()],
                'expected_work' => [fake()->sentence()],
                'development_goals' => [fake()->sentence()],
            ],
            'status' => CatalogProposalStatus::AwaitingReview,
            'submitted_at' => now(),
            'reviewed_by_id' => null,
            'reviewed_at' => null,
        ];
    }

    public function interviewing(): static
    {
        return $this->state(fn (): array => [
            'interview_context' => null,
            'status' => CatalogProposalStatus::Interviewing,
            'submitted_at' => null,
        ]);
    }
}
