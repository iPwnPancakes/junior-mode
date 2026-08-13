<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('Mentors see the Mentor dashboard shell and empty Learner state', function () {
    $mentor = User::factory()->mentor()->create();

    $this->actingAs($mentor)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('mentor/dashboard')
            ->has('learners', 0)
            ->has('pendingInvitations', 0)
        );
});

test('Learners see the Learner dashboard shell and their Mentor', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();

    $this->actingAs($learner)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('learner/dashboard')
            ->where('mentor.id', $mentor->id)
            ->where('mentor.name', $mentor->name)
            ->where('mentor.email', $mentor->email)
        );
});
