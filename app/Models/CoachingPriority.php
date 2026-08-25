<?php

namespace App\Models;

use App\CoachingPriorityEmphasis;
use App\CoachingPriorityExpirationMode;
use App\CoachingPriorityStatus;
use Database\Factories\CoachingPriorityFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $learner_id
 * @property int $competency_id
 * @property int $created_by_id
 * @property int|null $replaced_by_priority_id
 * @property CoachingPriorityEmphasis $emphasis
 * @property CoachingPriorityExpirationMode $expiration_mode
 * @property Carbon|null $expires_at
 * @property CoachingPriorityStatus $status
 * @property string|null $note
 * @property Carbon|null $resolved_at
 */
#[Fillable([
    'learner_id',
    'competency_id',
    'created_by_id',
    'replaced_by_priority_id',
    'emphasis',
    'expiration_mode',
    'expires_at',
    'status',
    'note',
    'resolved_at',
])]
class CoachingPriority extends Model
{
    /** @use HasFactory<CoachingPriorityFactory> */
    use HasFactory;

    protected $attributes = [
        'emphasis' => 'normal',
        'expiration_mode' => 'default_duration',
        'status' => 'active',
    ];

    /** @return BelongsTo<User, $this> */
    public function learner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'learner_id');
    }

    /** @return BelongsTo<Competency, $this> */
    public function competency(): BelongsTo
    {
        return $this->belongsTo(Competency::class);
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /** @return BelongsTo<self, $this> */
    public function replacement(): BelongsTo
    {
        return $this->belongsTo(self::class, 'replaced_by_priority_id');
    }

    public function isExpired(): bool
    {
        return $this->status === CoachingPriorityStatus::Active
            && $this->expires_at?->isPast() === true;
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'emphasis' => CoachingPriorityEmphasis::class,
            'expiration_mode' => CoachingPriorityExpirationMode::class,
            'expires_at' => 'datetime',
            'status' => CoachingPriorityStatus::class,
            'resolved_at' => 'datetime',
        ];
    }
}
