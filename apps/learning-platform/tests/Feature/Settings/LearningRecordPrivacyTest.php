<?php

use App\Actions\DeleteLearningAccount;
use App\Models\Assessment;
use App\Models\BaselineAssessmentProposal;
use App\Models\CatalogProposal;
use App\Models\CatalogProposalNode;
use App\Models\ClientAuthorization;
use App\Models\ClientConnection;
use App\Models\CoachingActivityEvent;
use App\Models\CoachingPriority;
use App\Models\CoachingSession;
use App\Models\Competency;
use App\Models\CompetencyMerge;
use App\Models\EnrolledRepository;
use App\Models\HandoffSnapshot;
use App\Models\LearnerInvitation;
use App\Models\LearningEvidence;
use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;

function populatedLearningRecord(): array
{
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $client = ClientConnection::factory()->for($learner, 'learner')->create();
    $authorization = ClientAuthorization::factory()->approved($client)->create();
    $invitation = LearnerInvitation::factory()->create(['mentor_id' => $mentor->id, 'email' => $learner->email, 'accepted_by_user_id' => $learner->id, 'accepted_at' => now()]);
    $repository = EnrolledRepository::factory()->for($learner, 'learner')->create();
    $competency = Competency::factory()->forLearner($learner)->create();
    $child = Competency::factory()->forLearner($learner)->create(['parent_id' => $competency->id]);
    $merge = CompetencyMerge::factory()->create(['source_competency_id' => $child->id, 'target_competency_id' => $competency->id, 'merged_by_id' => $mentor->id]);
    $proposal = CatalogProposal::factory()->create(['learner_id' => $learner->id, 'client_connection_id' => $client->id, 'reviewed_by_id' => $mentor->id]);
    $node = CatalogProposalNode::factory()->create(['catalog_proposal_id' => $proposal->id, 'copied_competency_id' => $competency->id]);
    $baseline = BaselineAssessmentProposal::factory()->create(['catalog_proposal_id' => $proposal->id, 'catalog_proposal_node_id' => $node->id, 'reviewed_by_id' => $mentor->id]);
    $assessment = Assessment::factory()->create(['learner_id' => $learner->id, 'competency_id' => $competency->id, 'assessed_by_id' => $mentor->id, 'baseline_assessment_proposal_id' => $baseline->id]);
    $priority = CoachingPriority::factory()->create(['learner_id' => $learner->id, 'competency_id' => $competency->id, 'created_by_id' => $mentor->id]);
    $work = WorkItem::factory()->create(['learner_id' => $learner->id, 'enrolled_repository_id' => $repository->id]);
    $session = CoachingSession::factory()->create(['learner_id' => $learner->id, 'work_item_id' => $work->id, 'primary_learning_objective_id' => $competency->id, 'client_connection_id' => $client->id]);
    $activity = CoachingActivityEvent::factory()->create(['learner_id' => $learner->id, 'coaching_session_id' => $session->id, 'client_connection_id' => $client->id, 'kind' => 'hint', 'payload' => ['summary' => 'Check the JSON response header.']]);
    $evidence = LearningEvidence::factory()->create(['learner_id' => $learner->id, 'coaching_session_id' => $session->id, 'competency_id' => $competency->id, 'recorded_by_id' => $learner->id, 'client_connection_id' => $client->id]);
    $correction = LearningEvidence::factory()->create(['learner_id' => $learner->id, 'coaching_session_id' => $session->id, 'competency_id' => $competency->id, 'recorded_by_id' => $mentor->id, 'client_connection_id' => $client->id, 'supersedes_id' => $evidence->id]);
    $handoff = HandoffSnapshot::factory()->create(['learner_id' => $learner->id, 'coaching_session_id' => $session->id, 'mentor_id' => $mentor->id, 'shared_at' => now()]);

    return compact('mentor', 'learner', 'client', 'authorization', 'invitation', 'repository', 'competency', 'child', 'merge', 'proposal', 'node', 'baseline', 'assessment', 'priority', 'work', 'session', 'activity', 'evidence', 'correction', 'handoff');
}

beforeEach(function () {
    $this->withoutVite();
});

