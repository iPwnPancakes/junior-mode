<?php

namespace App\Http\Requests;

use App\BaselineAssessmentLevel;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssessmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $learner = $this->route('learner');

        return $learner instanceof User
            && $this->user()?->can('manageCoachingRecord', $learner) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var User $learner */
        $learner = $this->route('learner');

        return [
            'competency_id' => [
                'required',
                'integer',
                Rule::exists('competencies', 'id')->where(fn ($query) => $query
                    ->where('learner_id', $learner->id)
                    ->whereNull('archived_at')
                    ->whereNull('merged_into_id')),
            ],
            'level' => ['required', Rule::enum(BaselineAssessmentLevel::class)],
            'rationale' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
