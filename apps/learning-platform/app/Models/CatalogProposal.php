<?php

namespace App\Models;

use App\CatalogProposalStatus;
use Database\Factories\CatalogProposalFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $learner_id
 * @property int $client_connection_id
 * @property array<string, array<int, string>>|null $interview_context
 * @property CatalogProposalStatus $status
 * @property Carbon|null $submitted_at
 * @property int|null $reviewed_by_id
 * @property Carbon|null $reviewed_at
 * @property-read User $learner
 * @property-read ClientConnection $clientConnection
 * @property-read Collection<int, CatalogProposalNode> $nodes
 * @property-read Collection<int, BaselineAssessmentProposal> $baselineAssessments
 */
#[Fillable([
    'learner_id',
    'client_connection_id',
    'interview_context',
    'status',
    'submitted_at',
    'reviewed_by_id',
    'reviewed_at',
])]
class CatalogProposal extends Model
{
    /** @use HasFactory<CatalogProposalFactory> */
    use HasFactory;

    protected $attributes = [
        'status' => CatalogProposalStatus::Interviewing,
    ];

    /** @return BelongsTo<User, $this> */
    public function learner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'learner_id');
    }

    /** @return BelongsTo<ClientConnection, $this> */
    public function clientConnection(): BelongsTo
    {
        return $this->belongsTo(ClientConnection::class);
    }

    /** @return BelongsTo<User, $this> */
    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_id');
    }

    /** @return HasMany<CatalogProposalNode, $this> */
    public function nodes(): HasMany
    {
        return $this->hasMany(CatalogProposalNode::class)->orderBy('position')->orderBy('id');
    }

    /** @return HasMany<BaselineAssessmentProposal, $this> */
    public function baselineAssessments(): HasMany
    {
        return $this->hasMany(BaselineAssessmentProposal::class);
    }

    public function isEditable(): bool
    {
        return $this->status === CatalogProposalStatus::AwaitingReview;
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'interview_context' => 'array',
            'status' => CatalogProposalStatus::class,
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }
}
