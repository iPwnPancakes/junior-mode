<?php

use App\Actions\BuildLearningProgress;
use App\Actions\GetSolutionEscapeEligibility;
use App\CoachingSessionStatus;
use App\Models\ClientConnection;
use App\Models\CoachingActivityEvent;
use App\Models\CoachingSession;
use App\Models\Competency;
use App\Models\EnrolledRepository;
use App\Models\LearningEvidence;
use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;
use Symfony\Component\HttpKernel\Exception\HttpException;

function escapeTool(string $name, array $arguments): array
{
    return ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/call', 'params' => ['name' => $name, 'arguments' => $arguments]];
}

function escapeActivity(CoachingSession $session, string $key, array $overrides = []): array
{
    return ['contract_version' => '1', 'session_id' => $session->id, 'idempotency_key' => $key, 'kind' => 'hint', 'explicitly_requested' => true, 'summary' => 'Learner requested a hint about validation order', ...$overrides];
}

beforeEach(function () {
    $this->learner = User::factory()->learner()->create();
    $this->token = 'jm_'.str_repeat('s', 64);
    $this->client = ClientConnection::factory()->for($this->learner, 'learner')->create(['token_hash' => hash('sha256', $this->token)]);
    $this->repository = EnrolledRepository::factory()->for($this->learner, 'learner')->create();
    $work = WorkItem::factory()->for($this->learner, 'learner')->for($this->repository, 'enrolledRepository')->create();
    $this->objective = Competency::factory()->forLearner($this->learner)->create();
    $this->session = CoachingSession::factory()->create(['learner_id' => $this->learner->id, 'client_connection_id' => $this->client->id, 'work_item_id' => $work->id, 'primary_learning_objective_id' => $this->objective->id]);
    $this->withToken($this->token);
    $this->attempt = ['contract_version' => '1', 'session_id' => $this->session->id, 'idempotency_key' => 'attempt', 'kind' => 'accepted_attempt', 'summary' => 'Learner proposed a concrete validation implementation', 'attempt_kind' => 'pseudocode', 'acceptance_rationale' => 'The Learner applied input constraints to the reserved validation work'];
    $this->escape = escapeActivity($this->session, 'escape', ['kind' => 'solution_escape', 'reason' => 'still_stuck', 'summary' => 'Learner explicitly requested the complete solution']);
});

test('four explicitly requested hints and a substantive accepted attempt unlock one idempotent escape without notifications', function () {
    Notification::fake();
    $this->postJson('/mcp', escapeTool('get-solution-escape-eligibility', ['contract_version' => '1', 'session_id' => $this->session->id]))->assertJsonPath('result.structuredContent.eligibility.required_hints', 4)->assertJsonPath('result.structuredContent.eligibility.eligible', false);
    $this->postJson('/mcp', escapeTool('record-coaching-activity', $this->escape))->assertJsonPath('result.isError', true);
    for ($hint = 1; $hint <= 4; $hint++) {
        $payload = escapeActivity($this->session, 'hint-'.$hint);
        foreach ([1, 2] as $retry) {
            $this->postJson('/mcp', escapeTool('record-coaching-activity', $payload))->assertJsonPath('result.isError', false)->assertJsonPath('result.structuredContent.eligibility.requested_hints', $hint)->assertJsonPath('result.structuredContent.eligibility.eligible', false);
        }
    }
    $this->postJson('/mcp', escapeTool('record-coaching-activity', $this->escape))->assertJsonPath('result.isError', true);
    foreach ([1, 2] as $retry) {
        $this->postJson('/mcp', escapeTool('record-coaching-activity', $this->attempt))->assertJsonPath('result.structuredContent.eligibility.accepted_attempts', 1)->assertJsonPath('result.structuredContent.eligibility.eligible', true)->assertJsonPath('result.structuredContent.eligibility.can_provide_solution', false);
    }
    foreach ([1, 2] as $retry) {
        $this->postJson('/mcp', escapeTool('record-coaching-activity', $this->escape))->assertJsonPath('result.structuredContent.eligibility.escape_used', true)->assertJsonPath('result.structuredContent.eligibility.can_provide_solution', true);
    }
    expect(CoachingActivityEvent::query()->count())->toBe(6)
        ->and(CoachingActivityEvent::query()->where('kind', 'solution_escape')->sole()->payload['required_hints'])->toBe(4);
    $this->postJson('/mcp', escapeTool('record-coaching-activity', [...$this->escape, 'idempotency_key' => 'another-escape']))->assertJsonPath('result.isError', true);
    Notification::assertNothingSent();
});

test('accepted attempts alone and three hints cannot bypass the required fourth hint', function () {
    $this->postJson('/mcp', escapeTool('record-coaching-activity', $this->attempt))->assertJsonPath('result.isError', false);
    for ($hint = 1; $hint <= 3; $hint++) {
        $this->postJson('/mcp', escapeTool('record-coaching-activity', escapeActivity($this->session, 'hint-'.$hint)))->assertJsonPath('result.structuredContent.eligibility.eligible', false);
    }
    $this->postJson('/mcp', escapeTool('record-coaching-activity', $this->escape))->assertJsonPath('result.isError', true);
    expect(CoachingActivityEvent::query()->where('kind', 'solution_escape')->count())->toBe(0);
});

