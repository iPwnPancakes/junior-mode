<?php

use App\Actions\BuildLearningProgress;
use App\Actions\RecordLearningEvidence;
use App\BaselineAssessmentLevel;
use App\Models\Assessment;
use App\Models\ClientConnection;
use App\Models\CoachingSession;
use App\Models\Competency;
use App\Models\EnrolledRepository;
use App\Models\LearningEvidence;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Symfony\Component\HttpKernel\Exception\HttpException;

function evidenceCall(string $name, array $arguments): array
{
    return ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/call', 'params' => ['name' => $name, 'arguments' => $arguments]];
}

function evidencePayload(int $session, int $competency, array $overrides = []): array
{
    return [
        'session_id' => $session, 'schema_version' => 1, 'idempotency_key' => 'evidence-1', 'competency_id' => $competency,
        'activity' => 'implementation', 'assistance' => 'guided', 'hints_used' => 1,
        'ownership' => 'learner', 'learner_work' => 'Implemented validation rules', 'agent_work' => 'Explained request lifecycle',
        'verification' => ['passed' => true, 'reference' => 'Profile validation tests passed'],
        'teach_back' => ['demonstrated' => true, 'summary' => 'Explained why authorization precedes validation'],
        'context_key' => 'profile-validation', 'context_description' => 'HTTP profile input validation',
        'source' => 'agent', ...$overrides,
    ];
}

beforeEach(function () {
    $this->learner = User::factory()->learner()->create();
    $this->token = 'jm_'.str_repeat('e', 64);
    $this->client = ClientConnection::factory()->for($this->learner, 'learner')->create(['token_hash' => hash('sha256', $this->token)]);
    $this->repository = EnrolledRepository::factory()->for($this->learner, 'learner')->create();
    $this->competency = Competency::factory()->forLearner($this->learner)->create(['name' => 'Validation', 'technologies' => ['Laravel']]);
    $this->startup = [
        'contract_version' => '2', 'repository_identity' => $this->repository->identity,
        'title' => 'Validate profiles', 'description' => 'Validate profile input', 'detected_technologies' => ['Laravel'], 'likely_catalog_branches' => [],
        'primary_learning_objective_id' => $this->competency->id, 'idempotency_key' => 'start-1',
        'desired_outcome' => 'Reject invalid profiles', 'acceptance_criteria' => ['Invalid email rejected'],
        'responsibility_split' => ['agent' => 'Test shell', 'learner' => 'Validation rules'],
    ];
    $this->withToken($this->token)->postJson('/mcp', evidenceCall('start-coaching-session', $this->startup))->assertOk()->assertJsonPath('result.isError', false);
    $this->session = CoachingSession::query()->sole();
});

test('representative Help Me MCP flow returns an idempotent final learning receipt', function () {
    $payload = evidencePayload($this->session->id, $this->competency->id);
    foreach ([1, 2] as $attempt) {
        $this->postJson('/mcp', evidenceCall('start-coaching-session', $this->startup))->assertJsonPath('result.structuredContent.session.id', $this->session->id);
        $this->postJson('/mcp', evidenceCall('record-learning-evidence', $payload))->assertJsonPath('result.isError', false)->assertJsonPath('result.structuredContent.progress.competencies.0.stage', 'guided');
    }
    $completion = ['contract_version' => '1', 'session_id' => $this->session->id, 'idempotency_key' => 'complete-1', 'outcome' => 'Invalid input rejected', 'reflection' => 'I understand validation order', 'unresolved_questions' => [], 'next_challenge' => 'Validate queued import data'];
    foreach ([1, 2] as $attempt) {
        $this->postJson('/mcp', evidenceCall('complete-coaching-session', $completion))->assertJsonPath('result.isError', false)->assertJsonPath('result.structuredContent.status', 'concluded')->assertJsonPath('result.structuredContent.receipt.next_challenge', 'Validate queued import data')->assertJsonPath('result.structuredContent.progress.competencies.0.stage', 'guided');
    }
    $this->postJson('/mcp', evidenceCall('start-coaching-session', $this->startup))->assertJsonPath('result.structuredContent.session.status', 'concluded');
    expect(LearningEvidence::query()->count())->toBe(1)->and(CoachingSession::query()->count())->toBe(1);
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', [...$payload, 'idempotency_key' => 'late-event']))->assertJsonPath('result.isError', true);
    $this->postJson('/mcp', evidenceCall('get-progress', ['contract_version' => '1']))->assertJsonPath('result.structuredContent.competencies.0.stage', 'guided');
});

