<?php

namespace App\Http\Controllers\Mcp;

use App\Actions\ApproveClientAuthorization;
use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveClientAuthorizationRequest;
use App\Models\ClientAuthorization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ClientAuthorizationApprovalController extends Controller
{
    public function show(Request $request, string $userCode): Response
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->isLearner(), 403);

        $authorization = $this->pendingAuthorization($userCode);

        return Inertia::render('client-authorizations/show', [
            'clientName' => $authorization->name,
            'userCode' => Str::upper($userCode),
            'expiresAt' => $authorization->expires_at->toIso8601String(),
        ]);
    }

    public function store(
        ApproveClientAuthorizationRequest $request,
        string $userCode,
        ApproveClientAuthorization $approveClientAuthorization,
    ): RedirectResponse {
        /** @var User $learner */
        $learner = $request->user();

        $approveClientAuthorization->handle($learner, $userCode);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Codex client approved.'),
        ]);

        return to_route('client-connections.index');
    }

    private function pendingAuthorization(string $userCode): ClientAuthorization
    {
        $authorization = ClientAuthorization::query()
            ->where('user_code_hash', hash('sha256', Str::upper($userCode)))
            ->first();

        abort_if($authorization === null, 404, __('The client authorization code is invalid.'));
        abort_if($authorization->isExpired(), 410, __('The client authorization code has expired.'));
        abort_if(
            $authorization->hasBeenApproved() || $authorization->hasBeenExchanged(),
            410,
            __('The client authorization code has already been used.'),
        );

        return $authorization;
    }
}
