<?php

use App\Models\ClientConnection;
use App\Models\User;

function identifyClientRequest(): array
{
    return [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/call',
        'params' => [
            'name' => 'identify-client',
            'arguments' => [],
        ],
    ];
}

test('MCP requests require a valid client connection bearer credential', function () {
    $this->postJson('/mcp', identifyClientRequest())
        ->assertUnauthorized()
        ->assertHeader('WWW-Authenticate', 'Bearer realm="mcp", error="invalid_token"');

    $this->withToken('jm_'.str_repeat('x', 64))
        ->postJson('/mcp', identifyClientRequest())
        ->assertUnauthorized();
});

test('an authenticated MCP request resolves its Learner and named client connection', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create([
        'name' => 'Lee Learner',
    ]);
    $accessToken = 'jm_'.str_repeat('a', 64);
    $connection = ClientConnection::factory()->for($learner, 'learner')->create([
        'name' => 'Codex on MacBook',
        'token_hash' => hash('sha256', $accessToken),
        'last_used_at' => null,
    ]);

    $this->withToken($accessToken)
        ->postJson('/mcp', identifyClientRequest())
        ->assertOk()
        ->assertJsonPath('jsonrpc', '2.0')
        ->assertJsonPath('id', 1)
        ->assertJsonPath('result.isError', false)
        ->assertJsonPath('result.structuredContent.learner.id', $learner->id)
        ->assertJsonPath('result.structuredContent.learner.name', 'Lee Learner')
        ->assertJsonPath('result.structuredContent.client.id', $connection->id)
        ->assertJsonPath('result.structuredContent.client.name', 'Codex on MacBook');

    expect($connection->fresh()->last_used_at)->not->toBeNull();
});

test('revoking a client credential stops MCP access immediately', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $accessToken = 'jm_'.str_repeat('b', 64);
    $connection = ClientConnection::factory()->for($learner, 'learner')->create([
        'token_hash' => hash('sha256', $accessToken),
    ]);

    $this->withToken($accessToken)
        ->postJson('/mcp', identifyClientRequest())
        ->assertOk();

    $this->actingAs($learner)
        ->delete(route('client-connections.destroy', $connection))
        ->assertRedirect();

    $this->withToken($accessToken)
        ->postJson('/mcp', identifyClientRequest())
        ->assertUnauthorized();
});

test('a credential cannot authenticate a Mentor as an MCP Learner', function () {
    $mentor = User::factory()->mentor()->create();
    $accessToken = 'jm_'.str_repeat('c', 64);
    ClientConnection::factory()->for($mentor, 'learner')->create([
        'token_hash' => hash('sha256', $accessToken),
    ]);

    $this->withToken($accessToken)
        ->postJson('/mcp', identifyClientRequest())
        ->assertUnauthorized();
});
