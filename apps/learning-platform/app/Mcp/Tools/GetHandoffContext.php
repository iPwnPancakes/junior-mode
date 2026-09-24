<?php

namespace App\Mcp\Tools;

use App\Actions\BuildHandoffContext;
use App\CoachingSessionStatus;
use App\Models\CoachingSession;
use App\Models\User;
use App\Support\CurrentClientConnection;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Read structured learner-visible handoff context for an active Coaching Session. Show the facts and separately marked hypotheses. Use prepare-handoff to save a private preview for learner review and optional sharing. This never shares, sends messages, or changes progress. Supply only concise observations and artifact references, never source files, conversations, secrets, hidden notes, or personal judgments. Contract version: 1.')]
class GetHandoffContext extends Tool
{
    public function __construct(private CurrentClientConnection $connection, private BuildHandoffContext $build) {}

    public function handle(Request $request): Response|ResponseFactory
    {
        $context = $this->context($request);

        return $context instanceof Response ? $context : Response::structured($context['payload']);
    }

    /** @return array{payload: array<string, mixed>, session: CoachingSession, request_hash: string}|Response */
    protected function context(Request $request): array|Response
    {
        $learner = $request->user();
        $client = $this->connection->get();
        if (! $learner instanceof User || ! $learner->isLearner() || $client?->learner_id !== $learner->id) {
            return Response::error('The authenticated client connection could not be resolved.');
        }

        $data = $request->validate([
            'contract_version' => ['required', 'in:1'],
            'session_id' => ['required', 'integer'],
            'current_understanding' => ['required', 'string', 'max:800'],
            'exact_error_or_unexpected_behavior' => ['required', 'string', 'max:800'],
            'likely_knowledge_gap' => ['required', 'string', 'max:800'],
            'relevant_artifacts' => ['present', 'array', 'max:10'],
            'relevant_artifacts.*' => ['required', 'string', 'max:300'],
            'attempts' => ['required', 'array', 'max:10'],
            'attempts.*' => ['required', 'string', 'max:800'],
            'agent_hypotheses' => ['present', 'array', 'max:5'],
            'agent_hypotheses.*' => ['required', 'string', 'max:800'],
            'mentor_questions' => ['required', 'array', 'min:1', 'max:2'],
            'mentor_questions.*' => ['required', 'string', 'max:800'],
        ]);
        $session = CoachingSession::query()->where('learner_id', $learner->id)
            ->whereKey($data['session_id'])
            ->where('status', CoachingSessionStatus::Active)
            ->whereHas('workItem.enrolledRepository', fn ($query) => $query->where('learner_id', $learner->id)->whereNull('unenrolled_at'))
            ->first();
        if ($session === null) {
            return Response::error('An active Coaching Session in an Enrolled Repository is required.');
        }

        $payload = $this->build->handle($session, $data);

        return ['payload' => $payload, 'session' => $session, 'request_hash' => hash('sha256', json_encode($data, JSON_THROW_ON_ERROR))];
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'contract_version' => $schema->string()->enum(['1'])->required(),
            'session_id' => $schema->integer()->required(),
            'current_understanding' => $schema->string()->required(),
            'exact_error_or_unexpected_behavior' => $schema->string()->required(),
            'likely_knowledge_gap' => $schema->string()->description('A narrow conceptual or syntax gap, explicitly treated as a hypothesis.')->required(),
            'relevant_artifacts' => $schema->array()->items($schema->string())->description('File paths, symbols, issue or commit references only; no content.')->required(),
            'attempts' => $schema->array()->items($schema->string())->required(),
            'agent_hypotheses' => $schema->array()->items($schema->string())->required(),
            'mentor_questions' => $schema->array()->items($schema->string())->required(),
        ];
    }
}
