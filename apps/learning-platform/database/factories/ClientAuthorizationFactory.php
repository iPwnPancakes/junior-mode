<?php

namespace Database\Factories;

use App\Models\ClientAuthorization;
use App\Models\ClientConnection;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ClientAuthorization>
 */
class ClientAuthorizationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Codex '.fake()->randomElement(['CLI', 'Desktop', 'VS Code']),
            'device_code_hash' => hash('sha256', 'jmd_'.Str::random(64)),
            'user_code_hash' => hash('sha256', Str::upper(Str::random(8))),
            'expires_at' => now()->addMinutes(10),
            'approved_at' => null,
            'exchanged_at' => null,
            'client_connection_id' => null,
        ];
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes): array => [
            'expires_at' => now()->subSecond(),
        ]);
    }

    public function approved(?ClientConnection $clientConnection = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'approved_at' => now(),
            'client_connection_id' => $clientConnection
                ?? ClientConnection::factory()->awaitingExchange(),
        ]);
    }
}
