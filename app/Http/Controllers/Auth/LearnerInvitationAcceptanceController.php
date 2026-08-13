<?php

namespace App\Http\Controllers\Auth;

use App\Actions\AcceptLearnerInvitation;
use App\Http\Controllers\Controller;
use App\Http\Requests\AcceptLearnerInvitationRequest;
use App\Models\LearnerInvitation;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class LearnerInvitationAcceptanceController extends Controller
{
    public function show(string $token): Response
    {
        $invitation = $this->findInvitation($token);

        return Inertia::render('auth/accept-learner-invitation', [
            'email' => $invitation->email,
            'mentorName' => $invitation->mentor->name,
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
            'token' => $token,
        ]);
    }

    public function store(
        AcceptLearnerInvitationRequest $request,
        string $token,
        AcceptLearnerInvitation $acceptLearnerInvitation,
    ): RedirectResponse {
        $learner = $acceptLearnerInvitation->handle(
            $token,
            $request->string('name')->toString(),
            $request->string('password')->toString(),
        );

        event(new Registered($learner));
        Auth::login($learner);
        $request->session()->regenerate();

        return to_route('dashboard');
    }

    private function findInvitation(string $token): LearnerInvitation
    {
        $invitation = LearnerInvitation::query()
            ->with('mentor')
            ->where('token_hash', hash('sha256', $token))
            ->firstOrFail();

        abort_if($invitation->isExpired() || $invitation->hasBeenAccepted(), 410);

        return $invitation;
    }
}
