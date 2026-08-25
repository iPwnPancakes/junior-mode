<?php

namespace App\Http\Requests;

use App\CoachingPriorityEmphasis;
use App\CoachingPriorityExpirationMode;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCoachingPriorityRequest extends FormRequest
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
            'emphasis' => ['required', Rule::enum(CoachingPriorityEmphasis::class)],
            'expiration_mode' => ['required', Rule::enum(CoachingPriorityExpirationMode::class)],
            'expires_on' => ['nullable', 'required_if:expiration_mode,custom_date', 'date', 'after:today'],
            'note' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /** @return array{competency_id: int, emphasis: string, expiration_mode: string, expires_on: string|null, note: string|null} */
    public function validatedPriority(): array
    {
        $this->validated();

        return [
            'competency_id' => $this->integer('competency_id'),
            'emphasis' => $this->string('emphasis')->toString(),
            'expiration_mode' => $this->string('expiration_mode')->toString(),
            'expires_on' => $this->filled('expires_on') ? $this->string('expires_on')->toString() : null,
            'note' => $this->filled('note') ? $this->string('note')->toString() : null,
        ];
    }
}
