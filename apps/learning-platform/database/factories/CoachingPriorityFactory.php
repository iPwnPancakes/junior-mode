<?php

namespace Database\Factories;

use App\CoachingPriorityEmphasis;
use App\CoachingPriorityExpirationMode;
use App\CoachingPriorityStatus;
use App\Models\CoachingPriority;
use App\Models\Competency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoachingPriority>
 */
class CoachingPriorityFactory extends Factory
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
            'competency_id' => Competency::factory(),
            'created_by_id' => User::factory()->mentor(),
            'replaced_by_priority_id' => null,
            'emphasis' => CoachingPriorityEmphasis::Normal,
            'expiration_mode' => CoachingPriorityExpirationMode::DefaultDuration,
            'expires_at' => now()->addDays(7),
            'status' => CoachingPriorityStatus::Active,
            'note' => fake()->sentence(),
            'resolved_at' => null,
        ];
    }
}