test('all four stages derive only from qualifying learner evidence across different tasks', function () {
    $progress = fn () => app(BuildLearningProgress::class)->handle($this->learner)['competencies'][0]['stage'];
    expect($progress())->toBe('introduced');
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', evidencePayload($this->session->id, $this->competency->id)))->assertJsonPath('result.isError', false);
    expect($progress())->toBe('guided');
    $independent = evidencePayload($this->session->id, $this->competency->id, ['idempotency_key' => 'independent', 'assistance' => 'review_only', 'hints_used' => 0]);
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', $independent))->assertJsonPath('result.isError', false);
    expect($progress())->toBe('independent');
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', [...$independent, 'idempotency_key' => 'same-task', 'context_key' => 'other', 'context_description' => 'Changed label']))->assertJsonPath('result.isError', false);
    expect($progress())->toBe('independent');
    $this->postJson('/mcp', evidenceCall('start-coaching-session', [...$this->startup, 'idempotency_key' => 'start-2', 'title' => 'Validate queued imports', 'description' => 'Validate a queue job payload']))->assertJsonPath('result.isError', false);
    $second = CoachingSession::query()->latest('id')->first();
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', [...$independent, 'session_id' => $second->id, 'idempotency_key' => 'transfer', 'context_key' => 'queue', 'context_description' => 'Queued import validates without HTTP request lifecycle', 'transfer_from_id' => LearningEvidence::query()->where('idempotency_key', 'independent')->value('id'), 'material_difference' => 'Applies validation to an asynchronous import without HTTP request validation']))->assertJsonPath('result.isError', false);
    expect($progress())->toBe('transferable');
});

test('agent work tests alone solutions hints and automatic checks cannot establish independence', function (array $overrides, string $stage) {
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', evidencePayload($this->session->id, $this->competency->id, ['assistance' => 'review_only', 'hints_used' => 0, ...$overrides])))->assertJsonPath('result.isError', false)->assertJsonPath('result.structuredContent.progress.competencies.0.stage', $stage);
})->with([
    'agent ownership' => [['ownership' => 'agent'], 'introduced'],
    'no learner portion' => [['learner_work' => ' '], 'introduced'],
    'tests without understanding' => [['teach_back' => ['demonstrated' => false, 'summary' => 'No teach-back attempted']], 'introduced'],
    'unverified work' => [['verification' => ['passed' => false, 'reference' => 'Tests fail']], 'introduced'],
    'provided solution' => [['assistance' => 'solution_provided'], 'introduced'],
    'explanation alone' => [['activity' => 'explanation'], 'introduced'],
    'demonstration' => [['activity' => 'demonstration'], 'introduced'],
    'automatic test result' => [['source' => 'automated_check'], 'introduced'],
    'hint used' => [['hints_used' => 1], 'guided'],
]);

test('corrections append preserve originals and recompute stages downward', function () {
    $payload = evidencePayload($this->session->id, $this->competency->id, ['assistance' => 'review_only', 'hints_used' => 0]);
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', $payload))->assertJsonPath('result.structuredContent.progress.competencies.0.stage', 'independent');
    $original = LearningEvidence::query()->sole();
    $correction = [...$payload, 'idempotency_key' => 'correction', 'supersedes_id' => $original->id, 'correction_reason' => 'The implementation was supplied by the agent', 'ownership' => 'agent'];
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', $correction))->assertJsonPath('result.structuredContent.progress.competencies.0.stage', 'introduced');
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', $correction))->assertJsonPath('result.isError', false);
    expect(LearningEvidence::query()->count())->toBe(2)->and($original->fresh()->evidence['ownership'])->toBe('learner');
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', [...$correction, 'idempotency_key' => 'stale-correction']))->assertJsonPath('result.isError', true);
    expect(fn () => $original->update(['evidence' => []]))->toThrow(LogicException::class);
});

