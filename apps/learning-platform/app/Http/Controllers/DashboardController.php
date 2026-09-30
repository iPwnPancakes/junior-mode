<?php

namespace App\Http\Controllers;

use App\Actions\BuildMentorLearnerOverview;
use App\CoachingPriorityStatus;
use App\CoachingSessionStatus;
use App\Models\CoachingPriority;
use App\Models\CoachingSession;
use App\Models\HelpRequest;
use App\Models\LearnerInvitation;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        return $user->isMentor()
            ? $this->mentorDashboard($user)
            : $this->learnerDashboard($user);
    }

    private function mentorDashboard(User $mentor): Response
    {
        return Inertia::render('mentor/dashboard', [
            'learners' => app(BuildMentorLearnerOverview::class)->handle($mentor),
            'pendingInvitations' => $mentor->sentLearnerInvitations()
                ->whereNull('accepted_at')
                ->where('expires_at', '>', now())
                ->latest()
                ->get(['id', 'email', 'expires_at'])
                ->map(fn (LearnerInvitation $invitation): array => [
                    'id' => $invitation->id,
                    'email' => $invitation->email,
                    'expiresAt' => $invitation->expires_at->toFormattedDateString(),
                ]),
        ]);
    }

    private function learnerDashboard(User $learner): Response
    {
        $mentor = $learner->mentor()->firstOrFail(['id', 'name', 'email']);

        return Inertia::render('learner/dashboard', [
            'learner' => [
                'id' => $learner->id,
                'name' => $learner->name,
            ],
            'mentor' => [
                'id' => $mentor->id,
                'name' => $mentor->name,
                'email' => $mentor->email,
            ],
            'setup' => [
                'hasPlan' => $learner->competencies()
                    ->whereNull('archived_at')
                    ->whereNull('merged_into_id')
                    ->exists(),
                'hasClient' => $learner->clientConnections()
                    ->whereNull('revoked_at')
                    ->whereNotNull('token_hash')
                    ->exists(),
                'hasRepository' => $learner->enrolledRepositories()
                    ->whereNull('unenrolled_at')
                    ->exists(),
            ],
            'focus' => $learner->coachingPriorities()
                ->where('status', CoachingPriorityStatus::Active)
                ->with('competency:id,name')
                ->orderBy('expires_at')
                ->get()
                ->reject(fn (CoachingPriority $priority): bool => $priority->isExpired())
                ->map(fn (CoachingPriority $priority): array => [
                    'id' => $priority->id,
                    'competencyName' => $priority->competency->name,
                    'emphasis' => $priority->emphasis->value,
                    'expiresOn' => $priority->expires_at?->toFormattedDateString(),
                    'note' => $priority->note,
                ])
                ->values(),
            'activeSessions' => $learner->coachingSessions()
                ->where('status', CoachingSessionStatus::Active)
                ->with(['workItem:id,title', 'primaryLearningObjective:id,name'])
                ->latest('last_active_at')
                ->limit(3)
                ->get()
                ->map(fn (CoachingSession $session): array => [
                    'id' => $session->id,
                    'title' => $session->workItem->title,
                    'objective' => $session->primaryLearningObjective->name,
                    'lastActive' => $session->last_active_at->diffForHumans(),
                ]),
            'helpRequestsAwaitingReview' => HelpRequest::query()
                ->where('learner_id', $learner->id)
                ->whereNull('shared_at')
                ->count(),
        ]);
    }
}
