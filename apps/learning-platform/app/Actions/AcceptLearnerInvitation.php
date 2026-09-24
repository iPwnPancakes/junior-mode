<?php

namespace App\Actions;

use App\Models\LearnerInvitation;
use App\Models\User;
use App\UserRole;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AcceptLearnerInvitation
{
    public function handle(string $plainTextToken, string $name, string $password): User
    {
        return DB::transaction(function () use ($plainTextToken, $name, $password): User {
            $invitation = LearnerInvitation::query()
                ->where('token_hash', hash('sha256', $plainTextToken))
                ->lockForUpdate()
                ->firstOrFail();

            abort_if($invitation->isExpired() || $invitation->hasBeenAccepted(), 410);

            Validator::make(['email' => $invitation->email], [
                'email' => ['required', 'email', Rule::unique(User::class)],
            ])->validate();

            $learner = User::create([
                'name' => $name,
                'email' => $invitation->email,
                'password' => $password,
                'role' => UserRole::Learner,
                'mentor_id' => $invitation->mentor_id,
            ]);

            $invitation->update([
                'accepted_at' => now(),
                'accepted_by_user_id' => $learner->id,
            ]);

            return $learner;
        });
    }
}
