<?php

namespace App\Policies;

use App\Models\HelpRequest;
use App\Models\User;

class HelpRequestPolicy
{
    public function view(User $user, HelpRequest $helpRequest): bool
    {
        return $user->id === $helpRequest->learner_id
            || ($user->isMentor() && $helpRequest->shared_at !== null
                && $helpRequest->mentor_id === $user->id
                && $helpRequest->learner()->where('mentor_id', $user->id)->exists());
    }

    public function share(User $user, HelpRequest $helpRequest): bool
    {
        return $user->isLearner() && $user->id === $helpRequest->learner_id;
    }
}
