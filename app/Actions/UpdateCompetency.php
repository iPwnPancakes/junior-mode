<?php

namespace App\Actions;

use App\Models\Competency;
use App\Support\CompetencyMetadata;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateCompetency
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Competency $competency, array $data): Competency
    {
        return DB::transaction(function () use ($competency, $data): Competency {
            $competency = Competency::query()->lockForUpdate()->findOrFail($competency->id);
            $parentId = isset($data['parent_id']) ? (int) $data['parent_id'] : null;
            $this->ensureValidParent($competency, $parentId);

            $oldParentId = $competency->parent_id;
            $oldPosition = $competency->position;

            Competency::query()
                ->where('learner_id', $competency->learner_id)
                ->where('parent_id', $oldParentId)
                ->whereKeyNot($competency->id)
                ->where('position', '>', $oldPosition)
                ->decrement('position');

            $targetSiblings = Competency::query()
                ->where('learner_id', $competency->learner_id)
                ->where('parent_id', $parentId)
                ->whereKeyNot($competency->id)
                ->lockForUpdate();
            $position = min((int) Arr::get($data, 'position', $targetSiblings->count()), $targetSiblings->count());

            (clone $targetSiblings)->where('position', '>=', $position)->increment('position');

            $competency->update([
                ...Arr::only($data, ['name', 'definition', 'demonstration_criteria']),
                ...CompetencyMetadata::fromForm($data),
                'parent_id' => $parentId,
                'position' => $position,
            ]);

            return $competency->refresh();
        });
    }

    private function ensureValidParent(Competency $competency, ?int $parentId): void
    {
        if ($parentId === null) {
            return;
        }

        $parent = Competency::query()->find($parentId);

        if ($parent === null || $parent->learner_id !== $competency->learner_id) {
            throw ValidationException::withMessages([
                'parent_id' => __('The selected parent must belong to this Learner.'),
            ]);
        }

        while ($parent !== null) {
            if ($parent->id === $competency->id) {
                throw ValidationException::withMessages([
                    'parent_id' => __('A Competency cannot be moved beneath itself or one of its descendants.'),
                ]);
            }

            $parent = $parent->parent_id === null
                ? null
                : Competency::query()->find($parent->parent_id);
        }
    }
}
