<?php

namespace App\Actions;

use App\CoachingPriorityEmphasis;
use App\CoachingPriorityExpirationMode;
use App\Models\CoachingPriority;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

class CreateCoachingPriority
{
    /** @param array{competency_id: int, emphasis: string, expiration_mode: string, expires_on?: string|null, note?: string|null} $data */
    public function handle(User $learner, User $mentor, array $data): CoachingPriority
    {
        $expirationMode = CoachingPriorityExpirationMode::from($data['expiration_mode']);

        return CoachingPriority::create([
            'learner_id' => $learner->id,
            'competency_id' => $data['competency_id'],
            'created_by_id' => $mentor->id,
            'emphasis' => CoachingPriorityEmphasis::from($data['emphasis']),
            'expiration_mode' => $expirationMode,
            'expires_at' => $this->expirationDate($mentor, $expirationMode, $data['expires_on'] ?? null),
            'note' => $data['note'] ?? null,
        ]);
    }

    public function expirationDate(
        User $mentor,
        CoachingPriorityExpirationMode $expirationMode,
        ?string $expiresOn,
    ): ?CarbonInterface {
        return match ($expirationMode) {
            CoachingPriorityExpirationMode::DefaultDuration => now()->addDays($mentor->default_priority_duration_days),
            CoachingPriorityExpirationMode::CustomDate => Carbon::parse($expiresOn)->endOfDay(),
            CoachingPriorityExpirationMode::UntilRemoved => null,
        };
    }
}
