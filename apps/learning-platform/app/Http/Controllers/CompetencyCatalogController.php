<?php

namespace App\Http\Controllers;

use App\Models\Competency;
use App\Models\CompetencyTemplate;
use App\Models\CompetencyTemplateNode;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CompetencyCatalogController extends Controller
{
    public function __invoke(Request $request, User $learner): Response
    {
        Gate::authorize('viewCompetencyCatalog', $learner);

        return Inertia::render('competency-catalogs/show', [
            'learner' => [
                'id' => $learner->id,
                'name' => $learner->name,
                'email' => $learner->email,
            ],
            'canManage' => $request->user()?->can('manageCompetencyCatalog', $learner) === true,
            'competencies' => $learner->competencies()
                ->with('mergeTarget:id,name')
                ->orderBy('parent_id')
                ->orderBy('position')
                ->orderBy('id')
                ->get()
                ->map(fn (Competency $competency): array => $this->serializeCompetency($competency)),
            'templates' => CompetencyTemplate::query()
                ->with('nodes')
                ->orderBy('name')
                ->get()
                ->map(fn (CompetencyTemplate $template): array => [
                    'id' => $template->id,
                    'name' => $template->name,
                    'description' => $template->description,
                    'nodes' => $template->nodes
                        ->map(fn (CompetencyTemplateNode $node): array => $this->serializeTemplateNode($node)),
                ]),
        ]);
    }

    /** @return array<string, mixed> */
    private function serializeCompetency(Competency $competency): array
    {
        return [
            'id' => $competency->id,
            'parentId' => $competency->parent_id,
            'position' => $competency->position,
            'name' => $competency->name,
            'definition' => $competency->definition,
            'demonstrationCriteria' => $competency->demonstration_criteria,
            'prerequisites' => $competency->prerequisites ?? [],
            'workOpportunities' => $competency->work_opportunities ?? [],
            'technologies' => $competency->technologies ?? [],
            'archivedAt' => $competency->archived_at?->toDateString(),
            'mergedInto' => $competency->mergeTarget === null
                ? null
                : ['id' => $competency->mergeTarget->id, 'name' => $competency->mergeTarget->name],
        ];
    }

    /** @return array<string, mixed> */
    private function serializeTemplateNode(CompetencyTemplateNode $node): array
    {
        return [
            'id' => $node->id,
            'parentId' => $node->parent_id,
            'position' => $node->position,
            'name' => $node->name,
            'definition' => $node->definition,
            'demonstrationCriteria' => $node->demonstration_criteria,
            'prerequisites' => $node->prerequisites ?? [],
            'workOpportunities' => $node->work_opportunities ?? [],
            'technologies' => $node->technologies ?? [],
        ];
    }
}
