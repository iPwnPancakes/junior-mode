<?php

namespace App\Actions;

use App\Models\ClientConnection;
use App\Models\CoachingActivityEvent;
use App\Models\CoachingSession;
use App\Models\User;
use App\Support\LearningContract;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class RecordCoachingActivity
{
    public function __construct(private GetSolutionEscapeEligibility $eligibility) {}

    /** @param array<string, mixed> $input */
    public function handle(User $learner, ClientConnection $client, CoachingSession $session, array $input): CoachingActivityEvent
    {
        $this->eligibility->authorize($learner, $client, $session);
        $data = Validator::make($input, self::rules())->validate();
        LearningContract::validateSummaries($data);
        if (isset($data['explicitly_requested'])) {
            $data['explicitly_requested'] = true;
        }
        $hash = LearningContract::hash($data);

        return DB::transaction(function () use ($learner, $client, $session, $data, $hash): CoachingActivityEvent {
            User::query()->whereKey($learner->id)->lockForUpdate()->firstOrFail();
            $session->refresh();
            $existing = CoachingActivityEvent::query()->where('learner_id', $learner->id)->where('idempotency_key', $data['idempotency_key'])->first();
            if ($existing !== null) {
                if ($existing->coaching_session_id !== $session->id || $existing->request_hash !== $hash) {
                    throw ValidationException::withMessages(['idempotency_key' => 'This key was already used for a different coaching activity.']);
                }

                return $existing;
            }
            $this->eligibility->requireActive($session);
            $eligibility = $this->eligibility->handle($learner, $client, $session);
            if ($eligibility['escape_used']) {
                throw ValidationException::withMessages(['kind' => 'The Solution Escape is already recorded. Continue with evidence or complete the Session.']);
            }
            if ($data['kind'] === 'solution_escape' && ! $eligibility['eligible']) {
                throw ValidationException::withMessages(['kind' => 'A Solution Escape requires '.$eligibility['required_hints'].' explicitly requested Hints and an accepted substantive Learner Attempt.']);
            }
            $payload = collect($data)->except(['idempotency_key', 'kind'])->all();
            if ($data['kind'] === 'solution_escape') {
                $payload['required_hints'] = $eligibility['required_hints'];
                $payload['requested_hints'] = $eligibility['requested_hints'];
                $payload['accepted_attempts'] = $eligibility['accepted_attempts'];
            }
            $event = CoachingActivityEvent::query()->create([
                'learner_id' => $learner->id,
                'coaching_session_id' => $session->id,
                'client_connection_id' => $client->id,
                'kind' => $data['kind'],
                'idempotency_key' => $data['idempotency_key'],
                'request_hash' => $hash,
                'payload' => $payload,
            ]);
            $session->update(['last_active_at' => now()]);

            return $event;
        });
    }

    /** @return array<string, mixed> */
    public static function rules(): array
    {
        return [
            'idempotency_key' => ['required', 'string', 'max:100'],
            'kind' => ['required', 'in:hint,accepted_attempt,solution_escape'],
            'summary' => ['required', 'string', 'min:10', 'max:1000'],
            'explicitly_requested' => ['required_if:kind,hint,solution_escape', 'prohibited_unless:kind,hint,solution_escape', 'accepted_if:kind,hint', 'accepted_if:kind,solution_escape'],
            'attempt_kind' => ['required_if:kind,accepted_attempt', 'prohibited_unless:kind,accepted_attempt', 'in:code,diff,pseudocode,debugging_hypothesis'],
            'acceptance_rationale' => ['required_if:kind,accepted_attempt', 'prohibited_unless:kind,accepted_attempt', 'string', 'min:20', 'max:1000'],
            'reason' => ['required_if:kind,solution_escape', 'prohibited_unless:kind,solution_escape', 'in:still_stuck,deadline,blocked_by_environment,other'],
            'explanation' => ['sometimes', 'prohibited_unless:kind,solution_escape', 'string', 'max:1000'],
            'learner_id' => ['prohibited'], 'stage' => ['prohibited'], 'score' => ['prohibited'],
        ];
    }
}
