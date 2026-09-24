<?php

namespace App\Actions;

use App\CoachingSessionStatus;
use App\Models\CoachingSession;
use App\Models\User;
use App\Support\LearningContract;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class CompleteCoachingSession
{
    /** @param array<string, mixed> $input */
    public function handle(User $learner, CoachingSession $session, array $input): CoachingSession
    {
        abort_unless($learner->id === $session->learner_id, 403);
        $data = Validator::make($input, [
            'idempotency_key' => ['required', 'string', 'max:100'],
            'outcome' => ['required', 'string', 'max:1000'],
            'reflection' => ['required', 'string', 'max:1000'],
            'unresolved_questions' => ['present', 'array', 'max:10'],
            'unresolved_questions.*' => ['required', 'string', 'max:500'],
            'next_challenge' => ['required', 'string', 'max:1000'],
            'stage' => ['prohibited'], 'score' => ['prohibited'], 'learner_id' => ['prohibited'],
        ])->validate();
        LearningContract::validateSummaries($data);
        $key = $data['idempotency_key'];
        unset($data['idempotency_key']);

        return DB::transaction(function () use ($session, $data, $key): CoachingSession {
            User::query()->whereKey($session->learner_id)->lockForUpdate()->firstOrFail();
            $session->refresh();
            if ($session->status !== CoachingSessionStatus::Active) {
                if ($session->completion_key === $key && LearningContract::hash($session->completion) === LearningContract::hash($data)) {
                    return $session;
                }
                throw ValidationException::withMessages(['session_id' => 'This Session is already settled.']);
            }
            $session->update(['status' => CoachingSessionStatus::Concluded, 'completion' => $data, 'completion_key' => $key, 'completed_at' => now(), 'last_active_at' => now()]);

            return $session;
        });
    }
}
