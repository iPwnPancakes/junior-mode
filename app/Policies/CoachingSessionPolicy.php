<?php

namespace App\Policies;

use App\Models\CoachingSession;
use App\Models\User;

class CoachingSessionPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->isMentor() || $user->isLearner();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, CoachingSession $coachingSession): bool
    {
        return $user->id === $coachingSession->learner_id
            || ($user->isMentor() && $coachingSession->learner()->where('mentor_id', $user->id)->exists());
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, CoachingSession $coachingSession): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, CoachingSession $coachingSession): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, CoachingSession $coachingSession): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, CoachingSession $coachingSession): bool
    {
        return false;
    }
}
