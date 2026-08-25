<?php

namespace App\Http\Controllers;

use App\Models\CoachingSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CoachingSessionController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', CoachingSession::class);

        /** @var User $user */
        $user = $request->user();
        $sessions = CoachingSession::query()
            ->with([
                'learner:id,name',
                'workItem.enrolledRepository:id,display_name,identity',
                'primaryLearningObjective:id,name',
                'clientConnection:id,name',
            ])
            ->when(
                $user->isLearner(),
                fn ($query) => $query->whereBelongsTo($user, 'learner'),
                fn ($query) => $query->whereHas('learner', fn ($learnerQuery) => $learnerQuery->where('mentor_id', $user->id)),
            )
            ->latest('last_active_at')
            ->limit(50)
            ->get()
            ->map(fn (CoachingSession $session): array => [
                'id' => $session->id,
                'learnerName' => $session->learner->name,
                'workItem' => [
                    'title' => $session->workItem->title,
                    'description' => $session->workItem->description,
                    'externalUrl' => $session->workItem->external_url,
                ],
                'repository' => [
                    'name' => $session->workItem->enrolledRepository->display_name,
                    'identity' => $session->workItem->enrolledRepository->identity,
                ],
                'objective' => $session->primaryLearningObjective->name,
                'clientSource' => $session->clientConnection->name,
                'status' => $session->status->value,
                'lastActiveAt' => $session->last_active_at->toDateTimeString(),
            ]);

        return Inertia::render('coaching-sessions/index', [
            'viewerRole' => $user->role->value,
            'sessions' => $sessions,
        ]);
    }
}
