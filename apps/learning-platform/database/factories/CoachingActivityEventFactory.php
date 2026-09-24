<?php

namespace Database\Factories;

use App\Models\CoachingActivityEvent;
use App\Models\CoachingSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CoachingActivityEvent> */
class CoachingActivityEventFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'coaching_session_id' => CoachingSession::factory(),
            'learner_id' => fn (array $attributes) => CoachingSession::query()->whereKey($attributes['coaching_session_id'])->firstOrFail()->learner_id,
            'kind' => 'hint',
            'idempotency_key' => fake()->uuid(),
            'request_hash' => hash('sha256', fake()->uuid()),
            'payload' => ['explicitly_requested' => true, 'summary' => 'Pointed to the relevant validation concept'],
        ];
    }
}
