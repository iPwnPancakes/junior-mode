<?php

namespace App\Mcp\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;

#[Description('Save a private immutable handoff preview from concise session observations. This is a separate explicit persistence action after get-handoff-context. It never shares or changes progress. Show the returned preview and direct the Learner to preview_url, where only they can choose to share with their named Mentor. Contract version: 1.')]
class PrepareHandoff extends GetHandoffContext
{
    public function handle(Request $request): Response|ResponseFactory
    {
        $data = $request->validate(['idempotency_key' => ['required', 'string', 'max:100']]);
        $context = $this->context($request);
        if ($context instanceof Response) {
            return $context;
        }

        $snapshot = app(\App\Actions\PrepareHandoff::class)->handle($context['session'], $context['payload'], $context['request_hash'], $data['idempotency_key']);

        return Response::structured([
            ...$snapshot->payload,
            'handoff_id' => $snapshot->id,
            'shared' => $snapshot->shared_at !== null,
            'preview_url' => route('handoffs.show', $snapshot),
            'sharing_instruction' => 'Show this preview to the Learner. Only the Learner can share it from the preview page after reviewing the exact snapshot and named Mentor. No messages are sent.',
        ]);
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [...parent::schema($schema), 'idempotency_key' => $schema->string()->description('Stable key for this exact preview request; reuse on retries.')->required()];
    }
}
