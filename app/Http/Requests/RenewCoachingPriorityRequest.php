<?php

namespace App\Http\Requests;

use App\CoachingPriorityExpirationMode;
use App\CoachingPriorityStatus;
use App\Models\CoachingPriority;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RenewCoachingPriorityRequest extends FormRequest
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
            'expiration_mode' => ['required', Rule::enum(CoachingPriorityExpirationMode::class)],
            'expires_on' => ['nullable', 'required_if:expiration_mode,custom_date', 'date', 'after:today'],
        ];
    }
}
