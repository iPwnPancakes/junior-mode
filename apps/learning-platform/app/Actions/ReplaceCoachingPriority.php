<?php

namespace App\Actions;

use App\CoachingPriorityStatus;
use App\Models\CoachingPriority;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReplaceCoachingPriority
{
    public function __construct(private CreateCoachingPriority $createCoachingPriority) {}

    /** @param array{competency_id: int, emphasis: string, expiration_mode: string, expires_on?: string|null, note?: string|null} $data */
    public function handle(CoachingPriority $priority, User $learner, User $mentor, array $data): CoachingPriority
    {
        return DB::transaction(function () use ($priority, $learner, $mentor, $data): CoachingPriority {
            $lockedPriority = CoachingPriority::query()->lockForUpdate()->findOrFail($priority->id);

            abort_unless($lockedPriority->status === CoachingPriorityStatus::Active, 409);

            $replacement = $this->createCoachingPriority->handle($learner, $mentor, $data);

            $lockedPriority->update([
                'status' => CoachingPriorityStatus::Replaced,
                'replaced_by_priority_id' => $replacement->id,
                'resolved_at' => now(),
            ]);

            return $replacement;
        });
    }
}
