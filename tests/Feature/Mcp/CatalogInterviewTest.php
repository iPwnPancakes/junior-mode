<?php

use App\BaselineAssessmentLevel;
use App\CatalogProposalStatus;
use App\Models\Assessment;
use App\Models\CatalogProposal;
use App\Models\ClientConnection;
use App\Models\User;

function catalogInterviewRequest(string $tool, array $arguments = []): array
{
    return [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/call',
        'params' => [
            'name' => $tool,
            'arguments' => $arguments,
        ],
    ];
}

function catalogInterviewSubmission(int $proposalId): array
{
    return [
        'proposal_id' => $proposalId,
        'stacks' => ['Rust', 'Axum'],
        'codebases' => ['A command-line data ingestion service'],
        'expected_work' => ['Add reliable parsing and error reporting'],
        'development_goals' => ['Trace ownership and error propagation independently'],
        'nodes' => [
            [
                'key' => 'systems',
                'parent_key' => null,
                'position' => 0,
                'name' => 'Systems programming',
                'definition' => 'Reasoning about data, memory, and control in systems software.',
                'demonstration_criteria' => 'Explains ownership decisions and implements a safe data transformation.',
                'prerequisites' => [],
                'work_opportunities' => ['Parser changes'],
                'technologies' => ['Rust'],
            ],
            [
                'key' => 'errors',
                'parent_key' => 'systems',
                'position' => 0,
                'name' => 'Error propagation',
                'definition' => 'Preserving useful failure context across call boundaries.',
                'demonstration_criteria' => 'Chooses and traces an error path without discarding its cause.',
                'prerequisites' => ['Control flow'],
                'work_opportunities' => ['Parser failures'],
                'technologies' => ['Rust'],
            ],
        ],
        'baseline_assessments' => [
            [
                'node_key' => 'errors',
                'level' => BaselineAssessmentLevel::NotYetObserved->value,
                'rationale' => null,
            ],
        ],
    ];
}

test('Mentor Mode can explicitly begin a stack-neutral catalog interview through MCP', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create(['name' => 'Lee Learner']);
    $accessToken = 'jm_'.str_repeat('d', 64);
    $connection = ClientConnection::factory()->for($learner, 'learner')->create([
        'token_hash' => hash('sha256', $accessToken),
    ]);

    $response = $this->withToken($accessToken)
        ->postJson('/mcp', catalogInterviewRequest('begin-catalog-interview'));

    $response->assertOk()
        ->assertJsonPath('result.isError', false)
        ->assertJsonPath('result.structuredContent.learner.id', $learner->id)
        ->assertJsonPath('result.structuredContent.topics.0.key', 'stacks')
        ->assertJsonPath('result.structuredContent.topics.1.key', 'codebases')
        ->assertJsonPath('result.structuredContent.topics.2.key', 'expected_work')
        ->assertJsonPath('result.structuredContent.topics.3.key', 'development_goals');

    $proposal = CatalogProposal::query()->firstOrFail();

    expect($proposal->learner_id)->toBe($learner->id)
        ->and($proposal->client_connection_id)->toBe($connection->id)
        ->and($proposal->status)->toBe(CatalogProposalStatus::Interviewing);
});

test('MCP submits an editable proposal and separate baseline Assessments without changing approved state', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $accessToken = 'jm_'.str_repeat('e', 64);
    $connection = ClientConnection::factory()->for($learner, 'learner')->create([
        'token_hash' => hash('sha256', $accessToken),
    ]);
    $proposal = CatalogProposal::factory()
        ->for($learner, 'learner')
        ->for($connection, 'clientConnection')
        ->interviewing()
        ->create();

    $this->withToken($accessToken)
        ->postJson('/mcp', catalogInterviewRequest(
            'submit-catalog-proposal',
            catalogInterviewSubmission($proposal->id),
        ))
        ->assertOk()
        ->assertJsonPath('result.isError', false)
        ->assertJsonPath('result.structuredContent.proposal_id', $proposal->id)
        ->assertJsonPath('result.structuredContent.status', 'awaiting_review')
        ->assertJsonPath('result.structuredContent.node_count', 2)
        ->assertJsonPath('result.structuredContent.baseline_assessment_count', 1)
        ->assertJsonPath('result.structuredContent.review_required', true);

    $proposal->refresh();
    $root = $proposal->nodes()->where('name', 'Systems programming')->firstOrFail();
    $child = $proposal->nodes()->where('name', 'Error propagation')->firstOrFail();
    $baseline = $proposal->baselineAssessments()->firstOrFail();

    expect($proposal->status)->toBe(CatalogProposalStatus::AwaitingReview)
        ->and($proposal->interview_context['stacks'])->toBe(['Rust', 'Axum'])
        ->and($child->parent_id)->toBe($root->id)
        ->and($baseline->catalog_proposal_node_id)->toBe($child->id)
        ->and($baseline->level)->toBe(BaselineAssessmentLevel::NotYetObserved)
        ->and($learner->competencies()->count())->toBe(0)
        ->and(Assessment::query()->count())->toBe(0);
});

test('a client cannot submit another connection proposal or resubmit a reviewed proposal', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $accessToken = 'jm_'.str_repeat('f', 64);
    $connection = ClientConnection::factory()->for($learner, 'learner')->create([
        'token_hash' => hash('sha256', $accessToken),
    ]);
    $otherConnection = ClientConnection::factory()->for($learner, 'learner')->create();
    $proposal = CatalogProposal::factory()
        ->for($learner, 'learner')
        ->for($otherConnection, 'clientConnection')
        ->interviewing()
        ->create();

    $this->withToken($accessToken)
        ->postJson('/mcp', catalogInterviewRequest(
            'submit-catalog-proposal',
            catalogInterviewSubmission($proposal->id),
        ))
        ->assertOk()
        ->assertJsonPath('result.isError', true);

    expect($proposal->fresh()->status)->toBe(CatalogProposalStatus::Interviewing)
        ->and($proposal->nodes()->count())->toBe(0);

    $ownedProposal = CatalogProposal::factory()
        ->for($learner, 'learner')
        ->for($connection, 'clientConnection')
        ->interviewing()
        ->create();

    $this->withToken($accessToken)
        ->postJson('/mcp', catalogInterviewRequest(
            'submit-catalog-proposal',
            catalogInterviewSubmission($ownedProposal->id),
        ))
        ->assertOk()
        ->assertJsonPath('result.isError', false);

    $this->withToken($accessToken)
        ->postJson('/mcp', catalogInterviewRequest(
            'submit-catalog-proposal',
            catalogInterviewSubmission($ownedProposal->id),
        ))
        ->assertOk()
        ->assertJsonPath('result.isError', true);

    expect($ownedProposal->fresh()->status)->toBe(CatalogProposalStatus::AwaitingReview)
        ->and($ownedProposal->nodes()->count())->toBe(2);
});
