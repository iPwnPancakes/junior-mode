<?php

namespace App\Models;

use Database\Factories\CompetencyMergeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['source_competency_id', 'target_competency_id', 'merged_by_id'])]
class CompetencyMerge extends Model
{
    /** @use HasFactory<CompetencyMergeFactory> */
    use HasFactory;

    /** @return BelongsTo<Competency, $this> */
    public function source(): BelongsTo
    {
        return $this->belongsTo(Competency::class, 'source_competency_id');
    }

    /** @return BelongsTo<Competency, $this> */
    public function target(): BelongsTo
    {
        return $this->belongsTo(Competency::class, 'target_competency_id');
    }

    /** @return BelongsTo<User, $this> */
    public function mergedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merged_by_id');
    }
}
