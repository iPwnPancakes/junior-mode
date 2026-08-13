<?php

namespace App\Http\Controllers\Mcp;

use App\Actions\ExchangeClientAuthorization;
use App\Http\Controllers\Controller;
use App\Http\Requests\ExchangeClientAuthorizationRequest;
use Illuminate\Http\JsonResponse;

class ClientAuthorizationTokenController extends Controller
{
    public function __invoke(
        ExchangeClientAuthorizationRequest $request,
        ExchangeClientAuthorization $exchangeClientAuthorization,
    ): JsonResponse {
        $exchange = $exchangeClientAuthorization->handle(
            $request->string('device_code')->toString(),
        );

        if ($exchange === null) {
            return response()->json([
                'status' => 'authorization_pending',
                'retry_after' => 2,
            ], 202);
        }

        return response()->json([
            'access_token' => $exchange['accessToken'],
            'token_type' => 'Bearer',
            'connection' => [
                'id' => $exchange['connection']->id,
                'name' => $exchange['connection']->name,
            ],
        ]);
    }
}
