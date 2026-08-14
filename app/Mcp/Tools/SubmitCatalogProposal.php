<?php

namespace App\Mcp\Tools;

use App\Actions\SubmitCatalogProposal as SubmitCatalogProposalAction;
use App\BaselineAssessmentLevel;
use App\Models\CatalogProposal;
use App\Models\User;
use App\Support\CurrentClientConnection;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Submit the completed Mentor interview as an editable Catalog Proposal with optional, separately reviewable baseline Assessments.')]
class SubmitCatalogProposal extends Tool
{
    public function __construct(
        private CurrentClientConnection $currentClientConnection,
        private SubmitCatalogProposalAction $submitCatalogProposal,
    ) {}

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

        $validated = $request->validate([
            'proposal_id' => ['required', 'integer'],
            'stacks' => ['required', 'array', 'min:1', 'max:30'],
            'stacks.*' => ['required', 'string', 'max:200'],
            'codebases' => ['required', 'array', 'min:1', 'max:30'],
            'codebases.*' => ['required', 'string', 'max:500'],
            'expected_work' => ['required', 'array', 'min:1', 'max:30'],
            'expected_work.*' => ['required', 'string', 'max:500'],
            'development_goals' => ['required', 'array', 'min:1', 'max:30'],
            'development_goals.*' => ['required', 'string', 'max:500'],
            'nodes' => ['required', 'array', 'min:1', 'max:200'],
            'nodes.*' => ['required', 'array:key,parent_key,position,name,definition,demonstration_criteria,prerequisites,work_opportunities,technologies'],
            'nodes.*.key' => ['required', 'string', 'max:100'],
            'nodes.*.parent_key' => ['nullable', 'string', 'max:100'],
            'nodes.*.position' => ['required', 'integer', 'min:0'],
            'nodes.*.name' => ['required', 'string', 'max:120'],
            'nodes.*.definition' => ['required', 'string', 'max:2000'],
            'nodes.*.demonstration_criteria' => ['required', 'string', 'max:4000'],
            'nodes.*.prerequisites' => ['nullable', 'array', 'max:30'],
            'nodes.*.prerequisites.*' => ['required', 'string', 'max:200'],
            'nodes.*.work_opportunities' => ['nullable', 'array', 'max:30'],
            'nodes.*.work_opportunities.*' => ['required', 'string', 'max:300'],
            'nodes.*.technologies' => ['nullable', 'array', 'max:30'],
            'nodes.*.technologies.*' => ['required', 'string', 'max:200'],
            'baseline_assessments' => ['present', 'array', 'max:200'],
            'baseline_assessments.*' => ['required', 'array:node_key,level,rationale'],
            'baseline_assessments.*.node_key' => ['required', 'string', 'max:100'],
            'baseline_assessments.*.level' => ['required', Rule::enum(BaselineAssessmentLevel::class)],
            'baseline_assessments.*.rationale' => ['nullable', 'string', 'max:2000'],
        ]);

        $catalogProposal = CatalogProposal::query()->find($request->integer('proposal_id'));

        if ($catalogProposal === null) {
            return Response::error('The Catalog Proposal could not be found.');
        }

        $catalogProposal = $this->submitCatalogProposal->handle(
            $learner,
            $clientConnection,
            $catalogProposal,
            $validated,
        );

        return Response::structured([
            'proposal_id' => $catalogProposal->id,
            'status' => $catalogProposal->status->value,
            'node_count' => $catalogProposal->nodes->count(),
            'baseline_assessment_count' => $catalogProposal->baselineAssessments->count(),
            'review_required' => true,
        ]);
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        $stringList = fn (string $description): Type => $schema->array()
            ->items($schema->string())
            ->min(1)
            ->description($description)
            ->required();

        return [
            'proposal_id' => $schema->integer()->description('ID returned by begin-catalog-interview.')->required(),
            'stacks' => $stringList('Languages, frameworks, tools, and platforms named by the Mentor.'),
            'codebases' => $stringList('Relevant codebases and their purposes.'),
            'expected_work' => $stringList('Expected near-term work.'),
            'development_goals' => $stringList('The Learner development goals described by the Mentor.'),
            'nodes' => $schema->array()->items($schema->object([
                'key' => $schema->string()->description('Unique submission-local node key.')->required(),
                'parent_key' => $schema->string()->description('Parent node key, or null for a root.')->nullable(),
                'position' => $schema->integer()->description('Zero-based sibling order.')->required(),
                'name' => $schema->string()->required(),
                'definition' => $schema->string()->required(),
                'demonstration_criteria' => $schema->string()->description('Observable behavior that demonstrates this Competency.')->required(),
                'prerequisites' => $schema->array()->items($schema->string())->nullable(),
                'work_opportunities' => $schema->array()->items($schema->string())->nullable(),
                'technologies' => $schema->array()->items($schema->string())->nullable(),
            ])->withoutAdditionalProperties())->min(1)->required(),
            'baseline_assessments' => $schema->array()->items($schema->object([
                'node_key' => $schema->string()->required(),
                'level' => $schema->string()->enum(BaselineAssessmentLevel::class)->required(),
                'rationale' => $schema->string()->description('Direct supporting evidence; omit unsupported guesses.')->nullable(),
            ])->withoutAdditionalProperties())->description('Optional baseline Assessments proposed independently from catalog approval.')->required(),
        ];
    }
}
