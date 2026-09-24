<?php

namespace App\Mcp\Tools;

use App\Actions\BuildLearningProgress;
use App\Models\User;
use App\Support\CurrentClientConnection;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Append concise verified learning evidence or an authorized correction. Never send raw chats, source files, secrets, stage, or score. Schema version 1. A retry must use the same idempotency key and payload.')]
class RecordLearningEvidence extends Tool
{
    public function handle(Request $request, CurrentClientConnection $connection, \App\Actions\RecordLearningEvidence $record, BuildLearningProgress $progress): Response|ResponseFactory
    {
        $learner = $request->user();
        $client = $connection->get();
        if (! $learner instanceof User || ! $learner->isLearner() || $client?->learner_id !== $learner->id) {
            return Response::error('The authenticated client connection could not be resolved.');
        }
        $data = $request->validate(['session_id' => ['required', 'integer'], ...\App\Actions\RecordLearningEvidence::rules()]);
        $session = $learner->coachingSessions()->find($data['session_id']);
        if ($session === null) {
            return Response::error('The Session could not be resolved.');
        }
        unset($data['session_id']);
        $event = $record->handle($learner, $session, $data, $client);

        return Response::structured(['contract_version' => '1', 'evidence_id' => $event->id, 'session_id' => $session->id, 'progress' => $progress->handle($learner, $session->primary_learning_objective_id)]);
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'session_id' => $schema->integer()->required(),
            'schema_version' => $schema->integer()->enum([1])->required(),
            'idempotency_key' => $schema->string()->required(),
            'competency_id' => $schema->integer()->required(),
            'activity' => $schema->string()->enum(['implementation', 'explanation', 'debugging', 'modification', 'demonstration'])->required(),
            'assistance' => $schema->string()->enum(['review_only', 'conceptual_hint', 'guided', 'scaffolded', 'solution_provided'])->required(),
            'hints_used' => $schema->integer()->required(),
            'ownership' => $schema->string()->enum(['learner', 'shared', 'agent'])->required(),
            'learner_work' => $schema->string()->description('Concise factual description of the learner-owned portion; empty for agent-only work.')->required(),
            'agent_work' => $schema->string()->required(),
            'verification' => $schema->object(['passed' => $schema->boolean()->required(), 'reference' => $schema->string()->required()])->required(),
            'teach_back' => $schema->object(['demonstrated' => $schema->boolean()->required(), 'summary' => $schema->string()->required()])->required(),
            'context_key' => $schema->string()->description('Stable context identifier. Reuse it for the same context.')->required(),
            'context_description' => $schema->string()->description('Explain the work context and its material differences from earlier tasks.')->required(),
            'transfer_from_id' => $schema->integer()->description('Earlier evidence ID demonstrating independence on a separate task in a different context.')->nullable(),
            'material_difference' => $schema->string()->description('Required with transfer_from_id: explain concretely why this context requires applying understanding differently.'),
            'source' => $schema->string()->enum(['agent', 'automated_check'])->required(),
            'supersedes_id' => $schema->integer()->nullable(),
            'correction_reason' => $schema->string(),
        ];
    }
}
