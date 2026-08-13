<?php

namespace App\Actions;

use App\Models\ClientAuthorization;
use App\Models\ClientConnection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ExchangeClientAuthorization
{
    /**
     * @return array{connection: ClientConnection, accessToken: string}|null
     */
    public function handle(string $deviceCode): ?array
    {
        return DB::transaction(function () use ($deviceCode): ?array {
            $authorization = ClientAuthorization::query()
                ->where('device_code_hash', hash('sha256', $deviceCode))
                ->lockForUpdate()
                ->first();

            abort_if($authorization === null, 404, __('The client authorization code is invalid.'));
            abort_if($authorization->isExpired(), 410, __('The client authorization code has expired.'));
            abort_if(
                $authorization->hasBeenExchanged(),
                410,
                __('The client authorization code has already been used.'),
            );

            if (! $authorization->hasBeenApproved()) {
                return null;
            }

            $clientConnection = $authorization->clientConnection()
                ->lockForUpdate()
                ->first();

            abort_if(
                $clientConnection === null || $clientConnection->isRevoked() || $clientConnection->token_hash !== null,
                410,
                __('The client authorization code can no longer be exchanged.'),
            );

            $accessToken = 'jm_'.Str::random(64);

            $clientConnection->update([
                'token_hash' => hash('sha256', $accessToken),
            ]);
            $authorization->update([
                'exchanged_at' => now(),
            ]);

            return [
                'connection' => $clientConnection,
                'accessToken' => $accessToken,
            ];
        }, attempts: 3);
    }
}
