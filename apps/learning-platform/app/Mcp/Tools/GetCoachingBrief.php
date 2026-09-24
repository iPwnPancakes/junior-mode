<?php

namespace App\Mcp\Tools;

use App\Actions\BuildCoachingBrief;
use App\Actions\BuildLearningProgress;
use App\CoachingSessionStatus;
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

#[Description('Return a deterministic, compact Coaching Brief for a sanitized Work Item in an Enrolled Repository. Contract version: 1.')]
class GetCoachingBrief extends Tool
{
    public function __construct(
        private CurrentClientConnection $currentClientConnection,
        private BuildCoachingBrief $buildCoachingBrief,
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

        $context = [
            'title' => $validated['title'],
            'description' => $validated['description'],
            'detected_technologies' => $validated['detected_technologies'],
            'likely_catalog_branches' => $validated['likely_catalog_branches'],
        ];
        $brief = $this->buildCoachingBrief->handle($learner, $context);
        $progress = collect(app(BuildLearningProgress::class)->handle($learner)['competencies'])->keyBy('competency_id');
        $brief = array_map(fn (array $entry): array => [...$entry, 'learning_progress' => array_intersect_key($progress->get($entry['competency_id'], []), array_flip(['stage', 'has_evidence', 'suggested_support', 'next_stage_requirement']))], $brief);

        return Response::structured([
            'contract_version' => '1',
            'repository' => ['identity' => $repository->identity, 'display_name' => $repository->display_name],
            'work_item' => [
                'title' => $validated['title'],
                'description' => $validated['description'],
                'external_url' => $validated['external_url'] ?? null,
            ],
            'coaching_brief' => $brief,
            'active_sessions' => $learner->coachingSessions()->where('status', CoachingSessionStatus::Active)->whereHas('workItem', fn ($query) => $query->where('enrolled_repository_id', $repository->id))->with('workItem')->get()->map(fn ($session): array => ['id' => $session->id, 'work_item' => ['title' => $session->workItem->title, 'description' => $session->workItem->description, 'external_url' => $session->workItem->external_url], 'primary_learning_objective_id' => $session->primary_learning_objective_id, 'desired_outcome' => $session->desired_outcome, 'acceptance_criteria' => $session->acceptance_criteria, 'responsibility_split' => $session->responsibility_split])->all(),
            'session_instruction' => 'Resume a matching active Session by ID. Start a new Session only for a different Work Item or objective; preserve the idempotency key when retrying startup.',
            'selection_instruction' => $brief === []
                ? 'No relevant Learning Objective was found. Continue without starting a Coaching Session.'
                : 'Choose exactly one relevant entry as the primary Learning Objective.',
        ]);
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'contract_version' => $schema->string()->enum(['1'])->required(),
            'repository_identity' => $schema->string()->description('Stable UUID returned by resolve-repository-enrollment.')->required(),
            'title' => $schema->string()->description('Sanitized Work Item title; never include code, secrets, or conversation history.')->required(),
            'description' => $schema->string()->description('Sanitized Work Item description, limited to the task intent and constraints.')->required(),
            'external_url' => $schema->string()->description('Optional issue or task URL.')->nullable(),
            'detected_technologies' => $schema->array()->items($schema->string())->description('Detected technologies relevant to this Work Item.')->required(),
            'likely_catalog_branches' => $schema->array()->items($schema->integer())->description('Likely relevant Competency Catalog node IDs, if known.')->required(),
        ];
    }

    /** @return array<string, array<int, mixed>> */
    private function rules(): array
    {
        return [
            'contract_version' => ['required', 'string', 'in:1'],
            'repository_identity' => ['required', 'uuid'],
            'title' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string', 'max:2000'],
            'external_url' => ['nullable', 'url:http,https', 'max:2048'],
            'detected_technologies' => ['present', 'array', 'max:20'],
            'detected_technologies.*' => ['required', 'string', 'max:100', 'distinct'],
            'likely_catalog_branches' => ['present', 'array', 'max:20'],
            'likely_catalog_branches.*' => ['required', 'integer', 'distinct'],
        ];
    }
}
