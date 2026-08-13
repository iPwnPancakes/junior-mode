<?php

namespace App\Http\Controllers;

use App\Actions\CreateCompetency;
use App\Actions\UpdateCompetency;
use App\Http\Requests\StoreCompetencyRequest;
use App\Http\Requests\UpdateCompetencyRequest;
use App\Models\Competency;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class CompetencyController extends Controller
{
    public function store(StoreCompetencyRequest $request, User $learner, CreateCompetency $createCompetency): RedirectResponse
    {
        $createCompetency->handle($learner, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Competency added.'),
        ]);

        return to_route('competency-catalogs.show', $learner);
    }

    public function update(
        UpdateCompetencyRequest $request,
        User $learner,
        Competency $competency,
        UpdateCompetency $updateCompetency,
    ): RedirectResponse {
        $updateCompetency->handle($competency, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Competency updated.'),
        ]);

        return to_route('competency-catalogs.show', $learner);
    }
}
