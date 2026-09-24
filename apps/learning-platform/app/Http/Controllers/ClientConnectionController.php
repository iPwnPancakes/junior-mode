<?php

namespace App\Http\Controllers;

use App\Models\ClientConnection;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ClientConnectionController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ClientConnection::class);

        /** @var User $user */
        $user = $request->user();

        if ($user->isLearner()) {
            return Inertia::render('client-connections/index', [
                'viewerRole' => $user->role->value,
                'connections' => $user->clientConnections()
                    ->get()
                    ->map(fn (ClientConnection $clientConnection): array => $this->serializeConnection($clientConnection)),
                'learners' => [],
            ]);
        }

        return Inertia::render('client-connections/index', [
            'viewerRole' => $user->role->value,
            'connections' => [],
            'learners' => $user->learners()
                ->with('clientConnections')
                ->latest()
                ->get()
                ->map(fn (User $learner): array => [
                    'id' => $learner->id,
                    'name' => $learner->name,
                    'email' => $learner->email,
                    'connections' => $learner->clientConnections
                        ->map(fn (ClientConnection $clientConnection): array => $this->serializeConnection($clientConnection))
                        ->values()
                        ->all(),
                ]),
        ]);
    }

    public function destroy(ClientConnection $clientConnection): RedirectResponse
    {
        Gate::authorize('delete', $clientConnection);

        if (! $clientConnection->isRevoked()) {
            $clientConnection->update(['revoked_at' => now()]);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Codex client revoked.'),
        ]);

        return to_route('client-connections.index');
    }

    /**
     * @return array{id: int, name: string, status: string, authorizedAt: string, lastUsedAt: string|null, revokedAt: string|null}
     */
    private function serializeConnection(ClientConnection $clientConnection): array
    {
        $status = match (true) {
            $clientConnection->isRevoked() => 'revoked',
            $clientConnection->isAwaitingExchange() => 'awaiting_client',
            default => 'active',
        };

        return [
            'id' => $clientConnection->id,
            'name' => $clientConnection->name,
            'status' => $status,
            'authorizedAt' => $clientConnection->authorized_at->toDateString(),
            'lastUsedAt' => $clientConnection->last_used_at?->toDateString(),
            'revokedAt' => $clientConnection->revoked_at?->toDateString(),
        ];
    }
}
