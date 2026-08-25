<?php

namespace App\Http\Controllers;

use App\Actions\CreateCoachingPriority;
use App\CoachingPriorityExpirationMode;
use App\Http\Requests\RenewCoachingPriorityRequest;
use App\Models\CoachingPriority;
use App\Models\User;
use Illuminate\Http\RedirectResponse;

class CoachingPriorityRenewalController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(
        RenewCoachingPriorityRequest $request,
        User $learner,
        CoachingPriority $coachingPriority,
        CreateCoachingPriority $createCoachingPriority,
    ): RedirectResponse {
        $data = $request->validated();
        $expirationMode = CoachingPriorityExpirationMode::from($data['expiration_mode']);

        $coachingPriority->update([
            'expiration_mode' => $expirationMode,
            'expires_at' => $createCoachingPriority->expirationDate(
                $request->user(),
                $expirationMode,
                $data['expires_on'] ?? null,
            ),
        ]);

        return back()->with('success', 'Coaching Priority renewed.');
    }
}
