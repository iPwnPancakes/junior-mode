<?php

namespace Database\Factories;

use App\Models\EnrolledRepository;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<EnrolledRepository>
 */
class EnrolledRepositoryFactory extends Factory
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
            'identity' => (string) Str::uuid(),
            'display_name' => fake()->randomElement(['Junior Mode', 'API service', 'Learning sandbox']),
            'normalized_remote' => null,
            'remote_fingerprint' => null,
            'local_path' => fake()->optional()->filePath(),
            'enrolled_at' => now(),
            'unenrolled_at' => null,
        ];
    }

    public function withRemote(string $remote = 'github.com/example/project'): static
    {
        return $this->state(fn (array $attributes): array => [
            'normalized_remote' => $remote,
            'remote_fingerprint' => hash('sha256', $remote),
        ]);
    }

    public function unenrolled(): static
    {
        return $this->state(fn (array $attributes): array => [
            'unenrolled_at' => now(),
        ]);
    }
}
