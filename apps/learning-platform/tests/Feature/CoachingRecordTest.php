<?php

use App\BaselineAssessmentLevel;
use App\CoachingPriorityEmphasis;
use App\CoachingPriorityExpirationMode;
use App\CoachingPriorityStatus;
use App\Models\Assessment;
use App\Models\CoachingPriority;
use App\Models\Competency;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

afterEach(fn () => Carbon::setTestNow());

test('Mentors and Learners can view the coaching record with role-appropriate controls', function () {
    Carbon::setTestNow('2026-08-25 12:00:00');
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $competency = Competency::factory()->for($learner, 'learner')->create(['name' => 'Authorization']);

    Assessment::factory()->create([
        'learner_id' => $learner->id,
        'competency_id' => $competency->id,
        'assessed_by_id' => $mentor->id,
        'level' => BaselineAssessmentLevel::Developing,
    ]);

    foreach ([
        ['expires_at' => now()->addDay(), 'expiration_mode' => CoachingPriorityExpirationMode::DefaultDuration],
        ['expires_at' => null, 'expiration_mode' => CoachingPriorityExpirationMode::UntilRemoved],
        ['expires_at' => now()->subDay(), 'expiration_mode' => CoachingPriorityExpirationMode::CustomDate],
    ] as $priorityData) {
        CoachingPriority::factory()->create([
            ...$priorityData,
            'learner_id' => $learner->id,
            'competency_id' => $competency->id,
            'created_by_id' => $mentor->id,
        ]);
    }

    $this->actingAs($mentor)
        ->get(route('coaching-records.show', $learner))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('coaching-records/show')
            ->where('canManage', true)
            ->where('defaultPriorityDurationDays', 7)
            ->has('assessments', 1)
            ->where('assessments.0.level', 'developing')
            ->where('priorities', fn ($priorities) => collect($priorities)
                ->pluck('displayStatus')
                ->sort()
                ->values()
                ->all() === ['active', 'expired', 'persistent'])
        );

    $this->actingAs($learner)
        ->get(route('coaching-records.show', $learner))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManage', false)
            ->has('assessments', 1)
            ->has('priorities', 3)
        );
});

test('a Mentor records an Assessment independently of Coaching Priorities', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $competency = Competency::factory()->for($learner, 'learner')->create();

    $this->actingAs($mentor)
        ->post(route('assessments.store', $learner), [
            'competency_id' => $competency->id,
            'level' => BaselineAssessmentLevel::Independent->value,
            'rationale' => 'Explained the policy boundary and tested both actors.',
        ])
        ->assertRedirect();

    $assessment = Assessment::query()->sole();

    expect($assessment->level)->toBe(BaselineAssessmentLevel::Independent)
        ->and($assessment->assessed_by_id)->toBe($mentor->id)
        ->and(CoachingPriority::query()->count())->toBe(0);
});

test('Assessment and Coaching Priority inputs are validated against the precise Learner catalog', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $otherLearner = User::factory()->learner($mentor)->create();
    $otherCompetency = Competency::factory()->for($otherLearner, 'learner')->create();

    $this->actingAs($mentor)
        ->from(route('coaching-records.show', $learner))
        ->post(route('assessments.store', $learner), [
            'competency_id' => $otherCompetency->id,
            'level' => 'mastered',
        ])
        ->assertRedirect(route('coaching-records.show', $learner))
        ->assertSessionHasErrors(['competency_id', 'level']);

    $this->actingAs($mentor)
        ->post(route('coaching-priorities.store', $learner), [
            'competency_id' => $otherCompetency->id,
            'emphasis' => 'urgent',
            'expiration_mode' => 'custom_date',
            'expires_on' => now()->toDateString(),
        ])
        ->assertSessionHasErrors(['competency_id', 'emphasis', 'expires_on']);
});

