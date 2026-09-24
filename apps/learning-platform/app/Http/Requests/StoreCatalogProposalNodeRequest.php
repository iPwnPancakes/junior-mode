<?php

namespace App\Http\Requests;

use App\Models\CatalogProposal;
use App\Models\CatalogProposalNode;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCatalogProposalNodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $learner = $this->route('learner');
        $catalogProposal = $this->route('catalogProposal');

        return $learner instanceof User
            && $catalogProposal instanceof CatalogProposal
            && $catalogProposal->learner_id === $learner->id
            && $catalogProposal->isEditable()
            && $this->user()?->can('manageCompetencyCatalog', $learner) === true;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        /** @var CatalogProposal $catalogProposal */
        $catalogProposal = $this->route('catalogProposal');

        return [
            'name' => ['required', 'string', 'max:120'],
            'definition' => ['required', 'string', 'max:2000'],
            'demonstration_criteria' => ['required', 'string', 'max:4000'],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists(CatalogProposalNode::class, 'id')
                    ->where('catalog_proposal_id', $catalogProposal->id),
            ],
            'position' => ['nullable', 'integer', 'min:0'],
            'prerequisites' => ['nullable', 'string', 'max:2000'],
            'work_opportunities' => ['nullable', 'string', 'max:2000'],
            'technologies' => ['nullable', 'string', 'max:2000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('parent_id') === 'root') {
            $this->merge(['parent_id' => null]);
        }
    }
}
