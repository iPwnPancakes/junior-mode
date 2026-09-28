<?php

namespace App\Http\Controllers;

use App\Actions\MoveCompetency;
use App\Http\Requests\MoveCompetencyRequest;
use App\Models\Competency;
use App\Models\User;
use Illuminate\Http\RedirectResponse;

class CompetencyPositionController extends Controller
{
    public function __invoke(
        MoveCompetencyRequest $request,
        User $learner,
        Competency $competency,
        MoveCompetency $moveCompetency,
    ): RedirectResponse {
        $moveCompetency->handle($competency, $request->validated('direction'));

        return to_route('learners.show', $learner);
    }
}
