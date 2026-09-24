<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAssessmentRequest;
use App\Models\Assessment;
use App\Models\User;
use Illuminate\Http\RedirectResponse;

class AssessmentController extends Controller
{
    public function store(StoreAssessmentRequest $request, User $learner): RedirectResponse
    {
        Assessment::create([
            ...$request->validated(),
            'learner_id' => $learner->id,
            'assessed_by_id' => $request->user()->id,
            'assessed_at' => now(),
        ]);

        return back()->with('success', 'Assessment recorded.');
    }
}
