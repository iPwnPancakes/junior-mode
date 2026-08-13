<?php

namespace Database\Factories;

use App\Models\Competency;
use App\Models\CompetencyMerge;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CompetencyMerge> */
class CompetencyMergeFactory extends Factory
{
    public function configure(): static
    {
        return $this->afterCreating(function (CompetencyMerge $merge): void {
            $merge->source()->update([
                'archived_at' => now(),
                'merged_into_id' => $merge->target_competency_id,
            ]);
        });
    }

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'source_competency_id' => Competency::factory(),
            'target_competency_id' => function (array $attributes): int {
                $source = Competency::query()->whereKey($attributes['source_competency_id'])->firstOrFail();
                $learner = $source->learner()->firstOrFail();

                return Competency::factory()->forLearner($learner)->create()->id;
            },
            'merged_by_id' => function (array $attributes): int {
                $source = Competency::query()->whereKey($attributes['source_competency_id'])->firstOrFail();
                $mentorId = $source->learner()->firstOrFail()->mentor_id;

                if ($mentorId === null) {
                    throw new \LogicException('A CompetencyMerge factory requires a Learner with a Mentor.');
                }

                return $mentorId;
            },
        ];
    }
}
