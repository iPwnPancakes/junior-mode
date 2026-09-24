<?php

namespace App\Actions;

use App\Models\Competency;
use App\Models\User;
use App\Support\CompetencyMetadata;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateCompetency
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(User $learner, array $data): Competency
    {
        return DB::transaction(function () use ($learner, $data): Competency {
            $parentId = Arr::get($data, 'parent_id');
            $this->ensureParentBelongsToLearner($learner, $parentId);

            $siblings = Competency::query()
                ->whereBelongsTo($learner, 'learner')
                ->where('parent_id', $parentId)
                ->lockForUpdate();
            $position = min((int) Arr::get($data, 'position', $siblings->count()), $siblings->count());

            (clone $siblings)->where('position', '>=', $position)->increment('position');

            return $learner->competencies()->create([
                ...Arr::only($data, ['name', 'definition', 'demonstration_criteria']),
                ...CompetencyMetadata::fromForm($data),
                'parent_id' => $parentId,
                'position' => $position,
            ]);
        });
    }

    private function ensureParentBelongsToLearner(User $learner, mixed $parentId): void
    {
        if ($parentId === null) {
            return;
        }

        $parentBelongsToLearner = Competency::query()
            ->whereKey($parentId)
            ->whereBelongsTo($learner, 'learner')
            ->exists();

        if (! $parentBelongsToLearner) {
            throw ValidationException::withMessages([
                'parent_id' => __('The selected parent must belong to this Learner.'),
            ]);
        }
    }
}
