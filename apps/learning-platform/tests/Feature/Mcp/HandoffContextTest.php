<?php

use App\Actions\BuildLearningProgress;
use App\Models\ClientConnection;
use App\Models\CoachingSession;
use App\Models\Competency;
use App\Models\EnrolledRepository;
use App\Models\HandoffSnapshot;
use App\Models\LearningEvidence;
use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Support\Facades\Notification;

function handoffArguments(CoachingSession $session): array
{
    return [
        'contract_version' => '1',
        'session_id' => $session->id,
        'idempotency_key' => 'handoff-preview-1',
        'current_understanding' => 'The request validates before the controller runs.',
        'exact_error_or_unexpected_behavior' => 'The test expects status 422 but receives 302.',
        'likely_knowledge_gap' => 'How JSON content negotiation changes validation responses.',
        'relevant_artifacts' => ['tests/Feature/ProfileTest.php', 'ProfileRequest::rules'],
        'attempts' => ['Added the required field rule; the redirect assertion still fails.'],
        'agent_hypotheses' => ['The test might not request a JSON response.'],
        'mentor_questions' => ['What request header distinguishes JSON validation responses from redirects?'],
    ];
}

function handoffTool(string $name, array $arguments): array
{
    return ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/call', 'params' => ['name' => $name, 'arguments' => $arguments]];
}

beforeEach(function () {
    $this->withoutVite();
    $this->mentor = User::factory()->mentor()->create();
    $this->learner = User::factory()->learner($this->mentor)->create();
    $this->token = 'jm_'.str_repeat('h', 64);
    $client = ClientConnection::factory()->for($this->learner, 'learner')->create(['token_hash' => hash('sha256', $this->token)]);
    $this->repository = EnrolledRepository::factory()->for($this->learner, 'learner')->create();
    $work = WorkItem::factory()->for($this->learner, 'learner')->for($this->repository)->create(['title' => 'Validate profile input']);
    $this->competency = Competency::factory()->forLearner($this->learner)->create();
    $this->session = CoachingSession::factory()->create(['learner_id' => $this->learner->id, 'work_item_id' => $work->id, 'primary_learning_objective_id' => $this->competency->id, 'client_connection_id' => $client->id]);
});

test('a blocked Help Me MCP flow reads context without writes then explicitly prepares a private review', function () {
    Notification::fake();
    $beforeProgress = app(BuildLearningProgress::class)->handle($this->learner);
    $beforeSession = $this->session->getAttributes();
    $args = handoffArguments($this->session);
    $this->withToken($this->token)->postJson('/mcp', handoffTool('get-handoff-context', $args))->assertOk()
        ->assertJsonPath('result.isError', false)
        ->assertJsonPath('result.structuredContent.facts.task.title', 'Validate profile input')
        ->assertJsonPath('result.structuredContent.likely_knowledge_gap.kind', 'hypothesis')
        ->assertJsonPath('result.structuredContent.facts.exact_error_or_unexpected_behavior', $args['exact_error_or_unexpected_behavior'])
        ->assertJsonCount(1, 'result.structuredContent.mentor_questions');
    expect(HandoffSnapshot::count())->toBe(0);
    foreach ([1, 2] as $attempt) {
        $this->withToken($this->token)->postJson('/mcp', handoffTool('prepare-handoff', $args))->assertOk()
            ->assertJsonPath('result.isError', false)->assertJsonPath('result.structuredContent.shared', false);
    }
    expect(HandoffSnapshot::count())->toBe(1)->and(HandoffSnapshot::sole()->shared_at)->toBeNull()
        ->and($this->session->fresh()->getAttributes())->toBe($beforeSession)
        ->and(app(BuildLearningProgress::class)->handle($this->learner))->toBe($beforeProgress)
        ->and(LearningEvidence::count())->toBe(0);
    Notification::assertNothingSent();
    $this->actingAs($this->mentor)->get(route('handoffs.show', HandoffSnapshot::sole()))->assertForbidden();
});

test('handoff MCP refuses foreign sessions and unenrolled repositories', function () {
    $foreign = CoachingSession::factory()->create();
    $this->withToken($this->token)->postJson('/mcp', handoffTool('prepare-handoff', handoffArguments($foreign)))
        ->assertOk()->assertJsonPath('result.isError', true);
    $this->repository->update(['unenrolled_at' => now()]);
    $this->withToken($this->token)->postJson('/mcp', handoffTool('get-handoff-context', handoffArguments($this->session)))
        ->assertOk()->assertJsonPath('result.isError', true);
    expect(HandoffSnapshot::count())->toBe(0);
});

