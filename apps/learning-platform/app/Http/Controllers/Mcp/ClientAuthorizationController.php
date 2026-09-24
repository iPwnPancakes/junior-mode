<?php

namespace App\Http\Controllers\Mcp;

use App\Actions\CreateClientAuthorization;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientAuthorizationRequest;
use Illuminate\Http\JsonResponse;

class ClientAuthorizationController extends Controller
{
    public function store(
        StoreClientAuthorizationRequest $request,
        CreateClientAuthorization $createClientAuthorization,
    ): JsonResponse {
        $issuedAuthorization = $createClientAuthorization->handle(
            $request->string('name')->squish()->toString(),
        );

        return response()->json([
            'device_code' => $issuedAuthorization['deviceCode'],
            'user_code' => $issuedAuthorization['userCode'],
            'authorization_url' => route(
                'client-authorizations.approval.show',
                $issuedAuthorization['userCode'],
            ),
            'token_url' => route('client-authorizations.token'),
            'expires_in' => CreateClientAuthorization::EXPIRES_IN_SECONDS,
            'interval' => 2,
        ], 201);
    }
}
