<?php

namespace App\Http\Controllers;

use App\Actions\SetCatalogProposalNodeSelection;
use App\Http\Requests\UpdateCatalogProposalSelectionRequest;
use App\Models\CatalogProposal;
use App\Models\CatalogProposalNode;
use App\Models\User;
use Illuminate\Http\RedirectResponse;

class CatalogProposalSelectionController extends Controller
{
    public function __invoke(
        UpdateCatalogProposalSelectionRequest $request,
        User $learner,
        CatalogProposal $catalogProposal,
        CatalogProposalNode $node,
        SetCatalogProposalNodeSelection $setSelection,
    ): RedirectResponse {
        $setSelection->handle($node, $request->boolean('selected'));

        return to_route('catalog-proposals.show', [$learner, $catalogProposal]);
    }
}
