<?php

namespace App\Actions;

use App\Models\Competency;
use Illuminate\Support\Facades\DB;

class MoveCompetency
{
    /**
     * Swap a Competency with its previous or next sibling. Moving past either
     * end leaves the order unchanged.
     */
    public function handle(Competency $competency, string $direction): void
    {
        DB::transaction(function () use ($competency, $direction): void {
            $competency = Competency::query()->lockForUpdate()->findOrFail($competency->id);
            $movingUp = $direction === 'up';

            $neighbor = Competency::query()
                ->where('learner_id', $competency->learner_id)
                ->where('parent_id', $competency->parent_id)
                ->whereKeyNot($competency->id)
                ->where('position', $movingUp ? '<' : '>', $competency->position)
                ->orderBy('position', $movingUp ? 'desc' : 'asc')
                ->lockForUpdate()
                ->first();

            if ($neighbor === null) {
                return;
            }

            [$competency->position, $neighbor->position] = [$neighbor->position, $competency->position];

            $competency->save();
            $neighbor->save();
        });
    }
}
