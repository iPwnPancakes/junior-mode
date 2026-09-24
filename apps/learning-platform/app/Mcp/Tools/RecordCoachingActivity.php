<?php

namespace App\Mcp\Tools;

use App\Actions\GetSolutionEscapeEligibility;
use App\Models\User;
use App\Support\CurrentClientConnection;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Append an explicitly requested Hint, an accepted substantive Learner Attempt with rationale, or an explicitly requested Solution Escape. Never count clarification/feedback as a Hint or accept an unrelated/non-substantive attempt. Escape eligibility is enforced by the server. Keep summaries concise without source code, transcripts or secrets. Contract version 1.')]
class RecordCoachingActivity extends Tool
{
    public function __construct(private CurrentClientConnection $connection, private \App\Actions\RecordCoachingActivity $record, private GetSolutionEscapeEligibility $eligibility) {}

    public function handle(Request $request): Response|ResponseFactory
    {
        $learner = $request->user();
        $client = $this->connection->get();
        if (! $learner instanceof User || ! $learner->isLearner() || $client?->learner_id !== $learner->id) {
            return Response::error('The authenticated client connection could not be resolved.');
        }
        $data = $request->validate(['contract_version' => ['required', 'in:1'], 'session_id' => ['required', 'integer'], ...\App\Actions\RecordCoachingActivity::rules()]);
        $session = $learner->coachingSessions()->whereKey($data['session_id'])->first();
        if ($session === null) {
            return Response::error('The Session could not be resolved.');
        }
        unset($data['session_id'], $data['contract_version']);
        $event = $this->record->handle($learner, $client, $session, $data);

        return Response::structured(['contract_version' => '1', 'event_id' => $event->id, 'session_id' => $session->id, 'eligibility' => $this->eligibility->handle($learner, $client, $session)]);
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'contract_version' => $schema->string()->enum(['1'])->required(),
            'session_id' => $schema->integer()->required(),
            'idempotency_key' => $schema->string()->required(),
            'kind' => $schema->string()->enum(['hint', 'accepted_attempt', 'solution_escape'])->required(),
            'summary' => $schema->string()->required(),
            'explicitly_requested' => $schema->boolean()->description('Must be true for a Hint or Solution Escape explicitly requested by the Learner.'),
            'attempt_kind' => $schema->string()->enum(['code', 'diff', 'pseudocode', 'debugging_hypothesis']),
            'acceptance_rationale' => $schema->string()->description('Required for accepted_attempt: explain how the Learner substantively engaged with the reserved work.'),
            'reason' => $schema->string()->enum(['still_stuck', 'deadline', 'blocked_by_environment', 'other']),
            'explanation' => $schema->string(),
        ];
    }
}
