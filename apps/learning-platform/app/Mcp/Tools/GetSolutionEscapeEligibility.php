<?php

namespace App\Mcp\Tools;

use App\Models\User;
use App\Support\CurrentClientConnection;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Read server-owned Solution Escape eligibility and concise activity history for an owned Coaching Session. A complete solution requires can_provide_solution=true after an explicit recorded escape. Contract version 1.')]
class GetSolutionEscapeEligibility extends Tool
{
    public function __construct(private CurrentClientConnection $connection, private \App\Actions\GetSolutionEscapeEligibility $eligibility) {}

    public function handle(Request $request): Response|ResponseFactory
    {
        $learner = $request->user();
        $client = $this->connection->get();
        if (! $learner instanceof User || ! $learner->isLearner() || $client?->learner_id !== $learner->id) {
            return Response::error('The authenticated client connection could not be resolved.');
        }
        $data = $request->validate(['contract_version' => ['required', 'in:1'], 'session_id' => ['required', 'integer'], 'learner_id' => ['prohibited']]);
        $session = $learner->coachingSessions()->whereKey($data['session_id'])->first();
        if ($session === null) {
            return Response::error('The Session could not be resolved.');
        }

        return Response::structured(['contract_version' => '1', 'session_id' => $session->id, 'eligibility' => $this->eligibility->handle($learner, $client, $session)]);
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return ['contract_version' => $schema->string()->enum(['1'])->required(), 'session_id' => $schema->integer()->required()];
    }
}
