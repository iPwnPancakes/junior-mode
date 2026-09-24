<?php

use App\CoachingPriorityEmphasis;
use App\Models\ClientConnection;
use App\Models\CoachingPriority;
use App\Models\CoachingSession;
use App\Models\Competency;
use App\Models\EnrolledRepository;
use App\Models\User;
use App\Models\WorkItem;

function coachingToolRequest(string $name, array $arguments): array
{
    return [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/call',
        'params' => ['name' => $name, 'arguments' => $arguments],
    ];
}

function coachingContext(EnrolledRepository $repository, array $overrides = []): array
{
    return [
        'contract_version' => '1',
        'repository_identity' => $repository->identity,
        'title' => 'Validate profile updates',
        'description' => 'Add bounded validation to the profile update endpoint.',
        'external_url' => 'https://github.com/example/project/issues/41',
        'detected_technologies' => ['Laravel'],
        'likely_catalog_branches' => [],
        ...$overrides,
    ];
}

test('MCP returns a compact brief and idempotently starts one Session with one Work Item and objective', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $accessToken = 'jm_'.str_repeat('v', 64);
    $client = ClientConnection::factory()->for($learner, 'learner')->create([
        'name' => 'Codex on laptop',
        'token_hash' => hash('sha256', $accessToken),
    ]);
    $repository = EnrolledRepository::factory()->for($learner, 'learner')->create(['display_name' => 'Profiles']);
    $objective = Competency::factory()->forLearner($learner)->create([
        'name' => 'Request validation',
        'technologies' => ['Laravel'],
    ]);
    CoachingPriority::factory()->create([
        'learner_id' => $learner->id,
        'competency_id' => $objective->id,
        'created_by_id' => $mentor->id,
        'emphasis' => CoachingPriorityEmphasis::High,
    ]);

    $context = coachingContext($repository);
    $this->withToken($accessToken)
        ->postJson('/mcp', coachingToolRequest('get-coaching-brief', $context))
        ->assertOk()
        ->assertJsonPath('result.isError', false)
        ->assertJsonCount(1, 'result.structuredContent.coaching_brief')
        ->assertJsonPath('result.structuredContent.coaching_brief.0.competency_id', $objective->id)
        ->assertJsonMissingPath('result.structuredContent.coaching_brief.0.rationale');

    $startup = [...$context, 'primary_learning_objective_id' => $objective->id];

    foreach ([1, 2] as $requestId) {
        $request = coachingToolRequest('start-coaching-session', $startup);
        $request['id'] = $requestId;

        $this->withToken($accessToken)
            ->postJson('/mcp', $request)
            ->assertOk()
            ->assertJsonPath('result.isError', false)
            ->assertJsonPath('result.structuredContent.session.status', 'active')
            ->assertJsonPath('result.structuredContent.session.primary_learning_objective.id', $objective->id)
            ->assertJsonPath('result.structuredContent.session.client_source.name', $client->name);
    }

    expect(CoachingSession::query()->count())->toBe(1)
        ->and(WorkItem::query()->count())->toBe(1)
        ->and(CoachingSession::query()->sole()->work_item_id)->toBe(WorkItem::query()->sole()->id);
});

test('an unenrolled repository creates no Session and leaves ordinary behavior available', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $accessToken = 'jm_'.str_repeat('w', 64);
    ClientConnection::factory()->for($learner, 'learner')->create(['token_hash' => hash('sha256', $accessToken)]);
    $repository = EnrolledRepository::factory()->for($learner, 'learner')->unenrolled()->create();

    $this->withToken($accessToken)
        ->postJson('/mcp', coachingToolRequest('get-coaching-brief', coachingContext($repository)))
        ->assertOk()
        ->assertJsonPath('result.isError', true);

    expect(CoachingSession::query()->count())->toBe(0)
        ->and(WorkItem::query()->count())->toBe(0);
});

test('MCP rejects an objective outside the current relevance-filtered brief', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $accessToken = 'jm_'.str_repeat('x', 64);
    ClientConnection::factory()->for($learner, 'learner')->create(['token_hash' => hash('sha256', $accessToken)]);
    $repository = EnrolledRepository::factory()->for($learner, 'learner')->create();
    $unrelated = Competency::factory()->forLearner($learner)->create(['name' => 'CSS grid', 'technologies' => ['CSS']]);

    $this->withToken($accessToken)
        ->postJson('/mcp', coachingToolRequest('start-coaching-session', coachingContext($repository, [
            'primary_learning_objective_id' => $unrelated->id,
        ])))
        ->assertOk()
        ->assertJsonPath('result.isError', true);

    expect(CoachingSession::query()->count())->toBe(0);
});
