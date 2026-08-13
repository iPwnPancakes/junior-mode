<?php

namespace App\Models;

use Database\Factories\CompetencyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $learner_id
 * @property int|null $parent_id
 * @property int $position
 * @property string $name
 * @property string $definition
 * @property string $demonstration_criteria
 * @property array<int, string>|null $prerequisites
 * @property array<int, string>|null $work_opportunities
 * @property array<int, string>|null $technologies
 * @property Carbon|null $archived_at
 * @property int|null $merged_into_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'learner_id',
    'parent_id',
    'position',
    'name',
    'definition',
    'demonstration_criteria',
    'prerequisites',
    'work_opportunities',
    'technologies',
    'archived_at',
    'merged_into_id',
])]
class Competency extends Model
{
    /** @use HasFactory<CompetencyFactory> */
    use HasFactory;

    protected $attributes = [
        'position' => 0,
    ];

    /** @return BelongsTo<User, $this> */
    public function learner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'learner_id');
    }

    /** @return BelongsTo<Competency, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** @return HasMany<Competency, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('position')->orderBy('id');
    }

    /** @return BelongsTo<Competency, $this> */
    public function mergeTarget(): BelongsTo
    {
        return $this->belongsTo(self::class, 'merged_into_id');
    }

    /** @return HasMany<CompetencyMerge, $this> */
    public function incomingMerges(): HasMany
    {
        return $this->hasMany(CompetencyMerge::class, 'target_competency_id');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    public function isMerged(): bool
    {
        return $this->merged_into_id !== null;
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'prerequisites' => 'array',
            'work_opportunities' => 'array',
            'technologies' => 'array',
            'archived_at' => 'datetime',
        ];
    }
}
