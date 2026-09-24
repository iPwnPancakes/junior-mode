<?php

namespace App\Actions;

use App\Models\CoachingSession;
use App\Models\HandoffSnapshot;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PrepareHandoff
{
    /** @param array<string, mixed> $payload */
    public function handle(CoachingSession $session, array $payload, string $requestHash, string $idempotencyKey): HandoffSnapshot
    {
        return DB::transaction(function () use ($session, $payload, $requestHash, $idempotencyKey): HandoffSnapshot {
            User::query()->whereKey($session->learner_id)->lockForUpdate()->firstOrFail();
            $snapshot = HandoffSnapshot::query()->where('learner_id', $session->learner_id)
                ->where('idempotency_key', $idempotencyKey)->first();
            if ($snapshot !== null) {
                if (! hash_equals($snapshot->request_hash, $requestHash)) {
                    throw ValidationException::withMessages(['idempotency_key' => 'This key already identifies a different handoff request.']);
                }

                return $snapshot;
            }

            return HandoffSnapshot::query()->create([
                'learner_id' => $session->learner_id,
                'coaching_session_id' => $session->id,
                'idempotency_key' => $idempotencyKey,
                'request_hash' => $requestHash,
                'fingerprint' => hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR)),
                'payload' => $payload,
            ]);
        });

    }
}
