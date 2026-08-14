<?php

namespace App\Models;

use App\BaselineAssessmentLevel;
use Database\Factories\AssessmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $learner_id
 * @property int $competency_id
 * @property int $assessed_by_id
 * @property int|null $baseline_assessment_proposal_id
 * @property BaselineAssessmentLevel $level
 * @property string|null $rationale
 * @property Carbon $assessed_at
 */
#[Fillable([
    'learner_id',
    'competency_id',
    'assessed_by_id',
    'baseline_assessment_proposal_id',
    'level',
    'rationale',
    'assessed_at',
])]
class Assessment extends Model
{
    /** @use HasFactory<AssessmentFactory> */
    use HasFactory;

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
    public function assessedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assessed_by_id');
    }

    /** @return BelongsTo<BaselineAssessmentProposal, $this> */
    public function baselineAssessmentProposal(): BelongsTo
    {
        return $this->belongsTo(BaselineAssessmentProposal::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'level' => BaselineAssessmentLevel::class,
            'assessed_at' => 'datetime',
        ];
    }
}
