<?php

namespace App\Policies;

use App\Models\ClientConnection;
use App\Models\User;

class ClientConnectionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isMentor() || $user->isLearner();
    }

    public function view(User $user, ClientConnection $clientConnection): bool
    {
        return $clientConnection->learner_id === $user->id
            || ($user->isMentor() && $clientConnection->learner->mentor_id === $user->id);
    }

    public function delete(User $user, ClientConnection $clientConnection): bool
    {
        return $user->isLearner() && $clientConnection->learner_id === $user->id;
    }
}
