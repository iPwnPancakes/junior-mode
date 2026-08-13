<?php

namespace App\Http\Controllers;

use App\Actions\CreateLearnerInvitation;
use App\Http\Requests\StoreLearnerInvitationRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class LearnerInvitationController extends Controller
{
    public function store(
        StoreLearnerInvitationRequest $request,
        CreateLearnerInvitation $createLearnerInvitation,
    ): RedirectResponse {
        /** @var User $mentor */
        $mentor = $request->user();

        $createLearnerInvitation->handle($mentor, $request->string('email')->toString());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Learner invitation sent.'),
        ]);

        return to_route('dashboard');
    }
}