test('hint threshold is explicit deployment policy and never caller supplied', function () {
    config(['coaching.solution_escape_required_hints' => 2]);
    $this->postJson('/mcp', escapeTool('record-coaching-activity', $this->attempt))->assertJsonPath('result.structuredContent.eligibility.required_hints', 2);
    for ($hint = 1; $hint <= 2; $hint++) {
        $this->postJson('/mcp', escapeTool('record-coaching-activity', escapeActivity($this->session, 'hint-'.$hint)))->assertJsonPath('result.isError', false);
    }
    $this->postJson('/mcp', escapeTool('record-coaching-activity', [...$this->escape, 'required_hints' => 0]))->assertJsonPath('result.structuredContent.eligibility.can_provide_solution', true);
    expect(CoachingActivityEvent::query()->where('kind', 'solution_escape')->sole()->payload['required_hints'])->toBe(2);
});

test('unrequested hints non substantive attempts secrets and reason bypasses are rejected', function () {
    foreach ([['explicitly_requested' => false], ['explicitly_requested' => null], ['kind' => 'feedback'], ['learner_id' => $this->learner->id], ['summary' => 'api_key=do-not-store'], ['stage' => 'independent']] as $invalid) {
        $this->postJson('/mcp', escapeTool('record-coaching-activity', escapeActivity($this->session, 'invalid', $invalid)))->assertJsonPath('result.isError', true);
    }
    foreach ([['acceptance_rationale' => ''], ['acceptance_rationale' => 'I do not know'], ['attempt_kind' => 'copied_prompt']] as $invalid) {
        $this->postJson('/mcp', escapeTool('record-coaching-activity', [...$this->attempt, ...$invalid]))->assertJsonPath('result.isError', true);
    }
    $this->postJson('/mcp', escapeTool('record-coaching-activity', [...$this->escape, 'reason' => 'skip_learning']))->assertJsonPath('result.isError', true);
    expect(CoachingActivityEvent::query()->count())->toBe(0);
});

test('retry keys bind their original payload and activity history is append only', function () {
    $payload = escapeActivity($this->session, 'hint');
    $this->postJson('/mcp', escapeTool('record-coaching-activity', $payload))->assertJsonPath('result.isError', false);
    $this->postJson('/mcp', escapeTool('record-coaching-activity', [...$payload, 'summary' => 'A different conceptual hint']))->assertJsonPath('result.isError', true);
    $event = CoachingActivityEvent::query()->sole();
    expect(fn () => $event->update(['payload' => []]))->toThrow(LogicException::class);
    expect(fn () => $event->delete())->toThrow(LogicException::class);
});

test('unenrolled and settled sessions do not accept activity or authorize a solution', function (string $state) {
    if ($state === 'unenrolled') {
        $this->repository->update(['unenrolled_at' => now()]);
    } else {
        $this->session->update(['status' => CoachingSessionStatus::Concluded]);
    }
    $this->postJson('/mcp', escapeTool('record-coaching-activity', escapeActivity($this->session, 'hint')))->assertJsonPath('result.isError', true);
    $this->postJson('/mcp', escapeTool('get-solution-escape-eligibility', ['contract_version' => '1', 'session_id' => $this->session->id]))->assertJsonPath('result.structuredContent.eligibility.eligible', false)->assertJsonPath('result.structuredContent.eligibility.can_provide_solution', false);
})->with(['unenrolled', 'settled']);

test('another learner or mismatched or revoked client cannot access activity', function () {
    $other = User::factory()->learner()->create();
    $token = 'jm_'.str_repeat('o', 64);
    $otherClient = ClientConnection::factory()->for($other, 'learner')->create(['token_hash' => hash('sha256', $token)]);
    $this->withToken($token)->postJson('/mcp', escapeTool('get-solution-escape-eligibility', ['contract_version' => '1', 'session_id' => $this->session->id]))->assertJsonPath('result.isError', true);
    $this->postJson('/mcp', escapeTool('record-coaching-activity', escapeActivity($this->session, 'hint')))->assertJsonPath('result.isError', true);
    expect(fn () => app(GetSolutionEscapeEligibility::class)->handle($this->learner, $otherClient, $this->session))->toThrow(HttpException::class);
    $this->client->update(['revoked_at' => now()]);
    $this->withToken($this->token)->postJson('/mcp', escapeTool('record-coaching-activity', escapeActivity($this->session, 'hint')))->assertUnauthorized();
    expect(CoachingActivityEvent::query()->count())->toBe(0);
});

