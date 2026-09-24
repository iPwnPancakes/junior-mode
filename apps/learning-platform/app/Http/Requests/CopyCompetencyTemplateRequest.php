<?php

namespace App\Http\Requests;

use App\Models\Competency;
use App\Models\CompetencyTemplate;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CopyCompetencyTemplateRequest extends FormRequest
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
            'template_id' => ['required', 'integer', Rule::exists(CompetencyTemplate::class, 'id')],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists(Competency::class, 'id')->where('learner_id', $learner->id),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('parent_id') === 'root') {
            $this->merge(['parent_id' => null]);
        }
    }
}
