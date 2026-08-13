<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewCompetencyCatalog(User $user, User $learner): bool
    {
        return $learner->isLearner()
            && ($user->id === $learner->id
                || ($user->isMentor() && $learner->mentor_id === $user->id));
    }

    public function manageCompetencyCatalog(User $user, User $learner): bool
    {
        return $user->isMentor()
            && $learner->isLearner()
            && $learner->mentor_id === $user->id;
    }
}
