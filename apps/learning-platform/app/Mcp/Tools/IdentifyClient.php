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
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Description('Identify the authenticated Learner and named Codex client connection for this MCP session.')]
#[IsReadOnly]
class IdentifyClient extends Tool
{
    public function __construct(private CurrentClientConnection $currentClientConnection) {}

    /**
     * Handle the tool request.
     */
    public function handle(Request $request): Response|ResponseFactory
    {
        $learner = $request->user();
        $clientConnection = $this->currentClientConnection->get();

        if (! $learner instanceof User
            || ! $learner->isLearner()
            || $clientConnection === null
            || $clientConnection->learner_id !== $learner->id) {
            return Response::error('The authenticated client connection could not be resolved.');
        }

        return Response::structured([
            'learner' => [
                'id' => $learner->id,
                'name' => $learner->name,
            ],
            'client' => [
                'id' => $clientConnection->id,
                'name' => $clientConnection->name,
            ],
        ]);
    }

    /**
     * Get the tool's input schema.
     *
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            //
        ];
    }
}
