<?php

use App\Models\ClientAuthorization;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    app()->detectEnvironment(fn (): string => 'local');
    // CSRF is only skipped automatically in the testing environment.
    $this->withoutMiddleware(PreventRequestForgery::class);
});

test('a local Mentor switches into a paired Learner that can approve clients', function () {
    $mentor = User::factory()->mentor()->create(['email' => 'mentor@example.test']);
    $userCode = 'ABCD-2345';
    ClientAuthorization::factory()->create(['user_code_hash' => hash('sha256', $userCode)]);

    $this->actingAs($mentor)
        ->post(route('development.switch-account'))
        ->assertRedirect(route('dashboard'));

    $learner = User::query()->where('email', 'mentor+learner@example.test')->sole();

    expect($learner->isLearner())->toBeTrue()
        ->and($learner->mentor_id)->toBe($mentor->id);
    $this->assertAuthenticatedAs($learner);

    $this->post(route('client-authorizations.approval.store', $userCode))
        ->assertRedirect();
    expect($learner->clientConnections()->count())->toBe(1);
});

test('the paired Learner switches back to its Mentor and switching reuses the Learner', function () {
    $mentor = User::factory()->mentor()->create(['email' => 'mentor@example.test']);

    $this->actingAs($mentor)->post(route('development.switch-account'));
    $this->post(route('development.switch-account'))->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($mentor);

    $this->post(route('development.switch-account'));
    expect(User::query()->where('mentor_id', $mentor->id)->count())->toBe(1);
});

test('invited Learners cannot switch into their Mentor', function () {
    $mentor = User::factory()->mentor()->create(['email' => 'mentor@example.test']);
    $learner = User::factory()->learner($mentor)->create(['email' => 'someone@example.test']);

    $this->actingAs($learner)
        ->post(route('development.switch-account'))
        ->assertForbidden();
    $this->assertAuthenticatedAs($learner);
});

test('account switching is unavailable outside local installations', function () {
    app()->detectEnvironment(fn (): string => 'production');
    $mentor = User::factory()->mentor()->create();

    $this->actingAs($mentor)
        ->post(route('development.switch-account'))
        ->assertNotFound();
    $this->actingAs($mentor)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('developmentAccountSwitch', null));
    expect(User::query()->count())->toBe(1);
});

test('the shared switch prop names the role a local user can switch to', function () {
    $mentor = User::factory()->mentor()->create(['email' => 'mentor@example.test']);
    $invitedLearner = User::factory()->learner($mentor)->create();

    $this->actingAs($mentor)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('developmentAccountSwitch', 'learner'));

    $this->actingAs($invitedLearner)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('developmentAccountSwitch', null));

    $this->actingAs($mentor)->post(route('development.switch-account'));
    $this->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('developmentAccountSwitch', 'mentor'));
});
