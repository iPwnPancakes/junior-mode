<?php

namespace Database\Factories;

use App\Models\ClientConnection;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ClientConnection>
 */
class ClientConnectionFactory extends Factory
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
            'name' => fake()->randomElement([
                'Codex on MacBook',
                'Codex in VS Code',
                'Codex CLI',
            ]),
            'token_hash' => hash('sha256', 'jm_'.Str::random(64)),
            'authorized_at' => now(),
            'last_used_at' => null,
            'revoked_at' => null,
        ];
    }

    public function awaitingExchange(): static
    {
        return $this->state(fn (array $attributes): array => [
            'token_hash' => null,
        ]);
    }

    public function revoked(): static
    {
        return $this->state(fn (array $attributes): array => [
            'revoked_at' => now(),
        ]);
    }
}
