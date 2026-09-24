<?php

namespace App\Policies;

use App\Models\HandoffSnapshot;
use App\Models\User;

class HandoffSnapshotPolicy
{
    public function view(User $user, HandoffSnapshot $handoffSnapshot): bool
    {
        return $user->id === $handoffSnapshot->learner_id
            || ($user->isMentor() && $handoffSnapshot->shared_at !== null
                && $handoffSnapshot->mentor_id === $user->id
                && $handoffSnapshot->learner()->where('mentor_id', $user->id)->exists());
    }

    public function share(User $user, HandoffSnapshot $handoffSnapshot): bool
    {
        return $user->isLearner() && $user->id === $handoffSnapshot->learner_id;
    }
}
