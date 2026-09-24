<?php

namespace App\Models;

use Database\Factories\CatalogProposalNodeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $catalog_proposal_id
 * @property int|null $parent_id
 * @property int $position
 * @property string $name
 * @property string $definition
 * @property string $demonstration_criteria
 * @property array<int, string>|null $prerequisites
 * @property array<int, string>|null $work_opportunities
 * @property array<int, string>|null $technologies
 * @property bool $selected
 * @property int|null $copied_competency_id
 */
#[Fillable([
    'catalog_proposal_id',
    'parent_id',
    'position',
    'name',
    'definition',
    'demonstration_criteria',
    'prerequisites',
    'work_opportunities',
    'technologies',
    'selected',
    'copied_competency_id',
])]
class CatalogProposalNode extends Model
{
    /** @use HasFactory<CatalogProposalNodeFactory> */
    use HasFactory;

    protected $attributes = [
        'position' => 0,
        'selected' => true,
    ];

    /** @return BelongsTo<CatalogProposal, $this> */
    public function proposal(): BelongsTo
    {
        return $this->belongsTo(CatalogProposal::class, 'catalog_proposal_id');
    }

    /** @return BelongsTo<CatalogProposalNode, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** @return HasMany<CatalogProposalNode, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('position')->orderBy('id');
    }

    /** @return BelongsTo<Competency, $this> */
    public function copiedCompetency(): BelongsTo
    {
        return $this->belongsTo(Competency::class, 'copied_competency_id');
    }

    /** @return HasOne<BaselineAssessmentProposal, $this> */
    public function baselineAssessment(): HasOne
    {
        return $this->hasOne(BaselineAssessmentProposal::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'prerequisites' => 'array',
            'work_opportunities' => 'array',
            'technologies' => 'array',
            'selected' => 'boolean',
        ];
    }
}
