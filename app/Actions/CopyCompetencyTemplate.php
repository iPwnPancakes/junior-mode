<?php

namespace App\Actions;

use App\Models\Competency;
use App\Models\CompetencyTemplate;
use App\Models\CompetencyTemplateNode;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CopyCompetencyTemplate
{
    public function handle(User $learner, CompetencyTemplate $template, ?Competency $parent = null): int
    {
        if ($parent !== null && $parent->learner_id !== $learner->id) {
            throw ValidationException::withMessages([
                'parent_id' => __('The selected parent must belong to this Learner.'),
            ]);
        }

        return DB::transaction(function () use ($learner, $template, $parent): int {
            $nodesByParent = $template->nodes()->get()->groupBy('parent_id');
            $createdCount = 0;

            $copyChildren = function (?int $templateParentId, ?int $catalogParentId) use (
                &$copyChildren,
                &$createdCount,
                $learner,
                $nodesByParent,
            ): void {
                /** @var Collection<int, CompetencyTemplateNode> $nodes */
                $nodes = $nodesByParent->get($templateParentId, collect());
                $nextPosition = Competency::query()
                    ->whereBelongsTo($learner, 'learner')
                    ->where('parent_id', $catalogParentId)
                    ->max('position');
                $nextPosition = $nextPosition === null ? 0 : $nextPosition + 1;

                foreach ($nodes as $node) {
                    $competency = $learner->competencies()->create([
                        'parent_id' => $catalogParentId,
                        'position' => $nextPosition++,
                        'name' => $node->name,
                        'definition' => $node->definition,
                        'demonstration_criteria' => $node->demonstration_criteria,
                        'prerequisites' => $node->prerequisites,
                        'work_opportunities' => $node->work_opportunities,
                        'technologies' => $node->technologies,
                    ]);
                    $createdCount++;
                    $copyChildren($node->id, $competency->id);
                }
            };

            $copyChildren(null, $parent?->id);

            return $createdCount;
        });
    }
}
