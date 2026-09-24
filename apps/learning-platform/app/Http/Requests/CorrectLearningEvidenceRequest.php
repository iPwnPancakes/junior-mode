<?php

namespace App\Http\Requests;

use App\Actions\RecordLearningEvidence;
use App\Models\LearningEvidence;
use Illuminate\Foundation\Http\FormRequest;

class CorrectLearningEvidenceRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $evidence = $this->input('evidence');
        if (is_array($evidence)) {
            foreach (['learner_work', 'agent_work'] as $field) {
                if (array_key_exists($field, $evidence) && $evidence[$field] === null) {
                    $evidence[$field] = '';
                }
            }
            $this->merge(['evidence' => $evidence]);
        }
    }

    public function authorize(): bool
    {
        $event = $this->route('learningEvidence');

        return $event instanceof LearningEvidence && ($this->user()?->id === $event->learner_id || ($this->user()?->isMentor() && $event->coachingSession->learner->mentor_id === $this->user()->id));
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['correction_reason' => ['required', 'string', 'max:1000'], 'evidence' => ['required', 'array:activity,assistance,hints_used,ownership,learner_work,agent_work,verification,teach_back,context_key,context_description,source,transfer_from_id,material_difference,correction_reason'], ...collect(RecordLearningEvidence::rules())->except(['schema_version', 'idempotency_key', 'competency_id', 'supersedes_id', 'source', 'correction_reason'])->mapWithKeys(fn ($rule, $key) => ['evidence.'.$key => $rule])->all()];
    }
}
