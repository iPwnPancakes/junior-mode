<?php

namespace App\Http\Controllers;

use App\CoachingPriorityStatus;
use App\Http\Requests\ResolveCoachingPriorityRequest;
use App\Models\CoachingPriority;
use App\Models\User;
use Illuminate\Http\RedirectResponse;

class CoachingPriorityResolutionController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(
        ResolveCoachingPriorityRequest $request,
        User $learner,
        CoachingPriority $coachingPriority,
    ): RedirectResponse {
        $coachingPriority->update([
            'status' => CoachingPriorityStatus::from($request->validated('status')),
            'resolved_at' => now(),
        ]);

        return back()->with('success', 'Coaching Priority status updated.');
    }
}
