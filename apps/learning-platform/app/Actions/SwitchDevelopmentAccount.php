<?php

namespace App\Actions;

use App\Models\User;
use App\UserRole;
use Illuminate\Support\Str;

/**
 * Lets a developer act as both a Mentor and that Mentor's Learner in a local
 * installation by switching between the Mentor and a paired Learner account.
 */
class SwitchDevelopmentAccount
{
    public function canSwitch(User $user): bool
    {
        return $user->isMentor() || $this->isPairedLearner($user);
    }

    public function handle(User $user): User
    {
        if ($user->isLearner()) {
            abort_unless($this->isPairedLearner($user), 403);

            return $user->mentor;
        }

        abort_unless($user->isMentor(), 403);

        $learner = User::query()->firstOrCreate(
            ['email' => $this->pairedLearnerEmail($user)],
            [
                'name' => $user->name.' (Learner)',
                'password' => Str::password(),
                'role' => UserRole::Learner,
                'mentor_id' => $user->id,
            ],
        );

        abort_unless($learner->isLearner() && $learner->mentor_id === $user->id, 409);

        return $learner;
    }

    private function isPairedLearner(User $user): bool
    {
        return $user->isLearner()
            && $user->mentor?->isMentor() === true
            && $user->email === $this->pairedLearnerEmail($user->mentor);
    }

    private function pairedLearnerEmail(User $mentor): string
    {
        [$localPart, $domain] = explode('@', $mentor->email, 2);

        return "{$localPart}+learner@{$domain}";
    }
}
