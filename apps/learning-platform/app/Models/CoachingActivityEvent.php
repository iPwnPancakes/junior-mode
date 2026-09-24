<?php

namespace App\Models;

use Database\Factories\CoachingActivityEventFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * @property int $id
 * @property int $learner_id
 * @property int $coaching_session_id
 * @property int|null $client_connection_id
 * @property string $kind
 * @property string $request_hash
 * @property array<string, mixed> $payload
 */
#[Fillable(['learner_id', 'coaching_session_id', 'client_connection_id', 'kind', 'idempotency_key', 'request_hash', 'payload'])]
class CoachingActivityEvent extends Model
{
    /** @use HasFactory<CoachingActivityEventFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Coaching activity is append-only.'));
        static::deleting(fn () => throw new LogicException('Coaching activity is append-only. Account deletion uses the privacy boundary.'));
    }

    /** @return BelongsTo<CoachingSession, $this> */
    public function coachingSession(): BelongsTo
    {
        return $this->belongsTo(CoachingSession::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['payload' => 'array'];
    }
}
