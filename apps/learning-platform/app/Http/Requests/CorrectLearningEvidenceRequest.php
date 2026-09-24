<?php

namespace App\Http\Requests;

use App\Actions\RecordLearningEvidence;
use App\Models\LearningEvidence;
use Illuminate\Foundation\Http\FormRequest;

class CorrectLearningEvidenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $event = $this->route('learningEvidence');

        return $event instanceof LearningEvidence && ($this->user()?->id === $event->learner_id || ($this->user()?->isMentor() && $event->coachingSession->learner->mentor_id === $this->user()->id));
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['correction_reason' => ['required', 'string', 'max:1000'], 'evidence' => ['required', 'array'], ...collect(RecordLearningEvidence::rules())->except(['schema_version', 'idempotency_key', 'competency_id', 'supersedes_id', 'source', 'correction_reason'])->mapWithKeys(fn ($rule, $key) => ['evidence.'.$key => $rule])->all()];
    }
}
