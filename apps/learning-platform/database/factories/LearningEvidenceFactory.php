<?php

namespace Database\Factories;

use App\Models\CoachingSession;
use App\Models\LearningEvidence;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<LearningEvidence> */
class LearningEvidenceFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'coaching_session_id' => CoachingSession::factory(),
            'learner_id' => fn (array $attributes) => CoachingSession::findOrFail($attributes['coaching_session_id'])->learner_id,
            'competency_id' => fn (array $attributes) => CoachingSession::findOrFail($attributes['coaching_session_id'])->primary_learning_objective_id,
            'recorded_by_id' => fn (array $attributes) => $attributes['learner_id'],
            'idempotency_key' => fake()->uuid(), 'request_hash' => hash('sha256', fake()->uuid()), 'schema_version' => 1,
            'evidence' => ['activity' => 'implementation', 'assistance' => 'guided', 'hints_used' => 1, 'ownership' => 'learner', 'learner_work' => 'Implemented validation', 'agent_work' => 'Provided a hint', 'verification' => ['passed' => true, 'reference' => 'Validation test passed'], 'teach_back' => ['demonstrated' => true, 'summary' => 'Explained input constraints'], 'context_key' => 'validation', 'context_description' => 'HTTP request validation', 'source' => 'learner'],
        ];
    }
}
