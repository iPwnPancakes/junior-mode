<?php

use App\Actions\BuildMentorLearnerOverview;
use App\Models\CatalogProposal;
use App\Models\ClientConnection;
use App\Models\CoachingPriority;
use App\Models\CoachingSession;
use App\Models\Competency;
use App\Models\EnrolledRepository;
use App\Models\HandoffSnapshot;
use App\Models\User;
use Carbon\CarbonInterface;
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

test('a new Learner sees which setup steps are missing and nothing to pick up yet', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    ClientConnection::factory()->revoked()->create(['learner_id' => $learner->id]);
    EnrolledRepository::factory()->unenrolled()->create(['learner_id' => $learner->id]);

    $this->actingAs($learner)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('setup', ['hasPlan' => false, 'hasClient' => false, 'hasRepository' => false])
            ->has('focus', 0)
            ->has('activeSessions', 0)
            ->where('handoffsAwaitingReview', 0)
        );
});

test('a Learner dashboard shows current focus, active Sessions and handoffs awaiting review', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $competency = Competency::factory()->forLearner($learner)->create(['name' => 'Authorization']);
    $expired = Competency::factory()->forLearner($learner)->create();
    ClientConnection::factory()->create(['learner_id' => $learner->id]);
    EnrolledRepository::factory()->create(['learner_id' => $learner->id]);
    CoachingPriority::factory()->create([
        'learner_id' => $learner->id,
        'competency_id' => $competency->id,
        'created_by_id' => $mentor->id,
        'expires_at' => now()->addDays(3),
    ]);
    CoachingPriority::factory()->create([
        'learner_id' => $learner->id,
        'competency_id' => $expired->id,
        'created_by_id' => $mentor->id,
        'expires_at' => now()->subDay(),
    ]);
    $session = CoachingSession::factory()->create(['learner_id' => $learner->id]);
    CoachingSession::factory()->create(['learner_id' => $learner->id, 'status' => 'concluded']);
    HandoffSnapshot::factory()->create(['coaching_session_id' => $session->id]);
    HandoffSnapshot::factory()->create([
        'coaching_session_id' => $session->id,
        'mentor_id' => $mentor->id,
        'shared_at' => now(),
    ]);

    $this->actingAs($learner)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('setup', ['hasPlan' => true, 'hasClient' => true, 'hasRepository' => true])
            ->has('focus', 1)
            ->where('focus.0.competencyName', 'Authorization')
            ->where('focus.0.expiresOn', now()->addDays(3)->toFormattedDateString())
            ->has('activeSessions', 1)
            ->where('activeSessions.0.id', $session->id)
            ->where('handoffsAwaitingReview', 1)
        );
});

test('the Mentor dashboard gives each Learner one next step in priority order', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = function (bool $withCompetency = true, bool $withRepository = true) use ($mentor): User {
        $learner = User::factory()->learner($mentor)->create();

        if ($withCompetency) {
            Competency::factory()->forLearner($learner)->create();
        }

        if ($withRepository) {
            EnrolledRepository::factory()->create(['learner_id' => $learner->id]);
        }

        return $learner;
    };
    $focus = fn (User $learner, ?CarbonInterface $expiresAt) => CoachingPriority::factory()->create([
        'learner_id' => $learner->id,
        'competency_id' => $learner->competencies()->value('id'),
        'created_by_id' => $mentor->id,
        'expires_at' => $expiresAt,
    ]);

    $withProposal = $learner(withCompetency: false);
    $proposal = CatalogProposal::factory()->create(['learner_id' => $withProposal->id]);
    $withoutPlan = $learner(withCompetency: false);
    $withoutRepository = $learner(withRepository: false);
    $withHandoff = $learner();
    $focus($withHandoff, now()->subDay());
    $handoff = HandoffSnapshot::factory()->create([
        'coaching_session_id' => CoachingSession::factory()->create(['learner_id' => $withHandoff->id])->id,
        'mentor_id' => $mentor->id,
        'shared_at' => now()->subDay(),
    ]);
    $withExpiredFocus = $learner();
    $focus($withExpiredFocus, now()->subDay());
    $withEndingFocus = $learner();
    $focus($withEndingFocus, now()->addDay());
    $withoutFocus = $learner();
    $onTrack = $learner();
    $focus($onTrack, now()->addWeek());
    $otherLearner = User::factory()->learner()->create();

    $response = $this->actingAs($mentor)->get(route('dashboard'))->assertOk();
    $steps = collect($response->viewData('page')['props']['learners'])->pluck('nextStep', 'id');

    expect($steps->map(fn (array $step): string => $step['kind'])->all())->toEqual([
        $withProposal->id => 'review_proposal',
        $withoutPlan->id => 'set_up_plan',
        $withoutRepository->id => 'enroll_repository',
        $withHandoff->id => 'read_handoff',
        $withExpiredFocus->id => 'focus_expired',
        $withEndingFocus->id => 'focus_ending',
        $withoutFocus->id => 'choose_focus',
        $onTrack->id => 'on_track',
    ])
        ->and($steps[$withProposal->id]['href'])->toBe(route('catalog-proposals.show', [$withProposal, $proposal]))
        ->and($steps[$withHandoff->id]['href'])->toBe(route('handoffs.show', $handoff))
        ->and($steps[$withoutRepository->id]['href'])->toBe(route('enrolled-repositories.index'))
        ->and($steps[$onTrack->id]['href'])->toBe(route('learners.show', $onTrack))
        ->and($steps->has($otherLearner->id))->toBeFalse();
});

test('the Mentor overview returns integer active counts and reindexes filtered focus lists', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $competency = Competency::factory()->forLearner($learner)->create();
    Competency::factory()->forLearner($learner)->archived()->create();
    Competency::factory()->forLearner($learner)->create(['merged_into_id' => $competency->id]);

    foreach ([now()->subDay(), now()->addWeek()] as $expiresAt) {
        CoachingPriority::factory()->create([
            'learner_id' => $learner->id,
            'competency_id' => $competency->id,
            'created_by_id' => $mentor->id,
            'expires_at' => $expiresAt,
        ]);
    }

    $overview = app(BuildMentorLearnerOverview::class)->handle($mentor);

    expect(array_is_list($overview))->toBeTrue()
        ->and($overview)->toHaveCount(1)
        ->and($overview[0]['competencyCount'])->toBe(1)
        ->and($overview[0]['focus'])->toBe([$competency->name]);
});
