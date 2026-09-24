<?php

namespace Database\Factories;

use App\Models\CompetencyTemplate;
use App\Models\CompetencyTemplateNode;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CompetencyTemplateNode> */
class CompetencyTemplateNodeFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'competency_template_id' => CompetencyTemplate::factory(),
            'parent_id' => null,
            'position' => 0,
            'name' => fake()->unique()->words(3, true),
            'definition' => fake()->sentence(),
            'demonstration_criteria' => fake()->sentence(),
            'prerequisites' => null,
            'work_opportunities' => null,
            'technologies' => null,
        ];
    }
}
