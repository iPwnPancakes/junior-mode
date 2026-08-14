<?php

namespace App\Http\Requests;

use App\Models\CatalogProposal;
use App\Models\CatalogProposalNode;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCatalogProposalSelectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $learner = $this->route('learner');
        $catalogProposal = $this->route('catalogProposal');
        $node = $this->route('node');

        return $learner instanceof User
            && $catalogProposal instanceof CatalogProposal
            && $node instanceof CatalogProposalNode
            && $catalogProposal->learner_id === $learner->id
            && $node->catalog_proposal_id === $catalogProposal->id
            && $catalogProposal->isEditable()
            && $this->user()?->can('manageCompetencyCatalog', $learner) === true;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'selected' => ['required', 'boolean'],
        ];
    }
}