test('priorities support configurable default, custom, and until-removed expiration', function () {
    Carbon::setTestNow('2026-08-25 12:00:00');
    $mentor = User::factory()->mentor()->create(['default_priority_duration_days' => 10]);
    $learner = User::factory()->learner($mentor)->create();
    $competencies = Competency::factory()->count(3)->for($learner, 'learner')->create();

    $payloads = [
        ['competency_id' => $competencies[0]->id, 'emphasis' => 'normal', 'expiration_mode' => 'default_duration'],
        ['competency_id' => $competencies[1]->id, 'emphasis' => 'high', 'expiration_mode' => 'custom_date', 'expires_on' => '2026-09-30'],
        ['competency_id' => $competencies[2]->id, 'emphasis' => 'normal', 'expiration_mode' => 'until_removed'],
    ];

    foreach ($payloads as $payload) {
        $this->actingAs($mentor)
            ->post(route('coaching-priorities.store', $learner), $payload)
            ->assertRedirect();
    }

    $priorities = CoachingPriority::query()->oldest()->get();

    expect($priorities[0]->expires_at?->toDateTimeString())->toBe('2026-09-04 12:00:00')
        ->and($priorities[1]->expires_at?->toDateTimeString())->toBe('2026-09-30 23:59:59')
        ->and($priorities[2]->expires_at)->toBeNull()
        ->and($priorities[1]->emphasis)->toBe(CoachingPriorityEmphasis::High);

    $this->actingAs($mentor)
        ->patch(route('mentor-coaching-settings.update'), ['default_priority_duration_days' => 21])
        ->assertRedirect();

    expect($mentor->refresh()->default_priority_duration_days)->toBe(21);
});

test('a Mentor can refine, renew, replace, close, and mark priorities sufficiently demonstrated', function () {
    Carbon::setTestNow('2026-08-25 12:00:00');
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    [$firstCompetency, $secondCompetency] = Competency::factory()->count(2)->for($learner, 'learner')->create();
    $priority = CoachingPriority::factory()->create([
        'learner_id' => $learner->id,
        'competency_id' => $firstCompetency->id,
        'created_by_id' => $mentor->id,
    ]);

    $this->actingAs($mentor)
        ->patch(route('coaching-priorities.update', [$learner, $priority]), [
            'emphasis' => 'high',
            'expiration_mode' => 'until_removed',
            'note' => 'Focus on explaining authorization decisions.',
        ])
        ->assertRedirect();

    expect($priority->refresh()->emphasis)->toBe(CoachingPriorityEmphasis::High)
        ->and($priority->expires_at)->toBeNull();

    $this->actingAs($mentor)
        ->post(route('coaching-priority-renewals.store', [$learner, $priority]), [
            'expiration_mode' => 'default_duration',
        ])
        ->assertRedirect();

    expect($priority->refresh()->expires_at?->toDateTimeString())->toBe('2026-09-01 12:00:00');

    $this->actingAs($mentor)
        ->post(route('coaching-priority-replacements.store', [$learner, $priority]), [
            'competency_id' => $secondCompetency->id,
            'emphasis' => 'normal',
            'expiration_mode' => 'until_removed',
            'note' => 'Continue with the narrower Competency.',
        ])
        ->assertRedirect();

    $priority->refresh();
    $replacement = CoachingPriority::query()->findOrFail($priority->replaced_by_priority_id);

    expect($priority->status)->toBe(CoachingPriorityStatus::Replaced)
        ->and($replacement->competency_id)->toBe($secondCompetency->id);

    $this->actingAs($mentor)
        ->post(route('coaching-priority-resolutions.store', [$learner, $replacement]), [
            'status' => 'sufficiently_demonstrated',
        ])
        ->assertRedirect();

    expect($replacement->refresh()->status)->toBe(CoachingPriorityStatus::SufficientlyDemonstrated);

    $closable = CoachingPriority::factory()->create([
        'learner_id' => $learner->id,
        'competency_id' => $firstCompetency->id,
        'created_by_id' => $mentor->id,
    ]);

    $this->actingAs($mentor)
        ->post(route('coaching-priority-resolutions.store', [$learner, $closable]), ['status' => 'closed'])
        ->assertRedirect();

    expect($closable->refresh()->status)->toBe(CoachingPriorityStatus::Closed);
});

test('Learners and unrelated Mentors cannot alter a coaching record', function () {
    $mentor = User::factory()->mentor()->create();
    $unrelatedMentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $competency = Competency::factory()->for($learner, 'learner')->create();
    $payload = [
        'competency_id' => $competency->id,
        'emphasis' => 'normal',
        'expiration_mode' => 'until_removed',
    ];

    $this->actingAs($learner)
        ->post(route('coaching-priorities.store', $learner), $payload)
        ->assertForbidden();

    $this->actingAs($unrelatedMentor)
        ->post(route('assessments.store', $learner), [
            'competency_id' => $competency->id,
            'level' => 'developing',
        ])
        ->assertForbidden();

    expect(CoachingPriority::query()->count())->toBe(0)
        ->and(Assessment::query()->count())->toBe(0);
});
