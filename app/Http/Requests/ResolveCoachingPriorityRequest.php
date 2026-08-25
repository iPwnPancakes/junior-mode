<?php

namespace App\Http\Requests;

use App\CoachingPriorityStatus;
use App\Models\CoachingPriority;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ResolveCoachingPriorityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $learner = $this->route('learner');
        $priority = $this->route('coachingPriority');

        return $learner instanceof User
            && $priority instanceof CoachingPriority
            && $priority->status === CoachingPriorityStatus::Active
            && $this->user()?->can('manageCoachingRecord', $learner) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in([
                CoachingPriorityStatus::Closed->value,
                CoachingPriorityStatus::SufficientlyDemonstrated->value,
            ])],
        ];
    }
}
