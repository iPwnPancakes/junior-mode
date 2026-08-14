<?php

namespace App\Http\Requests;

use App\Models\CatalogProposal;
use App\Models\CatalogProposalNode;

class UpdateCatalogProposalNodeRequest extends StoreCatalogProposalNodeRequest
{
    public function authorize(): bool
    {
        $node = $this->route('node');
        $catalogProposal = $this->route('catalogProposal');

        return parent::authorize()
            && $node instanceof CatalogProposalNode
            && $catalogProposal instanceof CatalogProposal
            && $node->catalog_proposal_id === $catalogProposal->id;
    }
}
