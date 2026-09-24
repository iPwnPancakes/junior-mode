<?php

namespace Database\Factories;

use App\BaselineAssessmentLevel;
use App\Models\Assessment;
use App\Models\Competency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Assessment>
 */
class AssessmentFactory extends Factory
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
            'assessed_by_id' => User::factory()->mentor(),
            'baseline_assessment_proposal_id' => null,
            'level' => BaselineAssessmentLevel::NotYetObserved,
            'rationale' => null,
            'assessed_at' => now(),
        ];
    }
}
