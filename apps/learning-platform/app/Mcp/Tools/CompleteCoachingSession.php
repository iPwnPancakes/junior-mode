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

#[Description('Conclude an owned Coaching Session with a concise outcome, reflection, unresolved questions and next challenge; return the learning receipt. Completion does not itself advance progress. Contract version 1.')]
class CompleteCoachingSession extends Tool
{
    public function handle(Request $request, CurrentClientConnection $connection, \App\Actions\CompleteCoachingSession $complete, BuildLearningProgress $progress): Response|ResponseFactory
    {
        $learner = $request->user();
        if (! $learner instanceof User || ! $learner->isLearner() || $connection->get()?->learner_id !== $learner->id) {
            return Response::error('The authenticated client connection could not be resolved.');
        }
        $data = $request->validate(['session_id' => ['required', 'integer'], 'contract_version' => ['required', 'in:1']]);
        $session = $learner->coachingSessions()->whereKey($data['session_id'])->first();
        if ($session === null) {
            return Response::error('The Session could not be resolved.');
        }
        $session = $complete->handle($learner, $session, $request->all());

        return Response::structured(['contract_version' => '1', 'session_id' => $session->id, 'status' => $session->status->value, 'receipt' => $session->completion, 'progress' => $progress->handle($learner, $session->primary_learning_objective_id)]);
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'contract_version' => $schema->string()->enum(['1'])->required(),
            'session_id' => $schema->integer()->required(),
            'idempotency_key' => $schema->string()->required(),
            'outcome' => $schema->string()->required(),
            'reflection' => $schema->string()->required(),
            'unresolved_questions' => $schema->array()->items($schema->string())->required(),
            'next_challenge' => $schema->string()->required(),
        ];
    }
}
