<?php

namespace App\Http\Middleware;

use App\Models\ClientConnection;
use App\Support\CurrentClientConnection;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateClientConnection
{
    public function __construct(private CurrentClientConnection $currentClientConnection) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $accessToken = $request->bearerToken();

        if (! is_string($accessToken) || ! Str::startsWith($accessToken, 'jm_')) {
            return $this->unauthenticated();
        }

        $clientConnection = ClientConnection::query()
            ->with('learner')
            ->where('token_hash', hash('sha256', $accessToken))
            ->whereNull('revoked_at')
            ->first();

        if ($clientConnection === null || ! $clientConnection->learner->isLearner()) {
            return $this->unauthenticated();
        }

        Auth::guard('web')->setUser($clientConnection->learner);
        Auth::shouldUse('web');
        $request->setUserResolver(fn () => $clientConnection->learner);
        $this->currentClientConnection->set($clientConnection);

        $clientConnection->update(['last_used_at' => now()]);

        return $next($request);
    }

    private function unauthenticated(): Response
    {
        return response()
            ->json(['message' => __('Unauthenticated.')], 401)
            ->header('WWW-Authenticate', 'Bearer');
    }
}