test('another named client for the same learner may continue the session with accurate attribution', function () {
    $token = 'jm_'.str_repeat('n', 64);
    $client = ClientConnection::factory()->for($this->learner, 'learner')->create(['token_hash' => hash('sha256', $token)]);
    $this->withToken($token)->postJson('/mcp', escapeTool('record-coaching-activity', escapeActivity($this->session, 'hint')))->assertJsonPath('result.isError', false);
    expect(CoachingActivityEvent::query()->sole()->client_connection_id)->toBe($client->id);
});

test('escape never advances progress and caps learner evidence from that session at Guided', function () {
    $stage = fn () => app(BuildLearningProgress::class)->handle($this->learner)['competencies'][0]['stage'];
    CoachingActivityEvent::factory()->create(['learner_id' => $this->learner->id, 'coaching_session_id' => $this->session->id, 'kind' => 'solution_escape']);
    expect($stage())->toBe('introduced');
    $event = LearningEvidence::factory()->create(['learner_id' => $this->learner->id, 'coaching_session_id' => $this->session->id, 'competency_id' => $this->objective->id, 'evidence' => ['activity' => 'implementation', 'assistance' => 'review_only', 'hints_used' => 0, 'ownership' => 'agent', 'learner_work' => '', 'agent_work' => 'Provided implementation', 'verification' => ['passed' => true, 'reference' => 'Tests passed'], 'teach_back' => ['demonstrated' => true, 'summary' => 'Explained it'], 'context_key' => 'validation', 'context_description' => 'HTTP validation', 'source' => 'agent']]);
    expect($stage())->toBe('introduced');
    LearningEvidence::factory()->create(['learner_id' => $this->learner->id, 'coaching_session_id' => $this->session->id, 'competency_id' => $this->objective->id, 'evidence' => [...$event->evidence, 'ownership' => 'learner', 'learner_work' => 'Wrote the validation rules']]);
    expect($stage())->toBe('guided');
    $progress = app(BuildLearningProgress::class)->handle($this->learner);
    expect($progress['competencies'][0]['supporting_evidence'][0]['solution_escape_used'])->toBeTrue();
});

test('Learner and authorized Mentor see activity summaries in the platform and outsiders cannot', function () {
    $this->postJson('/mcp', escapeTool('record-coaching-activity', $this->attempt))->assertJsonPath('result.isError', false);
    foreach ([$this->learner, $this->learner->mentor] as $viewer) {
        $this->actingAs($viewer)->get(route('coaching-records.show', $this->learner))->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->has('learningActivities', 1)->where('learningActivities.0.kind', 'accepted_attempt')->where('learningActivities.0.payload.acceptance_rationale', $this->attempt['acceptance_rationale']));
    }
    $this->actingAs(User::factory()->mentor()->create())->get(route('coaching-records.show', $this->learner))->assertForbidden();
});

test('an escaped session cannot erase independent evidence from a separate session', function () {
    $otherSession = CoachingSession::factory()->create(['learner_id' => $this->learner->id, 'primary_learning_objective_id' => $this->objective->id]);
    $event = LearningEvidence::factory()->create(['learner_id' => $this->learner->id, 'coaching_session_id' => $otherSession->id, 'competency_id' => $this->objective->id]);
    LearningEvidence::factory()->create(['learner_id' => $this->learner->id, 'coaching_session_id' => $otherSession->id, 'competency_id' => $this->objective->id, 'evidence' => [...$event->evidence, 'assistance' => 'review_only', 'hints_used' => 0]]);
    CoachingActivityEvent::factory()->create(['learner_id' => $this->learner->id, 'coaching_session_id' => $this->session->id, 'kind' => 'solution_escape']);
    expect(app(BuildLearningProgress::class)->handle($this->learner)['competencies'][0]['stage'])->toBe('independent');
});

test('durable requested hints prevent claimed unassisted evidence from becoming Independent', function () {
    $this->postJson('/mcp', escapeTool('record-coaching-activity', escapeActivity($this->session, 'recorded-hint')))->assertJsonPath('result.isError', false);
    $this->postJson('/mcp', escapeTool('record-learning-evidence', [
        'schema_version' => 1, 'session_id' => $this->session->id, 'competency_id' => $this->objective->id, 'idempotency_key' => 'underreported-hint',
        'activity' => 'implementation', 'assistance' => 'review_only', 'hints_used' => 0, 'ownership' => 'learner',
        'learner_work' => 'Implemented input boundary validation', 'agent_work' => '',
        'verification' => ['passed' => true, 'reference' => 'Boundary validation tests passed'],
        'teach_back' => ['demonstrated' => true, 'summary' => 'Explained the zero boundary'],
        'context_key' => 'validation', 'context_description' => 'HTTP input validation', 'source' => 'agent',
    ]))->assertJsonPath('result.isError', false)
        ->assertJsonPath('result.structuredContent.progress.competencies.0.stage', 'guided')
        ->assertJsonPath('result.structuredContent.progress.competencies.0.assistance_trend.0.hints_used', 1)
        ->assertJsonPath('result.structuredContent.progress.competencies.0.supporting_evidence.0.recorded_hints_used', 1);
});
