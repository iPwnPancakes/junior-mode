<?php

namespace App\Actions;

use App\Models\Competency;
use App\Models\CompetencyMerge;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MergeCompetencies
{
    public function handle(Competency $source, Competency $target, User $mentor): CompetencyMerge
    {
        return DB::transaction(function () use ($source, $target, $mentor): CompetencyMerge {
            $competencies = Competency::query()
                ->whereKey([$source->id, $target->id])
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
            $source = $competencies->get($source->id);
            $target = $competencies->get($target->id);

            if (! $source instanceof Competency || ! $target instanceof Competency) {
                throw ValidationException::withMessages([
                    'target_competency_id' => __('Both Competencies must still exist.'),
                ]);
            }

            $this->ensureMergeIsValid($source, $target);

            $nextPosition = Competency::query()
                ->where('learner_id', $source->learner_id)
                ->where('parent_id', $target->id)
                ->max('position');
            $nextPosition = $nextPosition === null ? 0 : $nextPosition + 1;

            $source->children()->get()->each(function (Competency $child) use ($target, &$nextPosition): void {
                $child->update([
                    'parent_id' => $target->id,
                    'position' => $nextPosition++,
                ]);
            });

            $source->update([
                'archived_at' => now(),
                'merged_into_id' => $target->id,
            ]);

            return CompetencyMerge::query()->create([
                'source_competency_id' => $source->id,
                'target_competency_id' => $target->id,
                'merged_by_id' => $mentor->id,
            ]);
        });
    }

    private function ensureMergeIsValid(Competency $source, Competency $target): void
    {
        if ($source->id === $target->id || $source->learner_id !== $target->learner_id) {
            throw ValidationException::withMessages([
                'target_competency_id' => __('Choose a different Competency from the same Learner catalog.'),
            ]);
        }

        if ($source->isMerged()) {
            throw ValidationException::withMessages([
                'target_competency_id' => __('This Competency has already been merged.'),
            ]);
        }

        if ($target->isArchived() || $target->isMerged()) {
            throw ValidationException::withMessages([
                'target_competency_id' => __('The merge target must be an active Competency.'),
            ]);
        }

        $ancestor = $target;

        while ($ancestor->parent_id !== null) {
            if ($ancestor->parent_id === $source->id) {
                throw ValidationException::withMessages([
                    'target_competency_id' => __('A Competency cannot be merged into one of its descendants.'),
                ]);
            }

            $ancestor = Competency::query()->findOrFail($ancestor->parent_id);
        }
    }
}