test('writes reject mismatched retry keys invalid evidence and direct stage inputs', function () {
    $payload = evidencePayload($this->session->id, $this->competency->id);
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', $payload))->assertJsonPath('result.isError', false);
    foreach ([['activity' => 'debugging'], ['idempotency_key' => 'bad', 'stage' => 'independent'], ['idempotency_key' => 'bad', 'score' => 10], ['idempotency_key' => 'bad', 'learner_id' => $this->learner->id], ['idempotency_key' => 'bad', 'competency_id' => 9999], ['idempotency_key' => 'bad', 'verification' => ['passed' => true]], ['idempotency_key' => 'bad', 'schema_version' => 2]] as $invalid) {
        $this->postJson('/mcp', evidenceCall('record-learning-evidence', [...$payload, ...$invalid]))->assertJsonPath('result.isError', true);
    }
    $this->postJson('/mcp', evidenceCall('start-coaching-session', [...$this->startup, 'desired_outcome' => 'Changed']))->assertJsonPath('result.isError', true);
    expect(LearningEvidence::query()->count())->toBe(1);
});

test('another learner cannot read write complete or correct the session', function () {
    $other = User::factory()->learner()->create();
    $token = 'jm_'.str_repeat('z', 64);
    ClientConnection::factory()->for($other, 'learner')->create(['token_hash' => hash('sha256', $token)]);
    $this->withToken($token)->postJson('/mcp', evidenceCall('record-learning-evidence', evidencePayload($this->session->id, $this->competency->id)))->assertJsonPath('result.isError', true);
    $this->postJson('/mcp', evidenceCall('get-progress', ['contract_version' => '1', 'competency_id' => $this->competency->id]))->assertJsonPath('result.isError', true);
    $this->postJson('/mcp', evidenceCall('complete-coaching-session', ['contract_version' => '1', 'session_id' => $this->session->id]))->assertJsonPath('result.isError', true);
    expect(fn () => app(RecordLearningEvidence::class)->handle($other, $this->session, evidencePayload($this->session->id, $this->competency->id)))->toThrow(HttpException::class);
    expect(LearningEvidence::query()->count())->toBe(0);
});

test('client source cannot impersonate a mentor and secrets are rejected', function () {
    foreach ([['source' => 'mentor'], ['source' => 'learner'], ['learner_work' => 'api_key=secret-value'], ['teach_back' => ['demonstrated' => true, 'summary' => '```php source code```']]] as $invalid) {
        $this->postJson('/mcp', evidenceCall('record-learning-evidence', evidencePayload($this->session->id, $this->competency->id, $invalid)))->assertJsonPath('result.isError', true);
    }
    expect(LearningEvidence::query()->count())->toBe(0);
});

test('nested object order does not change idempotency and fresh brief resumes the active task', function () {
    $payload = evidencePayload($this->session->id, $this->competency->id);
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', $payload))->assertJsonPath('result.isError', false);
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', [...$payload, 'verification' => ['reference' => 'Profile validation tests passed', 'passed' => true]]))->assertJsonPath('result.isError', false);
    $this->postJson('/mcp', evidenceCall('start-coaching-session', [...$this->startup, 'idempotency_key' => 'new-key']))->assertJsonPath('result.isError', true);
    $this->postJson('/mcp', evidenceCall('get-coaching-brief', [...$this->startup, 'contract_version' => '1']))->assertJsonPath('result.structuredContent.active_sessions.0.id', $this->session->id)->assertJsonPath('result.structuredContent.coaching_brief.0.learning_progress.stage', 'guided');
    expect(LearningEvidence::query()->count())->toBe(1)->and(CoachingSession::query()->count())->toBe(1);
});

