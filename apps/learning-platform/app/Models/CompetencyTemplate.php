<?php

namespace App\Models;

use Database\Factories\CompetencyTemplateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'description'])]
class CompetencyTemplate extends Model
{
    /** @use HasFactory<CompetencyTemplateFactory> */
    use HasFactory;

    /** @return HasMany<CompetencyTemplateNode, $this> */
    public function nodes(): HasMany
    {
        return $this->hasMany(CompetencyTemplateNode::class)->orderBy('position')->orderBy('id');
    }
}
