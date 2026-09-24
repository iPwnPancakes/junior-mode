<?php

namespace App\Actions;

use App\CoachingSessionStatus;
use App\Models\ClientConnection;
use App\Models\CoachingActivityEvent;
use App\Models\CoachingSession;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class GetSolutionEscapeEligibility
{
    /** @return array{required_hints: int, requested_hints: int, accepted_attempts: int, eligible: bool, escape_used: bool, can_provide_solution: bool, activities: array<int, array<string, mixed>>} */
    public function handle(User $learner, ClientConnection $client, CoachingSession $session): array
    {
        $this->authorize($learner, $client, $session);
        $events = CoachingActivityEvent::query()->where('coaching_session_id', $session->id)->orderBy('id')->get();
        $requiredHints = max(1, config('coaching.solution_escape_required_hints', 4));
        $hints = $events->where('kind', 'hint')->count();
        $attempts = $events->where('kind', 'accepted_attempt')->count();
        $escaped = $events->contains('kind', 'solution_escape');
        $active = $session->status === CoachingSessionStatus::Active && $session->workItem->enrolledRepository->unenrolled_at === null;

        return [
            'required_hints' => $requiredHints,
            'requested_hints' => $hints,
            'accepted_attempts' => $attempts,
            'eligible' => $active && ! $escaped && $hints >= $requiredHints && $attempts > 0,
            'escape_used' => $escaped,
            'can_provide_solution' => $active && $escaped,
            'activities' => $events->map(fn (CoachingActivityEvent $event): array => ['id' => $event->id, 'kind' => $event->kind, 'payload' => $event->payload, 'recorded_at' => $event->created_at->toIso8601String()])->all(),
        ];
    }

    public function authorize(User $learner, ClientConnection $client, CoachingSession $session): void
    {
        abort_unless($learner->isLearner() && $learner->id === $session->learner_id && $client->learner_id === $learner->id && $client->revoked_at === null, 403);
    }

    public function requireActive(CoachingSession $session): void
    {
        if ($session->status !== CoachingSessionStatus::Active || $session->workItem->enrolledRepository->unenrolled_at !== null) {
            throw ValidationException::withMessages(['session_id' => 'Coaching activity requires an active Session in an Enrolled Repository.']);
        }
    }
}
