<?php

namespace App\Models;

use Database\Factories\CompetencyTemplateNodeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'competency_template_id',
    'parent_id',
    'position',
    'name',
    'definition',
    'demonstration_criteria',
    'prerequisites',
    'work_opportunities',
    'technologies',
])]
class CompetencyTemplateNode extends Model
{
    /** @use HasFactory<CompetencyTemplateNodeFactory> */
    use HasFactory;

    protected $attributes = [
        'position' => 0,
    ];

    /** @return BelongsTo<CompetencyTemplate, $this> */
    public function template(): BelongsTo
    {
        return $this->belongsTo(CompetencyTemplate::class, 'competency_template_id');
    }

    /** @return BelongsTo<CompetencyTemplateNode, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** @return HasMany<CompetencyTemplateNode, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('position')->orderBy('id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'prerequisites' => 'array',
            'work_opportunities' => 'array',
            'technologies' => 'array',
        ];
    }
}
