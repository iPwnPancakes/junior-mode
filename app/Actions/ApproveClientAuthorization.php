<?php

namespace App\Actions;

use App\Models\ClientAuthorization;
use App\Models\ClientConnection;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ApproveClientAuthorization
{
    public function handle(User $learner, string $userCode): ClientConnection
    {
        abort_unless($learner->isLearner(), 403);

        return DB::transaction(function () use ($learner, $userCode): ClientConnection {
            $authorization = ClientAuthorization::query()
                ->where('user_code_hash', hash('sha256', Str::upper($userCode)))
                ->lockForUpdate()
                ->first();

            abort_if($authorization === null, 404, __('The client authorization code is invalid.'));
            abort_if($authorization->isExpired(), 410, __('The client authorization code has expired.'));
            abort_if(
                $authorization->hasBeenApproved() || $authorization->hasBeenExchanged(),
                410,
                __('The client authorization code has already been used.'),
            );

            $clientConnection = $learner->clientConnections()->create([
                'name' => $authorization->name,
                'authorized_at' => now(),
            ]);

            $authorization->update([
                'approved_at' => now(),
                'client_connection_id' => $clientConnection->id,
            ]);

            return $clientConnection;
        }, attempts: 3);
    }
}