test('export requires authentication recent password confirmation and a Learner account', function () {
    $this->get(route('learning-record.export'))->assertRedirect(route('login'));
    $learner = User::factory()->learner()->create();
    $this->actingAs($learner)->get(route('learning-record.export'))->assertRedirect(route('password.confirm'));
    $this->actingAs(User::factory()->mentor()->create())->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('learning-record.export'))->assertForbidden();
});

test('the downloadable complete record contains only this Learner and excludes authentication material', function () {
    $own = populatedLearningRecord();
    $other = populatedLearningRecord();
    $this->actingAs($own['learner'])->withSession(['auth.password_confirmed_at' => time()]);
    $response = $this->get(route('learning-record.export', ['learner_id' => $other['learner']->id]))
        ->assertOk()->assertDownload()->assertHeader('Content-Type', 'application/json; charset=UTF-8');
    expect($response->headers->get('Cache-Control'))->toContain('no-store', 'private');
    $json = $response->streamedContent();
    $record = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
    expect($record['account']['id'])->toBe($own['learner']->id)
        ->and($record['learning_evidence'])->toHaveCount(2)
        ->and($record['learning_evidence'][1]['supersedes_id'])->toBe($own['evidence']->id)
        ->and($record['handoff_snapshots'][0]['payload'])->toBe($own['handoff']->payload)
        ->and($record['catalog_proposal_nodes'][0]['id'])->toBe($own['node']->id);
    foreach (['competencies', 'competency_merges', 'catalog_proposals', 'catalog_proposal_nodes', 'baseline_assessment_proposals', 'assessments', 'coaching_priorities', 'repositories', 'work_items', 'coaching_sessions', 'coaching_activity_events', 'learning_evidence', 'handoff_snapshots', 'client_connections', 'client_authorizations', 'accepted_invitations'] as $section) {
        expect($record[$section])->not->toBeEmpty();
    }
    expect($json)->not->toContain($other['learner']->email, $other['learner']->name, $own['learner']->password, $own['client']->token_hash,
        'token_hash', 'device_code_hash', 'user_code_hash', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'request_hash');
});

test('populated Learner account deletion removes dependent records and preserves other Learners', function () {
    $own = populatedLearningRecord();
    $other = populatedLearningRecord();
    DB::table('password_reset_tokens')->insert(['email' => $own['learner']->email, 'token' => 'private-reset-token', 'created_at' => now()]);
    $this->actingAs($own['learner'])->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertSessionHasNoErrors()->assertRedirect(route('home'));
    $this->assertGuest();
    foreach ($own as $key => $model) {
        if ($key !== 'mentor') {
            expect($model->fresh(), $key)->toBeNull();
        }
    }
    foreach ($other as $model) {
        expect($model->fresh())->not->toBeNull();
    }
    expect($own['mentor']->fresh())->not->toBeNull();
    $this->assertDatabaseMissing('password_reset_tokens', ['email' => $own['learner']->email]);
});

test('Mentor deletion with attached Learners is actionable and never deletes their records or logs out', function () {
    $records = populatedLearningRecord();
    $this->actingAs($records['mentor'])->from(route('profile.edit'))
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertRedirect(route('profile.edit'))->assertSessionHasErrors(['account' => 'Reassign your attached Learners to another Mentor before deleting your account. Their learning records will be preserved.']);
    $this->assertAuthenticatedAs($records['mentor']);
    foreach ($records as $model) {
        expect($model->fresh())->not->toBeNull();
    }
});

test('former Mentor attribution prevents cascading evidence deletion in other Learner records', function () {
    $records = populatedLearningRecord();
    $records['learner']->update(['mentor_id' => User::factory()->mentor()->create()->id]);
    $this->actingAs($records['mentor'])->delete(route('profile.destroy'), ['password' => 'password'])->assertSessionHasErrors('account');
    expect($records['correction']->fresh())->not->toBeNull();
    $this->assertAuthenticatedAs($records['mentor']);
});

test('failure at the final account deletion rolls back all learning record removal', function () {
    $records = populatedLearningRecord();
    $event = 'eloquent.deleting: '.User::class;
    Event::listen($event, fn () => throw new RuntimeException('Simulated storage failure'));
    try {
        expect(fn () => app(DeleteLearningAccount::class)->handle($records['learner']))->toThrow(RuntimeException::class);
    } finally {
        Event::forget($event);
    }
    foreach ($records as $model) {
        expect($model->fresh())->not->toBeNull();
    }
});
