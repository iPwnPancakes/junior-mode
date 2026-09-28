<?php

namespace App\Http\Controllers;

use App\Actions\BuildMentorLearnerOverview;
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
                    'expiresAt' => $invitation->expires_at->toDateString(),
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
        ]);
    }
}
