<?php

namespace App\Http\Controllers;

use App\Actions\ArchiveCompetency;
use App\Models\Competency;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class CompetencyArchiveController extends Controller
{
    public function __invoke(User $learner, Competency $competency, ArchiveCompetency $archiveCompetency): RedirectResponse
    {
        Gate::authorize('manageCompetencyCatalog', $learner);
        $archiveCompetency->handle($competency);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Competency archived. Historical references remain intact.'),
        ]);

        return to_route('competency-catalogs.show', $learner);
    }
}
