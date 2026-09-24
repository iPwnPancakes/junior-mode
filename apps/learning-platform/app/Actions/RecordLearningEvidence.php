<?php

namespace App\Actions;

use App\CoachingSessionStatus;
use App\Models\ClientConnection;
use App\Models\CoachingSession;
use App\Models\LearningEvidence;
use App\Models\User;
use App\Support\LearningContract;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class RecordLearningEvidence
{
    /** @param array<string, mixed> $input */
    public function handle(User $actor, CoachingSession $session, array $input, ?ClientConnection $client = null): LearningEvidence
    {
        abort_unless($actor->id === $session->learner_id || ($actor->isMentor() && $session->learner->mentor_id === $actor->id), 403);
        abort_if($client !== null && $client->learner_id !== $session->learner_id, 403);
        $data = Validator::make($input, self::rules())->validate();
        LearningContract::validateSummaries($data);
        if ($client !== null && ! in_array($data['source'], ['agent', 'automated_check'], true)) {
            throw ValidationException::withMessages(['source' => 'Client evidence must identify its source as agent or automated_check.']);
        }
        if ($client === null) {
            $data['source'] = $actor->isMentor() ? 'mentor' : 'learner';
        }
        $data['verification']['passed'] = (bool) $data['verification']['passed'];
        $data['teach_back']['demonstrated'] = (bool) $data['teach_back']['demonstrated'];
        $data['hints_used'] = (int) $data['hints_used'];
        $data['competency_id'] = (int) $data['competency_id'];
        $hash = LearningContract::hash($data);

        return DB::transaction(function () use ($actor, $session, $client, $data, $hash): LearningEvidence {
            User::query()->whereKey($session->learner_id)->lockForUpdate()->firstOrFail();
            $session->refresh();
            $existing = LearningEvidence::query()->where('learner_id', $session->learner_id)->where('idempotency_key', $data['idempotency_key'])->first();
            if ($existing !== null) {
                if ($existing->request_hash !== $hash || $existing->coaching_session_id !== $session->id) {
                    throw ValidationException::withMessages(['idempotency_key' => 'This key was already used for different evidence.']);
                }

                return $existing;
            }
            $supersedes = null;
            if (isset($data['supersedes_id'])) {
                $supersedes = LearningEvidence::query()->where('learner_id', $session->learner_id)->where('coaching_session_id', $session->id)->whereKey($data['supersedes_id'])->first();
                if ($supersedes === null || LearningEvidence::query()->where('supersedes_id', $supersedes->id)->exists()) {
                    throw ValidationException::withMessages(['supersedes_id' => 'Correct the current evidence event in this Session.']);
                }
            } elseif ($session->status !== CoachingSessionStatus::Active) {
                throw ValidationException::withMessages(['session_id' => 'A settled Session only accepts corrections.']);
            }
            if ($supersedes === null && $session->workItem->enrolledRepository->unenrolled_at !== null) {
                throw ValidationException::withMessages(['session_id' => 'The repository is no longer enrolled.']);
            }
            if ($data['competency_id'] !== $session->primary_learning_objective_id || ($supersedes !== null && $supersedes->competency_id !== $data['competency_id'])) {
                throw ValidationException::withMessages(['competency_id' => 'Evidence must concern the Session learning objective.']);
            }
            if (isset($data['transfer_from_id'])) {
                $previous = LearningEvidence::query()->where('learner_id', $session->learner_id)->where('competency_id', $data['competency_id'])->whereKey($data['transfer_from_id'])->first();
                if ($previous === null || $previous->coaching_session_id === $session->id) {
                    throw ValidationException::withMessages(['transfer_from_id' => 'Transfer must reference earlier evidence for this Competency in a separate Session.']);
                }
            }
            $payload = collect($data)->except(['competency_id', 'idempotency_key', 'supersedes_id', 'schema_version'])->all();
            $event = LearningEvidence::query()->create([
                'learner_id' => $session->learner_id,
                'coaching_session_id' => $session->id,
                'competency_id' => $data['competency_id'],
                'recorded_by_id' => $actor->id,
                'client_connection_id' => $client?->id,
                'supersedes_id' => $supersedes?->id,
                'idempotency_key' => $data['idempotency_key'],
                'request_hash' => $hash,
                'schema_version' => 1,
                'evidence' => $payload,
            ]);
            if ($session->status === CoachingSessionStatus::Active) {
                $session->update(['last_active_at' => now()]);
            }

            return $event;
        });
    }

    /** @return array<string, mixed> */
    public static function rules(): array
    {
        return [
            'schema_version' => ['required', 'integer', 'in:1'],
            'idempotency_key' => ['required', 'string', 'max:100'],
            'competency_id' => ['required', 'integer'],
            'activity' => ['required', 'string', 'in:implementation,explanation,debugging,modification,demonstration'],
            'assistance' => ['required', 'string', 'in:review_only,conceptual_hint,guided,scaffolded,solution_provided'],
            'hints_used' => ['required', 'integer', 'min:0', 'max:100'],
            'ownership' => ['required', 'string', 'in:learner,shared,agent'],
            'learner_work' => ['present', 'string', 'max:1000'],
            'agent_work' => ['present', 'string', 'max:1000'],
            'verification' => ['required', 'array:passed,reference'],
            'verification.passed' => ['required', 'boolean'],
            'verification.reference' => ['required', 'string', 'max:1000'],
            'teach_back' => ['required', 'array:demonstrated,summary'],
            'teach_back.demonstrated' => ['required', 'boolean'],
            'teach_back.summary' => ['required', 'string', 'max:1000'],
            'context_key' => ['required', 'string', 'max:100'],
            'context_description' => ['required', 'string', 'max:1000'],
            'transfer_from_id' => ['nullable', 'integer'],
            'material_difference' => ['required_with:transfer_from_id', 'string', 'min:20', 'max:1000'],
            'source' => ['required', 'string', 'in:agent,learner,mentor,automated_check'],
            'supersedes_id' => ['nullable', 'integer'],
            'correction_reason' => ['required_with:supersedes_id', 'string', 'max:1000'],
            'stage' => ['prohibited'],
            'score' => ['prohibited'],
            'learner_id' => ['prohibited'],
        ];
    }
}
