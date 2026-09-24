<?php

namespace App\Http\Requests;

use App\Models\Competency;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MergeCompetencyRequest extends FormRequest
{
    public function authorize(): bool
    {
        $learner = $this->route('learner');

        return $learner instanceof User
            && $this->user()?->can('manageCompetencyCatalog', $learner) === true;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        /** @var User $learner */
        $learner = $this->route('learner');
        /** @var Competency $competency */
        $competency = $this->route('competency');

        return [
            'target_competency_id' => [
                'required',
                'integer',
                Rule::exists(Competency::class, 'id')
                    ->where('learner_id', $learner->id)
                    ->whereNull('archived_at')
                    ->whereNull('merged_into_id'),
                Rule::notIn([$competency->id]),
            ],
        ];
    }
}
