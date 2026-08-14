<?php

namespace App\Http\Controllers;

use App\CatalogProposalStatus;
use App\Models\CatalogProposal;
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
            'learners' => $mentor->learners()
                ->latest()
                ->get(['id', 'name', 'email', 'created_at'])
                ->map(fn (User $learner): array => [
                    'id' => $learner->id,
                    'name' => $learner->name,
                    'email' => $learner->email,
                    'joinedAt' => $learner->created_at?->toDateString(),
                ]),
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
            'catalogProposals' => CatalogProposal::query()
                ->select(['id', 'learner_id', 'status', 'submitted_at'])
                ->with('learner:id,name')
                ->whereHas('learner', fn ($query) => $query->where('mentor_id', $mentor->id))
                ->where('status', CatalogProposalStatus::AwaitingReview)
                ->latest('submitted_at')
                ->limit(20)
                ->get()
                ->map(fn (CatalogProposal $proposal): array => [
                    'id' => $proposal->id,
                    'learnerId' => $proposal->learner_id,
                    'learnerName' => $proposal->learner->name,
                    'submittedAt' => $proposal->submitted_at?->toDateString(),
                ]),
        ]);
    }

    private function learnerDashboard(User $learner): Response
    {
        $mentor = $learner->mentor()->firstOrFail(['id', 'name', 'email']);

        return Inertia::render('learner/dashboard', [
            'mentor' => [
                'id' => $mentor->id,
                'name' => $mentor->name,
                'email' => $mentor->email,
            ],
        ]);
    }
}
