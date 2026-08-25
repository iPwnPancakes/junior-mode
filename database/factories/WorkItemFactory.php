<?php

namespace Database\Factories;

use App\Models\EnrolledRepository;
use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkItem>
 */
class WorkItemFactory extends Factory
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
            'enrolled_repository_id' => EnrolledRepository::factory(),
            'fingerprint' => hash('sha256', fake()->unique()->sentence()),
            'title' => fake()->sentence(5),
            'description' => fake()->paragraph(),
            'external_url' => fake()->optional()->url(),
            'detected_technologies' => ['Laravel'],
            'likely_catalog_branches' => [],
        ];
    }
}
