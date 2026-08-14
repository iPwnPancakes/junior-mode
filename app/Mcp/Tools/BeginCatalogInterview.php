<?php

namespace App\Mcp\Tools;

use App\Actions\BeginCatalogInterview as BeginCatalogInterviewAction;
use App\Models\User;
use App\Support\CurrentClientConnection;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Begin a stack-neutral Mentor Mode interview for the connected Learner and return the required interview topics.')]
class BeginCatalogInterview extends Tool
{
    public function __construct(
        private CurrentClientConnection $currentClientConnection,
        private BeginCatalogInterviewAction $beginCatalogInterview,
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

        $catalogProposal = $this->beginCatalogInterview->handle($learner, $clientConnection);

        return Response::structured([
            'proposal_id' => $catalogProposal->id,
            'learner' => [
                'id' => $learner->id,
                'name' => $learner->name,
            ],
            'topics' => [
                [
                    'key' => 'stacks',
                    'prompt' => 'Which languages, frameworks, tools, and platforms are relevant to this Learner?',
                ],
                [
                    'key' => 'codebases',
                    'prompt' => 'Which codebases does the Learner work in, and what kinds of systems are they?',
                ],
                [
                    'key' => 'expected_work',
                    'prompt' => 'What work is the Learner expected to complete in the near term?',
                ],
                [
                    'key' => 'development_goals',
                    'prompt' => 'What understanding, autonomy, and engineering judgment should the Learner develop?',
                ],
            ],
            'instructions' => 'Interview the Mentor before proposing nodes. Prefer not yet observed when baseline proficiency is not directly supported.',
        ]);
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
