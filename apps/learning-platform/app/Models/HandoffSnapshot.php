<?php

namespace App\Models;

use Database\Factories\HandoffSnapshotFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use LogicException;

/**
 * @property int $id
 * @property int $learner_id
 * @property int $coaching_session_id
 * @property int|null $mentor_id
 * @property array<string, mixed> $payload
 * @property string $idempotency_key
 * @property string $request_hash
 * @property string $fingerprint
 * @property Carbon|null $shared_at
 * @property Carbon $created_at
 */
#[Fillable(['learner_id', 'coaching_session_id', 'mentor_id', 'payload', 'fingerprint', 'idempotency_key', 'request_hash', 'shared_at'])]
class HandoffSnapshot extends Model
{
    /** @use HasFactory<HandoffSnapshotFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::updating(function (self $snapshot): void {
            if ($snapshot->isDirty(['payload', 'fingerprint', 'learner_id', 'coaching_session_id', 'idempotency_key', 'request_hash']) || $snapshot->getOriginal('shared_at') !== null) {
                throw new LogicException('Handoff snapshots are immutable. Create a new preview for changes.');
            }
        });
    }

    /** @return BelongsTo<User, $this> */
    public function learner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'learner_id');
    }

    /** @return BelongsTo<CoachingSession, $this> */
    public function coachingSession(): BelongsTo
    {
        return $this->belongsTo(CoachingSession::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['payload' => 'array', 'shared_at' => 'datetime'];
    }
}
