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

#[Description('Read the authenticated Learner’s evidence-derived independence stages, supporting observations, assistance trend and next challenge. Mentor assessments are separate judgments. Contract version 1.')]
class GetProgress extends Tool
{
    public function handle(Request $request, CurrentClientConnection $connection, BuildLearningProgress $progress): Response|ResponseFactory
    {
        $learner = $request->user();
        if (! $learner instanceof User || ! $learner->isLearner() || $connection->get()?->learner_id !== $learner->id) {
            return Response::error('The authenticated client connection could not be resolved.');
        }
        $data = $request->validate(['contract_version' => ['required', 'in:1'], 'competency_id' => ['nullable', 'integer'], 'learner_id' => ['prohibited']]);
        if (isset($data['competency_id']) && ! $learner->competencies()->whereKey($data['competency_id'])->exists()) {
            return Response::error('The Competency is not in this Learner’s catalog.');
        }

        return Response::structured($progress->handle($learner, $data['competency_id'] ?? null));
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return ['contract_version' => $schema->string()->enum(['1'])->required(), 'competency_id' => $schema->integer()->nullable()];
    }
}
