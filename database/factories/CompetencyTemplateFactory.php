<?php

namespace Database\Factories;

use App\Models\CompetencyTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CompetencyTemplate> */
class CompetencyTemplateFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(3, true),
            'description' => fake()->sentence(),
        ];
    }
}
