<?php

namespace App\Http\Controllers;

use App\Actions\CreateCoachingPriority;
use App\CoachingPriorityExpirationMode;
use App\Http\Requests\StoreCoachingPriorityRequest;
use App\Http\Requests\UpdateCoachingPriorityRequest;
use App\Models\CoachingPriority;
use App\Models\User;
use Illuminate\Http\RedirectResponse;

class CoachingPriorityController extends Controller
{
    public function store(
        StoreCoachingPriorityRequest $request,
        User $learner,
        CreateCoachingPriority $createCoachingPriority,
    ): RedirectResponse {
        $createCoachingPriority->handle($learner, $request->user(), $request->validatedPriority());

        return back()->with('success', 'Coaching Priority activated.');
    }

    public function update(
        UpdateCoachingPriorityRequest $request,
        User $learner,
        CoachingPriority $coachingPriority,
        CreateCoachingPriority $createCoachingPriority,
    ): RedirectResponse {
        $data = $request->validated();
        $expirationMode = CoachingPriorityExpirationMode::from($data['expiration_mode']);

        $coachingPriority->update([
            'emphasis' => $data['emphasis'],
            'expiration_mode' => $expirationMode,
            'expires_at' => $createCoachingPriority->expirationDate(
                $request->user(),
                $expirationMode,
                $data['expires_on'] ?? null,
            ),
            'note' => $data['note'] ?? null,
        ]);

        return back()->with('success', 'Coaching Priority refined.');
    }
}