test('handoff persistence allowlists fields and sanitizes reports before storage', function () {
    $args = [...handoffArguments($this->session),
        'current_understanding' => "password=secret with spaces\nThe request is validated.",
        'agent_hypotheses' => ['The learner is lazy'],
        'relevant_artifacts' => ['https://user:pass@example.test/issues/12?token=private'],
        'raw_transcript' => 'Unrelated private discussion',
        'hidden_notes' => 'Another private note',
    ];
    $this->withToken($this->token)->postJson('/mcp', handoffTool('prepare-handoff', $args))->assertOk()->assertJsonPath('result.isError', false);
    $stored = json_encode(HandoffSnapshot::sole()->payload);
    expect($stored)->not->toContain('secret with spaces', 'lazy', 'user:pass', 'token=private', 'Unrelated private discussion', 'Another private note', 'raw_transcript', 'hidden_notes');
});

test('handoff MCP rejects nested raw material in string-only artifact and attempt fields', function () {
    $args = [...handoffArguments($this->session), 'attempts' => [['raw_transcript' => 'private']]];
    $this->withToken($this->token)->postJson('/mcp', handoffTool('prepare-handoff', $args))->assertOk()->assertJsonPath('result.isError', true);
    expect(HandoffSnapshot::count())->toBe(0);
});

test('a retry returns the original preview even when session context changes and conflicting reuse fails', function () {
    $args = handoffArguments($this->session);
    $response = $this->withToken($this->token)->postJson('/mcp', handoffTool('prepare-handoff', $args))->assertOk();
    $original = $response->json('result.structuredContent');
    $this->session->workItem->update(['title' => 'A changed title']);
    $this->withToken($this->token)->postJson('/mcp', handoffTool('prepare-handoff', $args))
        ->assertOk()->assertJsonPath('result.structuredContent', $original);
    $this->withToken($this->token)->postJson('/mcp', handoffTool('prepare-handoff', [...$args, 'current_understanding' => 'A different observation']))
        ->assertOk()->assertJsonPath('result.isError', true);
    expect(HandoffSnapshot::count())->toBe(1);
});

test('shared progress includes relevant sanitized evidence and excludes raw extra fields and unrelated competencies', function () {
    $evidence = LearningEvidence::factory()->make(['coaching_session_id' => $this->session->id, 'learner_id' => $this->learner->id, 'competency_id' => $this->competency->id])->evidence;
    $evidence['learner_work'] = 'Changed validation; token=private credential';
    $evidence['teach_back']['summary'] = 'Explained rules; api_key=another secret';
    $evidence['raw_transcript'] = 'Hidden conversation';
    $evidence['agent_work'] = 'Unshared implementation notes';
    LearningEvidence::factory()->create(['coaching_session_id' => $this->session->id, 'learner_id' => $this->learner->id, 'competency_id' => $this->competency->id, 'evidence' => $evidence]);
    Competency::factory()->forLearner($this->learner)->create(['name' => 'Unrelated competency']);
    $response = $this->withToken($this->token)->postJson('/mcp', handoffTool('prepare-handoff', handoffArguments($this->session)))
        ->assertOk()->assertJsonPath('result.isError', false)
        ->assertJsonCount(1, 'result.structuredContent.progress.competencies')
        ->assertJsonCount(1, 'result.structuredContent.progress.competencies.0.supporting_evidence');
    expect(json_encode($response->json('result.structuredContent.progress')))->not->toContain('private credential', 'another secret', 'Hidden conversation', 'Unshared implementation notes', 'Unrelated competency', 'raw_transcript');
});

test('after Mentor help the same session records changed understanding as ordinary reflection without changing the shared snapshot', function () {
    $args = handoffArguments($this->session);
    $this->withToken($this->token)->postJson('/mcp', handoffTool('prepare-handoff', $args))->assertOk();
    $handoff = HandoffSnapshot::sole();
    $snapshot = $handoff->payload;
    $this->withToken($this->token)->postJson('/mcp', handoffTool('complete-coaching-session', [
        'contract_version' => '1', 'session_id' => $this->session->id, 'idempotency_key' => 'after-mentor-help',
        'outcome' => 'The validation test passes with a JSON request.',
        'reflection' => 'I now understand that the Accept header determines JSON validation errors versus redirects.',
        'unresolved_questions' => [], 'next_challenge' => 'Test a different validation failure without hints.',
    ]))->assertOk()->assertJsonPath('result.isError', false)
        ->assertJsonPath('result.structuredContent.receipt.reflection', 'I now understand that the Accept header determines JSON validation errors versus redirects.');
    expect($handoff->fresh()->payload)->toBe($snapshot)->and(LearningEvidence::count())->toBe(0);
});
