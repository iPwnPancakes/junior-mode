<?php

namespace App\Http\Controllers;

use App\Actions\ApproveCatalogProposal;
use App\Http\Requests\DecideCatalogProposalRequest;
use App\Models\CatalogProposal;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class CatalogProposalDecisionController extends Controller
{
    public function __invoke(
        DecideCatalogProposalRequest $request,
        User $learner,
        CatalogProposal $catalogProposal,
        ApproveCatalogProposal $approveCatalogProposal,
    ): RedirectResponse {
        if ($request->string('decision')->is('approve')) {
            $createdCount = $approveCatalogProposal->approve($catalogProposal, $request->user());
            $message = trans_choice(':count Competency approved.|:count Competencies approved.', $createdCount, ['count' => $createdCount]);
        } else {
            $approveCatalogProposal->reject($catalogProposal, $request->user());
            $message = __('Catalog Proposal rejected.');
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return to_route('catalog-proposals.show', [$learner, $catalogProposal]);
    }
}
