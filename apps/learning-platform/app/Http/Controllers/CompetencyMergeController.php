<?php

namespace App\Http\Controllers;

use App\Actions\MergeCompetencies;
use App\Http\Requests\MergeCompetencyRequest;
use App\Models\Competency;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class CompetencyMergeController extends Controller
{
    public function __invoke(
        MergeCompetencyRequest $request,
        User $learner,
        Competency $competency,
        MergeCompetencies $mergeCompetencies,
    ): RedirectResponse {
        /** @var User $mentor */
        $mentor = $request->user();
        $target = Competency::query()->findOrFail($request->integer('target_competency_id'));
        $mergeCompetencies->handle($competency, $target, $mentor);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Competencies merged. The original remains available in history.'),
        ]);

        return to_route('competency-catalogs.show', $learner);
    }
}
