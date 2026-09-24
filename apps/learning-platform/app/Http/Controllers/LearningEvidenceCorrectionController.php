<?php

namespace App\Http\Controllers;

use App\Actions\RecordLearningEvidence;
use App\Http\Requests\CorrectLearningEvidenceRequest;
use App\Models\LearningEvidence;
use App\Support\LearningContract;
use Illuminate\Http\RedirectResponse;

class LearningEvidenceCorrectionController extends Controller
{
    public function __invoke(CorrectLearningEvidenceRequest $request, LearningEvidence $learningEvidence, RecordLearningEvidence $record): RedirectResponse
    {
        $data = $request->validated();
        $record->handle($request->user(), $learningEvidence->coachingSession, [
            ...$data['evidence'],
            'schema_version' => 1,
            'idempotency_key' => 'correction-'.LearningContract::hash([$request->user()->id, $learningEvidence->id, $data]),
            'competency_id' => $learningEvidence->competency_id,
            'supersedes_id' => $learningEvidence->id,
            'source' => $request->user()->isMentor() ? 'mentor' : 'learner',
            'correction_reason' => $data['correction_reason'],
        ]);

        return to_route('coaching-records.show', $learningEvidence->learner_id);
    }
}
