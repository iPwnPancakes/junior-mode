<?php

namespace App\Http\Requests;

use App\Models\CatalogProposal;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DecideCatalogProposalRequest extends FormRequest
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
        return [
            'decision' => ['required', Rule::in(['approve', 'reject'])],
        ];
    }
}
