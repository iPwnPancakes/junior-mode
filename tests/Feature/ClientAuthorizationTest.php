<?php

use App\Models\ClientAuthorization;
use App\Models\ClientConnection;
use App\Models\User;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

test('a Codex client can request a short-lived browser authorization', function () {
    $response = $this->postJson(route('client-authorizations.store'), [
        'name' => 'Codex on MacBook',
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('expires_in', 600)
        ->assertJsonPath('interval', 2)
        ->assertJsonStructure([
            'device_code',
            'user_code',
            'authorization_url',
            'token_url',
        ]);

    $authorization = ClientAuthorization::query()->sole();
    $deviceCode = $response->json('device_code');
    $userCode = $response->json('user_code');

    expect($authorization)
        ->name->toBe('Codex on MacBook')
        ->device_code_hash->toBe(hash('sha256', $deviceCode))
        ->user_code_hash->toBe(hash('sha256', $userCode))
        ->approved_at->toBeNull()
        ->exchanged_at->toBeNull()
        ->and($authorization->expires_at->isSameSecond(now()->addMinutes(10)))->toBeTrue()
        ->and($authorization->getRawOriginal('device_code_hash'))->not->toContain($deviceCode)
        ->and($response->json('authorization_url'))->toBe(
            route('client-authorizations.approval.show', $userCode),
        )
        ->and($response->json('token_url'))->toBe(route('client-authorizations.token'));
});

test('authorization requests require a human-readable client name', function () {
    $this->postJson(route('client-authorizations.store'), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');

    $this->postJson(route('client-authorizations.store'), [
        'name' => Str::random(101),
    ])->assertUnprocessable()->assertJsonValidationErrors('name');
});

test('a signed-in Learner can review and approve a named client without seeing its credential', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $userCode = 'ABCD-2345';
    $authorization = ClientAuthorization::factory()->create([
        'name' => 'Codex in VS Code',
        'user_code_hash' => hash('sha256', $userCode),
    ]);

    $this->actingAs($learner)
        ->get(route('client-authorizations.approval.show', $userCode))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client-authorizations/show')
            ->where('clientName', 'Codex in VS Code')
            ->where('userCode', $userCode)
            ->has('expiresAt')
            ->missing('accessToken')
        );

    $response = $this->actingAs($learner)
        ->post(route('client-authorizations.approval.store', $userCode));

    $connection = ClientConnection::query()->sole();

    expect($connection)
        ->learner_id->toBe($learner->id)
        ->name->toBe('Codex in VS Code')
        ->token_hash->toBeNull()
        ->revoked_at->toBeNull()
        ->and($authorization->fresh()->client_connection_id)->toBe($connection->id)
        ->and($authorization->fresh()->approved_at)->not->toBeNull();
    $response
        ->assertRedirect(route('client-connections.index', absolute: false))
        ->assertSessionMissing('access_token');
});

test('guests must sign in and Mentors cannot approve client authorizations', function () {
    $mentor = User::factory()->mentor()->create();
    $userCode = 'EFGH-6789';
    ClientAuthorization::factory()->create([
        'user_code_hash' => hash('sha256', $userCode),
    ]);

    $this->get(route('client-authorizations.approval.show', $userCode))
        ->assertRedirect(route('login'));

    $this->actingAs($mentor)
        ->get(route('client-authorizations.approval.show', $userCode))
        ->assertForbidden();
    $this->actingAs($mentor)
        ->post(route('client-authorizations.approval.store', $userCode))
        ->assertForbidden();

    expect(ClientConnection::query()->doesntExist())->toBeTrue();
});

test('a client can poll, exchange an approval once, and receives its credential directly', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $userCode = 'JKLM-2345';
    $deviceCode = 'jmd_'.str_repeat('a', 64);
    $authorization = ClientAuthorization::factory()->create([
        'device_code_hash' => hash('sha256', $deviceCode),
        'user_code_hash' => hash('sha256', $userCode),
    ]);

    $this->postJson(route('client-authorizations.token'), [
        'device_code' => $deviceCode,
    ])->assertAccepted()->assertExactJson([
        'status' => 'authorization_pending',
        'retry_after' => 2,
    ]);

    $this->actingAs($learner)
        ->post(route('client-authorizations.approval.store', $userCode))
        ->assertRedirect(route('client-connections.index'));

    $response = $this->postJson(route('client-authorizations.token'), [
        'device_code' => $deviceCode,
    ]);

    $connection = ClientConnection::query()->sole();
    $accessToken = $response->json('access_token');

    $response
        ->assertOk()
        ->assertJsonPath('token_type', 'Bearer')
        ->assertJsonPath('connection.id', $connection->id)
        ->assertJsonPath('connection.name', $connection->name);
    expect($accessToken)
        ->toStartWith('jm_')
        ->and($connection->fresh()->token_hash)->toBe(hash('sha256', $accessToken))
        ->and($connection->fresh()->token_hash)->not->toBe($accessToken)
        ->and($authorization->fresh()->exchanged_at)->not->toBeNull();

    $this->postJson(route('client-authorizations.token'), [
        'device_code' => $deviceCode,
    ])->assertGone();
});

test('expired, approved, replayed, and unknown authorization codes fail safely', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $expiredUserCode = 'NPQR-2345';
    $expiredDeviceCode = 'jmd_'.str_repeat('b', 64);
    ClientAuthorization::factory()->expired()->create([
        'device_code_hash' => hash('sha256', $expiredDeviceCode),
        'user_code_hash' => hash('sha256', $expiredUserCode),
    ]);

    $this->actingAs($learner)
        ->get(route('client-authorizations.approval.show', $expiredUserCode))
        ->assertGone();
    $this->actingAs($learner)
        ->post(route('client-authorizations.approval.store', $expiredUserCode))
        ->assertGone();
    $this->postJson(route('client-authorizations.token'), [
        'device_code' => $expiredDeviceCode,
    ])->assertGone();

    $usedUserCode = 'STUV-2345';
    ClientAuthorization::factory()->create([
        'user_code_hash' => hash('sha256', $usedUserCode),
    ]);
    $this->actingAs($learner)
        ->post(route('client-authorizations.approval.store', $usedUserCode))
        ->assertRedirect();
    $this->actingAs($learner)
        ->get(route('client-authorizations.approval.show', $usedUserCode))
        ->assertGone();
    $this->actingAs($learner)
        ->post(route('client-authorizations.approval.store', $usedUserCode))
        ->assertGone();

    $unknownDeviceCode = 'jmd_'.str_repeat('z', 64);
    $this->actingAs($learner)
        ->get(route('client-authorizations.approval.show', 'WXYZ-2345'))
        ->assertNotFound();
    $this->postJson(route('client-authorizations.token'), [
        'device_code' => $unknownDeviceCode,
    ])->assertNotFound();
});
