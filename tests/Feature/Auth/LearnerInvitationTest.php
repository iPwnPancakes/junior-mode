<?php

use App\Models\LearnerInvitation;
use App\Models\User;
use App\Notifications\LearnerInvited;
use App\UserRole;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

test('only Mentors can invite Learners', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();

    $this->post(route('learner-invitations.store'), [
        'email' => 'learner@example.com',
    ])->assertRedirect(route('login'));

    $this->actingAs($learner)
        ->post(route('learner-invitations.store'), [
            'email' => 'another@example.com',
        ])
        ->assertForbidden();
});

test('a Mentor can send a private expiring Learner invitation', function () {
    Notification::fake();
    $mentor = User::factory()->mentor()->create();

    $this->actingAs($mentor)
        ->post(route('learner-invitations.store'), [
            'email' => 'Learner@Example.com',
        ])
        ->assertRedirect(route('dashboard'));

    $invitation = LearnerInvitation::query()->sole();

    expect($invitation)
        ->mentor_id->toBe($mentor->id)
        ->email->toBe('learner@example.com')
        ->accepted_at->toBeNull()
        ->and($invitation->expires_at->isSameDay(now()->addDays(7)))->toBeTrue();

    Notification::assertSentOnDemand(
        LearnerInvited::class,
        function (LearnerInvited $notification, array $channels, AnonymousNotifiable $notifiable) use ($invitation): bool {
            return $channels === ['mail']
                && $notifiable->routes['mail'] === $invitation->email
                && hash('sha256', $notification->plainTextToken) === $invitation->token_hash;
        },
    );
});

test('a valid invitation creates a Learner assigned to its Mentor', function () {
    $mentor = User::factory()->mentor()->create();
    $token = Str::random(64);
    $invitation = LearnerInvitation::factory()->for($mentor, 'mentor')->create([
        'email' => 'learner@example.com',
        'token_hash' => hash('sha256', $token),
    ]);

    $this->get(route('learner-invitations.accept', $token))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/accept-learner-invitation')
            ->where('email', 'learner@example.com')
            ->where('mentorName', $mentor->name)
            ->where('token', $token)
            ->has('passwordRules')
        );

    $response = $this->post(route('learner-invitations.accept.store', $token), [
        'name' => 'Invited Learner',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $learner = User::query()->where('email', 'learner@example.com')->firstOrFail();

    expect($learner)
        ->role->toBe(UserRole::Learner)
        ->mentor_id->toBe($mentor->id)
        ->and($invitation->fresh()->accepted_by_user_id)->toBe($learner->id)
        ->and($invitation->fresh()->accepted_at)->not->toBeNull();
    $this->assertAuthenticatedAs($learner);
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('a Mentor can onboard multiple Learners', function () {
    $mentor = User::factory()->mentor()->create();

    foreach (['first@example.com', 'second@example.com'] as $email) {
        $token = Str::random(64);
        LearnerInvitation::factory()->for($mentor, 'mentor')->create([
            'email' => $email,
            'token_hash' => hash('sha256', $token),
        ]);

        $this->post(route('learner-invitations.accept.store', $token), [
            'name' => Str::before($email, '@'),
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertRedirect(route('dashboard'));

        auth()->logout();
    }

    expect($mentor->learners()->count())->toBe(2)
        ->and($mentor->learners()->pluck('mentor_id')->unique()->all())->toBe([$mentor->id]);
});

test('expired and reused invitations cannot be accepted', function () {
    $mentor = User::factory()->mentor()->create();
    $expiredToken = Str::random(64);
    LearnerInvitation::factory()->for($mentor, 'mentor')->expired()->create([
        'token_hash' => hash('sha256', $expiredToken),
    ]);

    $this->get(route('learner-invitations.accept', $expiredToken))->assertGone();
    $this->post(route('learner-invitations.accept.store', $expiredToken), [
        'name' => 'Expired Learner',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertGone();

    $acceptedToken = Str::random(64);
    LearnerInvitation::factory()->for($mentor, 'mentor')->create([
        'email' => 'accepted@example.com',
        'token_hash' => hash('sha256', $acceptedToken),
        'accepted_at' => now(),
    ]);

    $this->get(route('learner-invitations.accept', $acceptedToken))->assertGone();
    $this->post(route('learner-invitations.accept.store', $acceptedToken), [
        'name' => 'Reused Learner',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertGone();
});

test('unknown invitation tokens are not disclosed', function () {
    $token = Str::random(64);

    $this->get(route('learner-invitations.accept', $token))->assertNotFound();
    $this->post(route('learner-invitations.accept.store', $token), [
        'name' => 'Unknown Learner',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();
});

test('signed-in users cannot consume invitation routes', function (UserRole $role) {
    $mentor = User::factory()->mentor()->create();
    $user = $role === UserRole::Mentor
        ? $mentor
        : User::factory()->learner($mentor)->create();
    $token = Str::random(64);
    LearnerInvitation::factory()->for($mentor, 'mentor')->create([
        'token_hash' => hash('sha256', $token),
    ]);

    $this->actingAs($user)
        ->get(route('learner-invitations.accept', $token))
        ->assertRedirect(route('dashboard'));
})->with(UserRole::cases());
