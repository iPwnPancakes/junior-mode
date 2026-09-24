<?php

namespace Database\Factories;

use App\Models\Competency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Competency> */
class CompetencyFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'learner_id' => User::factory()->learner(),
            'parent_id' => null,
            'position' => 0,
            'name' => fake()->unique()->words(3, true),
            'definition' => fake()->sentence(),
            'demonstration_criteria' => fake()->sentence(),
            'prerequisites' => null,
            'work_opportunities' => null,
            'technologies' => null,
            'archived_at' => null,
            'merged_into_id' => null,
        ];
    }

    public function forLearner(User $learner): static
    {
        return $this->state(fn (): array => ['learner_id' => $learner->id]);
    }

    public function archived(): static
    {
        return $this->state(fn (): array => ['archived_at' => now()]);
    }
}
