<?php

namespace App\Http\Requests;

use App\Models\Competency;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompetencyRequest extends FormRequest
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

        return [
            'name' => ['required', 'string', 'max:120'],
            'definition' => ['required', 'string', 'max:2000'],
            'demonstration_criteria' => ['required', 'string', 'max:4000'],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists(Competency::class, 'id')->where('learner_id', $learner->id),
            ],
            'position' => ['required', 'integer', 'min:0'],
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
