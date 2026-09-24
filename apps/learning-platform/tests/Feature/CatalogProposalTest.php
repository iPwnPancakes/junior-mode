<?php

use App\BaselineAssessmentDecision;
use App\BaselineAssessmentLevel;
use App\CatalogProposalStatus;
use App\Models\Assessment;
use App\Models\CatalogProposal;
use App\Models\ClientConnection;
use App\Models\CompetencyTemplate;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function createCatalogProposal(User $learner): CatalogProposal
{
    $connection = ClientConnection::factory()->for($learner, 'learner')->create([
        'name' => 'Mentor Mode on MacBook',
    ]);

    return CatalogProposal::factory()
        ->for($learner, 'learner')
        ->for($connection, 'clientConnection')
        ->create([
            'interview_context' => [
                'stacks' => ['TypeScript', 'React'],
                'codebases' => ['Customer dashboard'],
                'expected_work' => ['Build accessible forms'],
                'development_goals' => ['Reason about state flow'],
            ],
        ]);
}

function proposedNodePayload(array $overrides = []): array
{
    return [
        'name' => 'Component state',
        'definition' => 'How state changes drive visible interface behavior.',
        'demonstration_criteria' => 'Explains state ownership and implements a user-visible update.',
        'parent_id' => null,
        'position' => 0,
        'prerequisites' => 'JavaScript functions',
        'work_opportunities' => 'Form interactions',
        'technologies' => 'React, TypeScript',
        ...$overrides,
    ];
}

test('the associated Mentor can review the interview, proposed tree, and baseline Assessments', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create(['name' => 'Lee Learner']);
    $proposal = createCatalogProposal($learner);
    $root = $proposal->nodes()->create([
        ...proposedNodePayload(),
        'name' => 'React development',
        'prerequisites' => ['JavaScript'],
        'work_opportunities' => ['Feature work'],
        'technologies' => ['React'],
    ]);
    $baseline = $proposal->baselineAssessments()->create([
        'catalog_proposal_node_id' => $root->id,
        'level' => BaselineAssessmentLevel::NotYetObserved,
    ]);

    $this->actingAs($mentor)
        ->get(route('catalog-proposals.show', [$learner, $proposal]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('catalog-proposals/show')
            ->where('learner.id', $learner->id)
            ->where('proposal.status', 'awaiting_review')
            ->where('proposal.interviewContext.stacks.0', 'TypeScript')
            ->where('proposal.nodes.0.id', $root->id)
            ->where('proposal.baselineAssessments.0.id', $baseline->id)
            ->where('proposal.baselineAssessments.0.level', 'not_yet_observed')
        );
});

test('a Mentor can add, rename, move, remove, and select proposal branches before approval', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $proposal = createCatalogProposal($learner);
    $root = $proposal->nodes()->create(proposedNodePayload(['name' => 'Frontend development']));

    $this->actingAs($mentor)
        ->post(route('catalog-proposal-nodes.store', [$learner, $proposal]), proposedNodePayload([
            'name' => 'Accessible forms',
            'parent_id' => $root->id,
        ]))
        ->assertRedirect(route('catalog-proposals.show', [$learner, $proposal]));

    $child = $proposal->nodes()->where('name', 'Accessible forms')->firstOrFail();

    $this->actingAs($mentor)
        ->patch(route('catalog-proposal-nodes.update', [$learner, $proposal, $child]), proposedNodePayload([
            'name' => 'Accessible React forms',
            'parent_id' => null,
            'position' => 0,
        ]))
        ->assertRedirect();

    expect($child->fresh())
        ->name->toBe('Accessible React forms')
        ->parent_id->toBeNull();

    $grandchild = $proposal->nodes()->create([
        ...proposedNodePayload(['name' => 'Error announcements']),
        'parent_id' => $child->id,
        'prerequisites' => null,
        'work_opportunities' => null,
        'technologies' => null,
    ]);

    $this->actingAs($mentor)
        ->patch(route('catalog-proposal-selections.update', [$learner, $proposal, $child]), ['selected' => false])
        ->assertRedirect();

    expect($child->fresh()->selected)->toBeFalse()
        ->and($grandchild->fresh()->selected)->toBeFalse();

    $this->actingAs($mentor)
        ->delete(route('catalog-proposal-nodes.destroy', [$learner, $proposal, $child]))
        ->assertRedirect();

    $this->assertModelMissing($child);
    $this->assertModelMissing($grandchild);
    $this->assertModelExists($root);
});

