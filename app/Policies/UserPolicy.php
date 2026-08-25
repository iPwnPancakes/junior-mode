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

    public function viewCoachingRecord(User $user, User $learner): bool
    {
        return $this->viewCompetencyCatalog($user, $learner);
    }

    public function manageCoachingRecord(User $user, User $learner): bool
    {
        return $this->manageCompetencyCatalog($user, $learner);
    }
}
