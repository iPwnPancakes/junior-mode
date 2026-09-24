<?php

namespace App\Http\Controllers;

use App\Actions\CreateCatalogProposalNode;
use App\Actions\UpdateCatalogProposalNode;
use App\Http\Requests\StoreCatalogProposalNodeRequest;
use App\Http\Requests\UpdateCatalogProposalNodeRequest;
use App\Models\CatalogProposal;
use App\Models\CatalogProposalNode;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class CatalogProposalNodeController extends Controller
{
    public function store(
        StoreCatalogProposalNodeRequest $request,
        User $learner,
        CatalogProposal $catalogProposal,
        CreateCatalogProposalNode $createNode,
    ): RedirectResponse {
        $createNode->handle($catalogProposal, $request->validated());
        $this->flash(__('Proposed Competency added.'));

        return to_route('catalog-proposals.show', [$learner, $catalogProposal]);
    }

    public function update(
        UpdateCatalogProposalNodeRequest $request,
        User $learner,
        CatalogProposal $catalogProposal,
        CatalogProposalNode $node,
        UpdateCatalogProposalNode $updateNode,
    ): RedirectResponse {
        $updateNode->handle($node, $request->validated());
        $this->flash(__('Proposed Competency updated.'));

        return to_route('catalog-proposals.show', [$learner, $catalogProposal]);
    }

    public function destroy(
        Request $request,
        User $learner,
        CatalogProposal $catalogProposal,
        CatalogProposalNode $node,
    ): RedirectResponse {
        Gate::authorize('manageCompetencyCatalog', $learner);
        abort_unless($catalogProposal->learner_id === $learner->id
            && $node->catalog_proposal_id === $catalogProposal->id
            && $catalogProposal->isEditable(), 404);

        $node->delete();
        $this->flash(__('Proposed branch removed.'));

        return to_route('catalog-proposals.show', [$learner, $catalogProposal]);
    }

    private function flash(string $message): void
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);
    }
}
