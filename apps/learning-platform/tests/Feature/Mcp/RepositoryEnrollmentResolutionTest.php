<?php

use App\Models\ClientConnection;
use App\Models\EnrolledRepository;
use App\Models\User;

function repositoryEnrollmentRequest(array $arguments): array
{
    return [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/call',
        'params' => [
            'name' => 'resolve-repository-enrollment',
            'arguments' => $arguments,
        ],
    ];
}

test('authenticated MCP resolves equivalent clone remotes to one enrolled repository', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $accessToken = 'jm_'.str_repeat('r', 64);
    ClientConnection::factory()->for($learner, 'learner')->create([
        'token_hash' => hash('sha256', $accessToken),
    ]);
    $repository = EnrolledRepository::factory()
        ->for($learner, 'learner')
        ->withRemote('github.com/openai/codex')
        ->create(['display_name' => 'Codex']);

    foreach (['git@github.com:OpenAI/Codex.git', 'https://github.com/openai/codex.git'] as $remote) {
        $this->withToken($accessToken)
            ->postJson('/mcp', repositoryEnrollmentRequest([
                'contract_version' => '1',
                'remote_url' => $remote,
            ]))
            ->assertOk()
            ->assertJsonPath('result.isError', false)
            ->assertJsonPath('result.structuredContent.contract_version', '1')
            ->assertJsonPath('result.structuredContent.enrolled', true)
            ->assertJsonPath('result.structuredContent.normalized_remote', 'github.com/openai/codex')
            ->assertJsonPath('result.structuredContent.repository.identity', $repository->identity)
            ->assertJsonPath('result.structuredContent.repository.display_name', 'Codex');
    }
});

test('MCP resolves a remote-less repository by its stable generated identity', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $accessToken = 'jm_'.str_repeat('s', 64);
    ClientConnection::factory()->for($learner, 'learner')->create([
        'token_hash' => hash('sha256', $accessToken),
    ]);
    $repository = EnrolledRepository::factory()->for($learner, 'learner')->create([
        'display_name' => 'Local sandbox',
        'local_path' => '/renamed/sandbox',
    ]);

    $this->withToken($accessToken)
        ->postJson('/mcp', repositoryEnrollmentRequest([
            'contract_version' => '1',
            'repository_identity' => $repository->identity,
        ]))
        ->assertOk()
        ->assertJsonPath('result.structuredContent.enrolled', true)
        ->assertJsonPath('result.structuredContent.normalized_remote', null)
        ->assertJsonPath('result.structuredContent.repository.identity', $repository->identity)
        ->assertJsonPath('result.structuredContent.repository.local_path', '/renamed/sandbox');
});

test('unenrolled and unknown repositories stop future Junior Mode tracking without leaking ownership', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $otherLearner = User::factory()->learner($mentor)->create();
    $accessToken = 'jm_'.str_repeat('t', 64);
    ClientConnection::factory()->for($learner, 'learner')->create([
        'token_hash' => hash('sha256', $accessToken),
    ]);
    $unenrolledRepository = EnrolledRepository::factory()
        ->for($learner, 'learner')
        ->unenrolled()
        ->create();
    $otherRepository = EnrolledRepository::factory()->for($otherLearner, 'learner')->create();

    $this->withToken($accessToken)
        ->postJson('/mcp', repositoryEnrollmentRequest([
            'contract_version' => '1',
            'repository_identity' => $unenrolledRepository->identity,
        ]))
        ->assertOk()
        ->assertJsonPath('result.structuredContent.enrolled', false)
        ->assertJsonPath('result.structuredContent.repository.identity', $unenrolledRepository->identity);

    $this->withToken($accessToken)
        ->postJson('/mcp', repositoryEnrollmentRequest([
            'contract_version' => '1',
            'repository_identity' => $otherRepository->identity,
        ]))
        ->assertOk()
        ->assertJsonPath('result.structuredContent.enrolled', false)
        ->assertJsonPath('result.structuredContent.repository', null);
});

test('MCP rejects unsupported contract versions and missing repository identifiers', function (array $arguments) {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $accessToken = 'jm_'.str_repeat('u', 64);
    ClientConnection::factory()->for($learner, 'learner')->create([
        'token_hash' => hash('sha256', $accessToken),
    ]);

    $this->withToken($accessToken)
        ->postJson('/mcp', repositoryEnrollmentRequest($arguments))
        ->assertOk()
        ->assertJsonPath('result.isError', true);
})->with([
    'unsupported version' => [['contract_version' => '2', 'remote_url' => 'https://github.com/openai/codex']],
    'missing identity' => [['contract_version' => '1']],
]);
