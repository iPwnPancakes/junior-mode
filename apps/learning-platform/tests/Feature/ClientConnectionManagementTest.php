<?php

use App\Models\ClientConnection;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('a Learner can list only their named client connections without credentials', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $otherLearner = User::factory()->learner($mentor)->create();
    $activeConnection = ClientConnection::factory()->for($learner, 'learner')->create([
        'name' => 'Codex on MacBook',
    ]);
    ClientConnection::factory()->for($learner, 'learner')->revoked()->create([
        'name' => 'Old Codex CLI',
    ]);
    ClientConnection::factory()->for($otherLearner, 'learner')->create([
        'name' => 'Someone else client',
    ]);

    $this->actingAs($learner)
        ->get(route('client-connections.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client-connections/index')
            ->where('viewerRole', 'learner')
            ->has('connections', 2)
            ->has('connections.0', fn (Assert $connection) => $connection
                ->hasAll(['id', 'name', 'status', 'authorizedAt', 'lastUsedAt', 'revokedAt'])
                ->missing('token_hash')
                ->missing('access_token')
            )
            ->where('connections', fn ($connections) => $connections
                ->pluck('name')
                ->contains($activeConnection->name)
                && ! $connections->pluck('name')->contains('Someone else client'))
            ->has('learners', 0)
        );
});

test('a Learner can revoke their connection and repeated revocation is safe', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $connection = ClientConnection::factory()->for($learner, 'learner')->create();

    $this->actingAs($learner)
        ->delete(route('client-connections.destroy', $connection))
        ->assertRedirect(route('client-connections.index'));

    expect($connection->fresh()->revoked_at)->not->toBeNull();

    $this->actingAs($learner)
        ->delete(route('client-connections.destroy', $connection))
        ->assertRedirect(route('client-connections.index'));
});

test('Learners cannot revoke another Learner client and Mentors have read-only visibility', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $otherLearner = User::factory()->learner($mentor)->create();
    $connection = ClientConnection::factory()->for($learner, 'learner')->create();

    $this->actingAs($otherLearner)
        ->delete(route('client-connections.destroy', $connection))
        ->assertForbidden();
    $this->actingAs($mentor)
        ->delete(route('client-connections.destroy', $connection))
        ->assertForbidden();

    expect($connection->fresh()->revoked_at)->toBeNull();
});

test('a Mentor can see named connections for their Learners without credentials', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create([
        'name' => 'Lee Learner',
    ]);
    $connection = ClientConnection::factory()->for($learner, 'learner')->create([
        'name' => 'Codex in VS Code',
    ]);
    $unrelatedMentor = User::factory()->mentor()->create();
    $unrelatedLearner = User::factory()->learner($unrelatedMentor)->create();
    ClientConnection::factory()->for($unrelatedLearner, 'learner')->create([
        'name' => 'Unrelated Codex',
    ]);

    $this->actingAs($mentor)
        ->get(route('client-connections.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client-connections/index')
            ->where('viewerRole', 'mentor')
            ->has('connections', 0)
            ->has('learners', 1)
            ->where('learners.0.id', $learner->id)
            ->where('learners.0.name', 'Lee Learner')
            ->has('learners.0.connections', 1)
            ->where('learners.0.connections.0.id', $connection->id)
            ->where('learners.0.connections.0.name', 'Codex in VS Code')
            ->missing('learners.0.connections.0.token_hash')
            ->missing('learners.0.connections.0.access_token')
        );
});

test('guests cannot manage client connections', function () {
    $connection = ClientConnection::factory()->create();

    $this->get(route('client-connections.index'))->assertRedirect(route('login'));
    $this->delete(route('client-connections.destroy', $connection))->assertRedirect(route('login'));
});
