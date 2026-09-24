<?php

namespace App\Http\Requests;

use App\BaselineAssessmentDecision;
use App\Models\BaselineAssessmentProposal;
use App\Models\CatalogProposal;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DecideBaselineAssessmentProposalRequest extends FormRequest
{
    public function authorize(): bool
    {
        $learner = $this->route('learner');
        $catalogProposal = $this->route('catalogProposal');
        $baselineAssessment = $this->route('baselineAssessment');

        return $learner instanceof User
            && $catalogProposal instanceof CatalogProposal
            && $baselineAssessment instanceof BaselineAssessmentProposal
            && $catalogProposal->learner_id === $learner->id
            && $baselineAssessment->catalog_proposal_id === $catalogProposal->id
            && $baselineAssessment->decision === BaselineAssessmentDecision::Pending
            && $this->user()?->can('manageCompetencyCatalog', $learner) === true;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'decision' => ['required', Rule::in([
                BaselineAssessmentDecision::Approved->value,
                BaselineAssessmentDecision::Rejected->value,
            ])],
        ];
    }
}