test('approving selected branches copies only those nodes without changing reusable templates', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $proposal = createCatalogProposal($learner);
    $selectedRoot = $proposal->nodes()->create(proposedNodePayload(['name' => 'Selected root']));
    $proposal->nodes()->create([
        ...proposedNodePayload(['name' => 'Selected child']),
        'parent_id' => $selectedRoot->id,
        'prerequisites' => null,
        'work_opportunities' => null,
        'technologies' => null,
    ]);
    $proposal->nodes()->create(proposedNodePayload([
        'name' => 'Excluded root',
        'position' => 1,
        'selected' => false,
    ]));
    $template = CompetencyTemplate::factory()->create();
    $templateUpdatedAt = $template->updated_at;

    expect($learner->competencies()->count())->toBe(0);

    $this->actingAs($mentor)
        ->post(route('catalog-proposal-decisions.store', [$learner, $proposal]), ['decision' => 'approve'])
        ->assertRedirect();

    $approvedRoot = $learner->competencies()->where('name', 'Selected root')->firstOrFail();
    $approvedChild = $learner->competencies()->where('name', 'Selected child')->firstOrFail();

    expect($proposal->fresh()->status)->toBe(CatalogProposalStatus::Approved)
        ->and($learner->competencies()->count())->toBe(2)
        ->and($approvedChild->parent_id)->toBe($approvedRoot->id)
        ->and($learner->competencies()->where('name', 'Excluded root')->exists())->toBeFalse()
        ->and($template->fresh()->updated_at->equalTo($templateUpdatedAt))->toBeTrue();
});

test('baseline Assessment decisions are independent and apply only to an approved selected Competency', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $proposal = createCatalogProposal($learner);
    $selectedNode = $proposal->nodes()->create(proposedNodePayload(['name' => 'Selected node']));
    $excludedNode = $proposal->nodes()->create(proposedNodePayload([
        'name' => 'Excluded node',
        'position' => 1,
        'selected' => false,
    ]));
    $approvedBaseline = $proposal->baselineAssessments()->create([
        'catalog_proposal_node_id' => $selectedNode->id,
        'level' => BaselineAssessmentLevel::Developing,
        'rationale' => 'The Mentor observed a guided implementation.',
    ]);
    $rejectedBaseline = $proposal->baselineAssessments()->create([
        'catalog_proposal_node_id' => $excludedNode->id,
        'level' => BaselineAssessmentLevel::Independent,
        'rationale' => 'An unsupported guess.',
    ]);

    $this->actingAs($mentor)
        ->post(route('baseline-assessment-proposal-decisions.store', [
            $learner,
            $proposal,
            $approvedBaseline,
        ]), ['decision' => 'approved'])
        ->assertRedirect();
    $this->actingAs($mentor)
        ->post(route('baseline-assessment-proposal-decisions.store', [
            $learner,
            $proposal,
            $rejectedBaseline,
        ]), ['decision' => 'rejected'])
        ->assertRedirect();

    expect($approvedBaseline->fresh()->decision)->toBe(BaselineAssessmentDecision::Approved)
        ->and($rejectedBaseline->fresh()->decision)->toBe(BaselineAssessmentDecision::Rejected)
        ->and(Assessment::query()->count())->toBe(0)
        ->and($proposal->fresh()->status)->toBe(CatalogProposalStatus::AwaitingReview);

    $this->actingAs($mentor)
        ->post(route('catalog-proposal-decisions.store', [$learner, $proposal]), ['decision' => 'approve'])
        ->assertRedirect();

    $assessment = Assessment::query()->firstOrFail();

    expect($assessment->learner_id)->toBe($learner->id)
        ->and($assessment->competency->name)->toBe('Selected node')
        ->and($assessment->level)->toBe(BaselineAssessmentLevel::Developing)
        ->and($assessment->assessed_by_id)->toBe($mentor->id)
        ->and(Assessment::query()->count())->toBe(1);
});

test('Learners and unrelated Mentors cannot review or mutate Catalog Proposals', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $unrelatedMentor = User::factory()->mentor()->create();
    $proposal = createCatalogProposal($learner);
    $node = $proposal->nodes()->create(proposedNodePayload());

    $this->actingAs($learner)
        ->get(route('catalog-proposals.show', [$learner, $proposal]))
        ->assertForbidden();
    $this->actingAs($unrelatedMentor)
        ->get(route('catalog-proposals.show', [$learner, $proposal]))
        ->assertForbidden();
    $this->actingAs($learner)
        ->patch(route('catalog-proposal-selections.update', [$learner, $proposal, $node]), ['selected' => false])
        ->assertForbidden();

    expect($node->fresh()->selected)->toBeTrue();
});
