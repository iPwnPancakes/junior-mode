<?php

namespace App\Http\Controllers;

use App\Actions\CopyCompetencyTemplate;
use App\Http\Requests\CopyCompetencyTemplateRequest;
use App\Models\Competency;
use App\Models\CompetencyTemplate;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class CompetencyTemplateCopyController extends Controller
{
    public function __invoke(
        CopyCompetencyTemplateRequest $request,
        User $learner,
        CopyCompetencyTemplate $copyCompetencyTemplate,
    ): RedirectResponse {
        $template = CompetencyTemplate::query()->findOrFail($request->integer('template_id'));
        $parent = $request->filled('parent_id')
            ? Competency::query()->findOrFail($request->integer('parent_id'))
            : null;
        $copiedCount = $copyCompetencyTemplate->handle($learner, $template, $parent);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => trans_choice(':count Competency copied.|:count Competencies copied.', $copiedCount, [
                'count' => $copiedCount,
            ]),
        ]);

        return to_route('competency-catalogs.show', $learner);
    }
}