test('Learners and their Mentor can append browser corrections with empty agent contributions', function () {
    $payload = evidencePayload($this->session->id, $this->competency->id, ['agent_work' => '', 'assistance' => 'review_only', 'hints_used' => 0]);
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', $payload))->assertJsonPath('result.isError', false);
    $original = LearningEvidence::query()->sole();
    $this->actingAs($this->learner)->get(route('coaching-records.show', $this->learner))->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->where('learningProgress.competencies.0.stage', 'independent'));
    $correction = ['evidence' => [...$original->evidence, 'ownership' => 'agent', 'learner_work' => ''], 'correction_reason' => 'The agent supplied this implementation'];
    $this->actingAs($this->learner)->post(route('learning-evidence-corrections.store', $original), $correction)->assertSessionHasNoErrors()->assertRedirect(route('coaching-records.show', $this->learner));
    $this->post(route('learning-evidence-corrections.store', $original), $correction)->assertSessionHasNoErrors();
    expect(LearningEvidence::query()->count())->toBe(2)->and(app(BuildLearningProgress::class)->handle($this->learner)['competencies'][0]['stage'])->toBe('introduced');
    $latest = LearningEvidence::query()->latest('id')->first();
    $this->actingAs($this->learner->mentor)->post(route('learning-evidence-corrections.store', $latest), ['evidence' => [...$latest->evidence, 'ownership' => 'learner', 'learner_work' => 'Learner implemented it'], 'correction_reason' => 'Reviewed authorship together'])->assertSessionHasNoErrors();
    expect(LearningEvidence::query()->latest('id')->first()->evidence['source'])->toBe('mentor');
    $this->actingAs(User::factory()->mentor()->create())->post(route('learning-evidence-corrections.store', $latest), $correction)->assertForbidden();
});

test('same context or task reference does not establish transferable progress', function () {
    $first = evidencePayload($this->session->id, $this->competency->id, ['assistance' => 'review_only', 'hints_used' => 0]);
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', $first))->assertJsonPath('result.isError', false);
    $original = LearningEvidence::query()->sole();
    $this->postJson('/mcp', evidenceCall('start-coaching-session', [...$this->startup, 'idempotency_key' => 'other-start', 'title' => 'Different task']))->assertJsonPath('result.isError', false);
    $session = CoachingSession::query()->latest('id')->first();
    $second = [...$first, 'session_id' => $session->id, 'idempotency_key' => 'other-evidence', 'transfer_from_id' => (string) $original->id, 'material_difference' => 'Both tasks validate an HTTP profile endpoint'];
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', $second))->assertJsonPath('result.structuredContent.progress.competencies.0.stage', 'independent');
    $this->postJson('/mcp', evidenceCall('record-learning-evidence', [...$second, 'idempotency_key' => 'no-explanation', 'material_difference' => '']))->assertJsonPath('result.isError', true);
});

test('MCP exposes evidence schemas without direct stage mutation and Mentor assessments remain separate', function () {
    $this->postJson('/mcp', ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list'])->assertOk()->assertJsonFragment(['name' => 'record-learning-evidence'])->assertJsonFragment(['name' => 'get-progress']);
    Assessment::factory()->create(['learner_id' => $this->learner->id, 'competency_id' => $this->competency->id, 'assessed_by_id' => $this->learner->mentor_id, 'level' => BaselineAssessmentLevel::Independent]);
    $this->postJson('/mcp', evidenceCall('get-progress', ['contract_version' => '1']))->assertJsonPath('result.structuredContent.competencies.0.stage', 'introduced')->assertJsonPath('result.structuredContent.competencies.0.has_evidence', false)->assertJsonPath('result.structuredContent.competencies.0.mentor_assessment.level', 'independent');
});
