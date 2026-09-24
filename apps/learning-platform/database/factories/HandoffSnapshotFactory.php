<?php

namespace Database\Factories;

use App\Models\CoachingSession;
use App\Models\HandoffSnapshot;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<HandoffSnapshot> */
class HandoffSnapshotFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'coaching_session_id' => CoachingSession::factory(),
            'learner_id' => fn (array $attributes) => CoachingSession::query()->whereKey($attributes['coaching_session_id'])->sole()->learner_id,
            'payload' => ['contract_version' => '1', 'facts' => [], 'agent_hypotheses' => [], 'mentor_questions' => []],
            'fingerprint' => fake()->sha256(),
            'idempotency_key' => fake()->uuid(),
            'request_hash' => fake()->sha256(),
        ];
    }
}
