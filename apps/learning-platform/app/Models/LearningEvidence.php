<?php

namespace App\Models;

use Database\Factories\LearningEvidenceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * @property int $id
 * @property int $learner_id
 * @property int $coaching_session_id
 * @property int $competency_id
 * @property int|null $supersedes_id
 * @property string $request_hash
 * @property array<string, mixed> $evidence
 */
#[Fillable(['learner_id', 'coaching_session_id', 'competency_id', 'recorded_by_id', 'client_connection_id', 'supersedes_id', 'idempotency_key', 'request_hash', 'schema_version', 'evidence'])]
class LearningEvidence extends Model
{
    /** @use HasFactory<LearningEvidenceFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Learning evidence is append-only. Append a correction instead.'));
        static::deleting(fn () => throw new LogicException('Learning evidence is append-only. Account deletion uses the privacy boundary.'));
    }

    /** @return BelongsTo<CoachingSession, $this> */
    public function coachingSession(): BelongsTo
    {
        return $this->belongsTo(CoachingSession::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['evidence' => 'array'];
    }
}
