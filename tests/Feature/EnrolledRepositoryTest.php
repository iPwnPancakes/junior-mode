<?php

use App\Models\EnrolledRepository;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('a Learner can enroll a repository without a remote and see its generated identity', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();

    $this->actingAs($learner)
        ->post(route('enrolled-repositories.store', $learner), [
            'display_name' => 'Local learning sandbox',
            'remote_url' => '',
            'local_path' => '/work/sandbox',
        ])
        ->assertRedirect(route('enrolled-repositories.index'));

    $repository = EnrolledRepository::query()->sole();

    expect($repository->identity)->toBeUuid()
        ->and($repository->normalized_remote)->toBeNull()
        ->and($repository->isEnrolled())->toBeTrue();

    $this->actingAs($learner)
        ->get(route('enrolled-repositories.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('enrolled-repositories/index')
            ->where('viewerRole', 'learner')
            ->where('learner.id', $learner->id)
            ->where('learner.repositories.0.identity', $repository->identity)
            ->where('learner.repositories.0.displayName', 'Local learning sandbox')
            ->where('learner.repositories.0.localPath', '/work/sandbox')
            ->where('learner.repositories.0.status', 'enrolled')
            ->has('learners', 0)
        );
});

test('equivalent remotes and duplicate clones reuse one enrolled repository', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();

    $this->actingAs($learner)->post(route('enrolled-repositories.store', $learner), [
        'display_name' => 'Codex clone one',
        'remote_url' => 'git@github.com:OpenAI/Codex.git',
        'local_path' => '/work/codex',
    ])->assertRedirect();

    $identity = EnrolledRepository::query()->sole()->identity;

    $this->actingAs($learner)->post(route('enrolled-repositories.store', $learner), [
        'display_name' => 'Codex clone two',
        'remote_url' => 'https://github.com/openai/codex.git',
        'local_path' => '/tmp/codex-clone',
    ])->assertRedirect();

    $repository = EnrolledRepository::query()->sole();

    expect($repository->identity)->toBe($identity)
        ->and($repository->display_name)->toBe('Codex clone two')
        ->and($repository->normalized_remote)->toBe('github.com/openai/codex')
        ->and($repository->local_path)->toBe('/tmp/codex-clone');
});

test('display names and local paths change without changing repository identity', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $repository = EnrolledRepository::factory()
        ->for($learner, 'learner')
        ->withRemote()
        ->create();

    $this->actingAs($learner)
        ->patch(route('enrolled-repositories.update', [$learner, $repository]), [
            'display_name' => 'Renamed project',
            'remote_url' => $repository->normalized_remote,
            'local_path' => '/renamed/project',
        ])
        ->assertRedirect(route('enrolled-repositories.index'));

    expect($repository->fresh()->identity)->toBe($repository->identity)
        ->and($repository->fresh()->display_name)->toBe('Renamed project')
        ->and($repository->fresh()->local_path)->toBe('/renamed/project');
});

test('a Mentor can manage only repositories for their associated Learners', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create(['name' => 'Lee Learner']);
    $unrelatedMentor = User::factory()->mentor()->create();
    $unrelatedLearner = User::factory()->learner($unrelatedMentor)->create();
    $unrelatedRepository = EnrolledRepository::factory()->for($unrelatedLearner, 'learner')->create();

    $this->actingAs($mentor)
        ->post(route('enrolled-repositories.store', $learner), [
            'display_name' => 'Learner project',
            'remote_url' => 'https://github.com/example/learner-project.git',
        ])
        ->assertRedirect();

    $this->actingAs($mentor)
        ->patch(route('enrolled-repositories.update', [$unrelatedLearner, $unrelatedRepository]), [
            'display_name' => 'Unauthorized rename',
        ])
        ->assertForbidden();

    $this->actingAs($mentor)
        ->post(route('enrolled-repositories.store', $unrelatedLearner), [
            'display_name' => 'Unauthorized enrollment',
        ])
        ->assertForbidden();

    $this->actingAs($unrelatedLearner)
        ->delete(route('repository-enrollments.destroy', [$learner, EnrolledRepository::query()->whereBelongsTo($learner, 'learner')->sole()]))
        ->assertForbidden();

    $this->actingAs($mentor)
        ->get(route('enrolled-repositories.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('viewerRole', 'mentor')
            ->where('learner', null)
            ->has('learners', 1)
            ->where('learners.0.id', $learner->id)
            ->where('learners.0.repositories.0.displayName', 'Learner project')
        );
});

test('unenrollment preserves the repository record and re-enrollment restores tracking', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $repository = EnrolledRepository::factory()->for($learner, 'learner')->create();

    $this->actingAs($learner)
        ->delete(route('repository-enrollments.destroy', [$learner, $repository]))
        ->assertRedirect(route('enrolled-repositories.index'));

    expect($repository->fresh()->unenrolled_at)->not->toBeNull()
        ->and(EnrolledRepository::query()->whereKey($repository)->exists())->toBeTrue();

    $this->actingAs($learner)
        ->post(route('repository-enrollments.store', [$learner, $repository]))
        ->assertRedirect(route('enrolled-repositories.index'));

    expect($repository->fresh()->unenrolled_at)->toBeNull();
});

test('guests cannot view or change enrolled repositories', function () {
    $repository = EnrolledRepository::factory()->create();

    $this->get(route('enrolled-repositories.index'))->assertRedirect(route('login'));
    $this->delete(route('repository-enrollments.destroy', [$repository->learner_id, $repository]))
        ->assertRedirect(route('login'));
});
