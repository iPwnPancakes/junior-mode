<?php

namespace App\Http\Controllers;

use App\Actions\ReviewBaselineAssessmentProposal;
use App\BaselineAssessmentDecision;
use App\Http\Requests\DecideBaselineAssessmentProposalRequest;
use App\Models\BaselineAssessmentProposal;
use App\Models\CatalogProposal;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class BaselineAssessmentProposalDecisionController extends Controller
{
    public function __invoke(
        DecideBaselineAssessmentProposalRequest $request,
        User $learner,
        CatalogProposal $catalogProposal,
        BaselineAssessmentProposal $baselineAssessment,
        ReviewBaselineAssessmentProposal $reviewBaselineAssessment,
    ): RedirectResponse {
        $decision = BaselineAssessmentDecision::from($request->string('decision')->toString());
        $reviewBaselineAssessment->handle($baselineAssessment, $request->user(), $decision);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $decision === BaselineAssessmentDecision::Approved
                ? __('Baseline Assessment approved.')
                : __('Baseline Assessment rejected.'),
        ]);

        return to_route('catalog-proposals.show', [$learner, $catalogProposal]);
    }
}
