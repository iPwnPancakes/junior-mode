<?php

namespace App\Models;

use App\CoachingSessionStatus;
use Database\Factories\CoachingSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $learner_id
 * @property int $work_item_id
 * @property int $primary_learning_objective_id
 * @property int $client_connection_id
 * @property CoachingSessionStatus $status
 * @property array<string, mixed>|null $completion
 * @property array<int, string>|null $acceptance_criteria
 * @property array{agent: string, learner: string}|null $responsibility_split
 * @property string|null $completion_key
 * @property string|null $idempotency_key
 * @property string|null $desired_outcome
 * @property string|null $request_hash
 * @property Carbon|null $completed_at
 * @property Carbon $last_active_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['learner_id', 'work_item_id', 'primary_learning_objective_id', 'client_connection_id', 'status', 'last_active_at', 'idempotency_key', 'request_hash', 'desired_outcome', 'acceptance_criteria', 'responsibility_split', 'completion', 'completion_key', 'completed_at'])]
class CoachingSession extends Model
{
    /** @use HasFactory<CoachingSessionFactory> */
    use HasFactory;

    protected $attributes = ['status' => 'active'];

    /** @return BelongsTo<User, $this> */
    public function learner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'learner_id');
    }

    /** @return BelongsTo<WorkItem, $this> */
    public function workItem(): BelongsTo
    {
        return $this->belongsTo(WorkItem::class);
    }

    /** @return BelongsTo<Competency, $this> */
    public function primaryLearningObjective(): BelongsTo
    {
        return $this->belongsTo(Competency::class, 'primary_learning_objective_id');
    }

    /** @return BelongsTo<ClientConnection, $this> */
    public function clientConnection(): BelongsTo
    {
        return $this->belongsTo(ClientConnection::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['status' => CoachingSessionStatus::class, 'last_active_at' => 'datetime', 'acceptance_criteria' => 'array', 'responsibility_split' => 'array', 'completion' => 'array', 'completed_at' => 'datetime'];
    }
}
