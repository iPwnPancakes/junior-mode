<?php

namespace App\Http\Controllers;

use App\Actions\ReplaceCoachingPriority;
use App\Http\Requests\ReplaceCoachingPriorityRequest;
use App\Models\CoachingPriority;
use App\Models\User;
use Illuminate\Http\RedirectResponse;

class CoachingPriorityReplacementController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(
        ReplaceCoachingPriorityRequest $request,
        User $learner,
        CoachingPriority $coachingPriority,
        ReplaceCoachingPriority $replaceCoachingPriority,
    ): RedirectResponse {
        $replaceCoachingPriority->handle(
            $coachingPriority,
            $learner,
            $request->user(),
            $request->validatedPriority(),
        );

        return back()->with('success', 'Coaching Priority replaced.');
    }
}
