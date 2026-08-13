<?php

use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia as Assert;

test('the registration screen is available on a fresh installation', function () {
    $response = $this->get(route('register'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/register')
            ->has('passwordRules')
        );
});

test('the first registered user becomes the primary Mentor', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Primary Mentor',
        'email' => 'mentor@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $mentor = User::query()->sole();

    expect($mentor)
        ->role->toBe(UserRole::Mentor)
        ->mentor_id->toBeNull();
    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('public registration is unavailable after bootstrap', function () {
    User::factory()->mentor()->create();

    $this->get(route('register'))->assertNotFound();
    $this->post(route('register.store'), [
        'name' => 'Unexpected User',
        'email' => 'unexpected@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();

    expect(User::query()->count())->toBe(1);
});
