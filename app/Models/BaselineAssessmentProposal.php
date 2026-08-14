<?php

namespace App\Models;

use App\BaselineAssessmentDecision;
use App\BaselineAssessmentLevel;
use Database\Factories\BaselineAssessmentProposalFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $catalog_proposal_id
 * @property int $catalog_proposal_node_id
 * @property BaselineAssessmentLevel $level
 * @property string|null $rationale
 * @property BaselineAssessmentDecision $decision
 * @property int|null $reviewed_by_id
 * @property Carbon|null $reviewed_at
 * @property-read CatalogProposal $proposal
 * @property-read CatalogProposalNode $node
 * @property-read Assessment|null $assessment
 */
#[Fillable([
    'catalog_proposal_id',
    'catalog_proposal_node_id',
    'level',
    'rationale',
    'decision',
    'reviewed_by_id',
    'reviewed_at',
])]
class BaselineAssessmentProposal extends Model
{
    /** @use HasFactory<BaselineAssessmentProposalFactory> */
    use HasFactory;

    protected $attributes = [
        'level' => BaselineAssessmentLevel::NotYetObserved,
        'decision' => BaselineAssessmentDecision::Pending,
    ];

    /** @return BelongsTo<CatalogProposal, $this> */
    public function proposal(): BelongsTo
    {
        return $this->belongsTo(CatalogProposal::class, 'catalog_proposal_id');
    }

    /** @return BelongsTo<CatalogProposalNode, $this> */
    public function node(): BelongsTo
    {
        return $this->belongsTo(CatalogProposalNode::class, 'catalog_proposal_node_id');
    }

    /** @return BelongsTo<User, $this> */
    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_id');
    }

    /** @return HasOne<Assessment, $this> */
    public function assessment(): HasOne
    {
        return $this->hasOne(Assessment::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'level' => BaselineAssessmentLevel::class,
            'decision' => BaselineAssessmentDecision::class,
            'reviewed_at' => 'datetime',
        ];
    }
}
