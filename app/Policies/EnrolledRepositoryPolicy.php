<?php

namespace App\Policies;

use App\Models\EnrolledRepository;
use App\Models\User;

class EnrolledRepositoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isMentor() || $user->isLearner();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, EnrolledRepository $enrolledRepository): bool
    {
        return $this->canManageLearner($user, $enrolledRepository->learner);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user, User $learner): bool
    {
        return $this->canManageLearner($user, $learner);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, EnrolledRepository $enrolledRepository): bool
    {
        return $this->canManageLearner($user, $enrolledRepository->learner);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, EnrolledRepository $enrolledRepository): bool
    {
        return $this->canManageLearner($user, $enrolledRepository->learner);
    }

    private function canManageLearner(User $user, User $learner): bool
    {
        return $learner->isLearner()
            && ($user->id === $learner->id
                || ($user->isMentor() && $learner->mentor_id === $user->id));
    }
}
