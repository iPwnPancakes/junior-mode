<?php

namespace App\Mcp\Tools;

use App\Actions\StartCoachingSession as StartCoachingSessionAction;
use App\Models\CoachingSession;
use App\Models\EnrolledRepository;
use App\Models\User;
use App\Support\CurrentClientConnection;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Start or continue one Coaching Session after choosing exactly one primary Learning Objective from the current Coaching Brief. Contract versions: 1 (legacy), 2 (Help Me with explicit ownership and idempotency). Prefer version 2.')]
class StartCoachingSession extends Tool
{
    public function __construct(
        private CurrentClientConnection $currentClientConnection,
        private StartCoachingSessionAction $startCoachingSession,
    ) {}

    public function handle(Request $request): Response|ResponseFactory
    {
        $learner = $request->user();
        $clientConnection = $this->currentClientConnection->get();

        if (! $learner instanceof User || ! $learner->isLearner() || $clientConnection?->learner_id !== $learner->id) {
            return Response::error('The authenticated client connection could not be resolved.');
        }

        $validated = $request->validate($this->rules());
        $repository = $learner->enrolledRepositories()
            ->where('identity', $validated['repository_identity'])
            ->whereNull('unenrolled_at')
            ->first();

        if (! $repository instanceof EnrolledRepository) {
            return Response::error('Junior Mode is not active because this repository is not enrolled.');
        }

        $objective = $learner->competencies()
            ->whereNull('archived_at')
            ->whereNull('merged_into_id')
            ->whereKey($validated['primary_learning_objective_id'])
            ->first();

        if ($objective === null) {
            return Response::error('The selected Learning Objective is not in this Learner\'s active Competency Catalog.');
        }

        $context = [
            'title' => $validated['title'],
            'description' => $validated['description'],
            'external_url' => $validated['external_url'] ?? null,
            'detected_technologies' => $validated['detected_technologies'],
            'likely_catalog_branches' => $validated['likely_catalog_branches'],
            ...array_intersect_key($validated, array_flip(['idempotency_key', 'desired_outcome', 'acceptance_criteria', 'responsibility_split'])),
        ];
        $session = $this->startCoachingSession->handle(
            $learner,
            $clientConnection,
            $repository,
            $objective,
            $context,
        );

        return Response::structured($this->serializeSession($session));
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'contract_version' => $schema->string()->enum(['1', '2'])->required(),
            'idempotency_key' => $schema->string()->description('Required in version 2; retry exactly the same request with the same key.'),
            'desired_outcome' => $schema->string(),
            'acceptance_criteria' => $schema->array()->items($schema->string()),
            'responsibility_split' => $schema->object(['agent' => $schema->string()->required(), 'learner' => $schema->string()->required()]),
            'repository_identity' => $schema->string()->required(),
            'title' => $schema->string()->description('The unchanged sanitized Work Item title used for the Coaching Brief.')->required(),
            'description' => $schema->string()->description('The unchanged sanitized Work Item description used for the Coaching Brief.')->required(),
            'external_url' => $schema->string()->nullable(),
            'detected_technologies' => $schema->array()->items($schema->string())->required(),
            'likely_catalog_branches' => $schema->array()->items($schema->integer())->required(),
            'primary_learning_objective_id' => $schema->integer()->description('Exactly one Competency ID selected from the current Coaching Brief.')->required(),
        ];
    }

    /** @return array<string, array<int, mixed>> */
    private function rules(): array
    {
        return [
            'contract_version' => ['required', 'string', 'in:1,2'],
            'idempotency_key' => ['required_if:contract_version,2', 'string', 'max:100'],
            'desired_outcome' => ['required_if:contract_version,2', 'string', 'max:1000'],
            'acceptance_criteria' => ['required_if:contract_version,2', 'array', 'min:1', 'max:10'],
            'acceptance_criteria.*' => ['required', 'string', 'max:500'],
            'responsibility_split' => ['required_if:contract_version,2', 'array:agent,learner'],
            'responsibility_split.agent' => ['required_with:responsibility_split', 'string', 'max:1000'],
            'responsibility_split.learner' => ['required_with:responsibility_split', 'string', 'max:1000'],
            'stage' => ['prohibited'], 'score' => ['prohibited'], 'learner_id' => ['prohibited'],
            'repository_identity' => ['required', 'uuid'],
            'title' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string', 'max:2000'],
            'external_url' => ['nullable', 'url:http,https', 'max:2048'],
            'detected_technologies' => ['present', 'array', 'max:20'],
            'detected_technologies.*' => ['required', 'string', 'max:100', 'distinct'],
            'likely_catalog_branches' => ['present', 'array', 'max:20'],
            'likely_catalog_branches.*' => ['required', 'integer', 'distinct'],
            'primary_learning_objective_id' => ['required', 'integer'],
        ];
    }

    /** @return array<string, mixed> */
    private function serializeSession(CoachingSession $session): array
    {
        return [
            'contract_version' => $session->idempotency_key === null ? '1' : '2',
            'session' => [
                'id' => $session->id,
                'status' => $session->status->value,
                'desired_outcome' => $session->desired_outcome,
                'acceptance_criteria' => $session->acceptance_criteria,
                'responsibility_split' => $session->responsibility_split,
                'work_item' => [
                    'title' => $session->workItem->title,
                    'description' => $session->workItem->description,
                    'external_url' => $session->workItem->external_url,
                ],
                'repository' => [
                    'identity' => $session->workItem->enrolledRepository->identity,
                    'display_name' => $session->workItem->enrolledRepository->display_name,
                ],
                'primary_learning_objective' => [
                    'id' => $session->primaryLearningObjective->id,
                    'name' => $session->primaryLearningObjective->name,
                    'reason' => 'Selected by Codex from the relevance-filtered Coaching Brief.',
                ],
                'client_source' => [
                    'id' => $session->clientConnection->id,
                    'name' => $session->clientConnection->name,
                ],
            ],
            'coaching_instruction' => 'Explain why the objective matters, complete routine scaffolding, and reserve one bounded achievable change for the Learner.',
        ];
    }
}
