<?php

namespace App\Actions;

use App\Models\LearnerInvitation;
use App\Models\User;
use App\Notifications\LearnerInvited;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class CreateLearnerInvitation
{
    public function handle(User $mentor, string $email): LearnerInvitation
    {
        $plainTextToken = Str::random(64);

        $invitation = $mentor->sentLearnerInvitations()->create([
            'email' => Str::lower($email),
            'token_hash' => hash('sha256', $plainTextToken),
            'expires_at' => now()->addDays(7),
        ]);

        Notification::route('mail', $invitation->email)
            ->notify((new LearnerInvited($invitation, $plainTextToken))->afterCommit());

        return $invitation;
    }
}
