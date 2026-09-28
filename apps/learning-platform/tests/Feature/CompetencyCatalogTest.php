<?php

use App\BaselineAssessmentLevel;
use App\CoachingPriorityStatus;
use App\Models\Assessment;
use App\Models\CoachingPriority;
use App\Models\Competency;
use App\Models\CompetencyMerge;
use App\Models\CompetencyTemplate;
use App\Models\CompetencyTemplateNode;
use App\Models\User;
use Illuminate\Support\Arr;
use Inertia\Testing\AssertableInertia as Assert;

function competencyPayload(array $overrides = []): array
{
    return [
        'name' => 'Request lifecycle',
        'definition' => 'How an HTTP request moves through the application.',
        'demonstration_criteria' => 'Trace a request from its route to its response.',
        'parent_id' => null,
        'position' => 0,
        'prerequisites' => 'HTTP fundamentals, PHP functions',
        'work_opportunities' => 'Add an endpoint, debug middleware',
        'technologies' => 'Laravel, Inertia',
        ...$overrides,
    ];
}

test('a Mentor and their Learner can view an isolated ordered Competency Catalog', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $otherLearner = User::factory()->learner($mentor)->create();
    $second = Competency::factory()->forLearner($learner)->create([
        'name' => 'Second root',
        'position' => 1,
    ]);
    $first = Competency::factory()->forLearner($learner)->create([
        'name' => 'First root',
        'position' => 0,
        'technologies' => ['PHP'],
    ]);
    Competency::factory()->forLearner($otherLearner)->create(['name' => 'Private node']);
    CompetencyTemplate::factory()->create(['name' => 'Programming foundations']);

    $this->actingAs($mentor)
        ->get(route('learners.show', $learner))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('learners/show')
            ->where('learner.id', $learner->id)
            ->where('canManage', true)
            ->has('competencies', 2)
            ->where('competencies.0.id', $first->id)
            ->where('competencies.0.technologies.0', 'PHP')
            ->where('competencies.1.id', $second->id)
            ->has('templates', 1)
        );

    $this->actingAs($learner)
        ->get(route('learners.show', $learner))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('canManage', false));
});

test('a Mentor can add, move, reorder, rename, and archive Competencies', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $existingRoot = Competency::factory()->forLearner($learner)->create([
        'position' => 0,
        'name' => 'Existing root',
    ]);

    $this->actingAs($mentor)
        ->post(route('competencies.store', $learner), competencyPayload())
        ->assertRedirect(route('learners.show', $learner));

    $competency = Competency::query()->where('name', 'Request lifecycle')->firstOrFail();

    expect($competency->learner_id)->toBe($learner->id)
        ->and($competency->prerequisites)->toBe(['HTTP fundamentals', 'PHP functions'])
        ->and($competency->technologies)->toBe(['Laravel', 'Inertia'])
        ->and($existingRoot->fresh()->position)->toBe(1);

    $this->actingAs($mentor)
        ->patch(route('competencies.update', [$learner, $competency]), competencyPayload([
            'name' => 'Laravel request lifecycle',
            'parent_id' => $existingRoot->id,
            'position' => 0,
        ]))
        ->assertRedirect(route('learners.show', $learner));

    expect($competency->fresh())
        ->name->toBe('Laravel request lifecycle')
        ->parent_id->toBe($existingRoot->id)
        ->position->toBe(0);

    $this->actingAs($mentor)
        ->post(route('competencies.archive', [$learner, $competency]))
        ->assertRedirect(route('learners.show', $learner));

    expect($competency->fresh()->archived_at)->not->toBeNull();
    $this->assertModelExists($competency);
});

test('template approval copies a reusable tree into only one Learner catalog', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $otherLearner = User::factory()->learner($mentor)->create();
    $template = CompetencyTemplate::factory()->create(['name' => 'Laravel foundations']);
    $root = CompetencyTemplateNode::factory()->for($template, 'template')->create([
        'name' => 'Laravel development',
        'position' => 0,
    ]);
    CompetencyTemplateNode::factory()->for($template, 'template')->create([
        'parent_id' => $root->id,
        'name' => 'Authorization',
        'position' => 0,
        'technologies' => ['Laravel policies'],
    ]);

    $this->actingAs($mentor)
        ->post(route('competency-template-copies.store', $learner), [
            'template_id' => $template->id,
            'parent_id' => null,
        ])
        ->assertRedirect(route('learners.show', $learner));

    $copiedRoot = $learner->competencies()->where('name', 'Laravel development')->firstOrFail();
    $copiedChild = $learner->competencies()->where('name', 'Authorization')->firstOrFail();

    expect($learner->competencies()->count())->toBe(2)
        ->and($otherLearner->competencies()->count())->toBe(0)
        ->and($copiedChild->parent_id)->toBe($copiedRoot->id)
        ->and($copiedChild->technologies)->toBe(['Laravel policies']);
});

test('merging duplicate Competencies preserves the source and records an auditable mapping', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $source = Competency::factory()->forLearner($learner)->create(['name' => 'Unit tests']);
    $target = Competency::factory()->forLearner($learner)->create(['name' => 'Automated testing']);
    $child = Competency::factory()->forLearner($learner)->create([
        'name' => 'Test doubles',
        'parent_id' => $source->id,
    ]);

    $this->actingAs($mentor)
        ->post(route('competencies.merge', [$learner, $source]), [
            'target_competency_id' => $target->id,
        ])
        ->assertRedirect(route('learners.show', $learner));

    expect($source->fresh())
        ->merged_into_id->toBe($target->id)
        ->archived_at->not->toBeNull()
        ->and($child->fresh()->parent_id)->toBe($target->id);
    $this->assertModelExists($source);
    $this->assertDatabaseHas((new CompetencyMerge)->getTable(), [
        'source_competency_id' => $source->id,
        'target_competency_id' => $target->id,
        'merged_by_id' => $mentor->id,
    ]);
});

test('catalog mutations reject Learners, unrelated Mentors, foreign nodes, and invalid cycles', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $unrelatedMentor = User::factory()->mentor()->create();
    $unrelatedLearner = User::factory()->learner($unrelatedMentor)->create();
    $root = Competency::factory()->forLearner($learner)->create();
    $child = Competency::factory()->forLearner($learner)->create(['parent_id' => $root->id]);
    $foreignNode = Competency::factory()->forLearner($unrelatedLearner)->create();

    $this->actingAs($learner)
        ->post(route('competencies.store', $learner), competencyPayload())
        ->assertForbidden();
    $this->actingAs($unrelatedMentor)
        ->get(route('learners.show', $learner))
        ->assertForbidden();
    $this->actingAs($unrelatedMentor)
        ->post(route('competencies.store', $learner), competencyPayload())
        ->assertForbidden();
    $this->actingAs($mentor)
        ->patch(route('competencies.update', [$learner, $foreignNode]), competencyPayload())
        ->assertNotFound();
    $this->actingAs($mentor)
        ->patch(route('competencies.update', [$learner, $root]), competencyPayload([
            'parent_id' => $child->id,
        ]))
        ->assertSessionHasErrors('parent_id');

    $this->app['auth']->logout();
    $this->get(route('learners.show', $learner))->assertRedirect(route('login'));
});

test('catalog validation requires a meaningful definition and observable criteria', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();

    $this->actingAs($mentor)
        ->post(route('competencies.store', $learner), competencyPayload([
            'name' => '',
            'definition' => '',
            'demonstration_criteria' => '',
        ]))
        ->assertSessionHasErrors(['name', 'definition', 'demonstration_criteria']);

    expect($learner->competencies()->count())->toBe(0);
});

test('the Learner page shows each Competency with its current level and active focus', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $focused = Competency::factory()->forLearner($learner)->create(['position' => 0]);
    $unfocused = Competency::factory()->forLearner($learner)->create(['position' => 1]);
    Assessment::factory()->create([
        'learner_id' => $learner->id,
        'competency_id' => $focused->id,
        'assessed_by_id' => $mentor->id,
        'level' => BaselineAssessmentLevel::Developing,
        'assessed_at' => now()->subWeek(),
    ]);
    Assessment::factory()->create([
        'learner_id' => $learner->id,
        'competency_id' => $focused->id,
        'assessed_by_id' => $mentor->id,
        'level' => BaselineAssessmentLevel::Consistent,
        'assessed_at' => now(),
    ]);
    $activeFocus = CoachingPriority::factory()->create([
        'learner_id' => $learner->id,
        'competency_id' => $focused->id,
        'created_by_id' => $mentor->id,
    ]);
    CoachingPriority::factory()->create([
        'learner_id' => $learner->id,
        'competency_id' => $unfocused->id,
        'created_by_id' => $mentor->id,
        'status' => CoachingPriorityStatus::Closed,
        'resolved_at' => now(),
    ]);

    $this->actingAs($mentor)
        ->get(route('learners.show', $learner))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('competencies.0.level.value', 'consistent')
            ->where('competencies.0.focus.id', $activeFocus->id)
            ->where('competencies.1.level', null)
            ->where('competencies.1.focus', null)
            ->missing('competencies.0.position')
            ->has('priorities', 2)
            ->has('assessments', 2)
        );
});

test('the old catalog and coaching record addresses lead to the Learner page', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();

    $this->actingAs($mentor)
        ->get(route('competency-catalogs.show', $learner))
        ->assertRedirect("/learners/{$learner->id}");
    $this->actingAs($mentor)
        ->get(route('coaching-records.show', $learner))
        ->assertRedirect("/learners/{$learner->id}");
});

test('a Mentor moves a Competency up and down among its siblings', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    [$first, $second, $third] = collect([0, 1, 2])->map(fn (int $position): Competency => Competency::factory()
        ->forLearner($learner)
        ->create(['position' => $position]));
    $child = Competency::factory()->forLearner($learner)->create(['parent_id' => $first->id, 'position' => 0]);

    $this->actingAs($mentor)
        ->patch(route('competency-positions.update', [$learner, $third]), ['direction' => 'up'])
        ->assertRedirect(route('learners.show', $learner));

    expect([$first->fresh()->position, $second->fresh()->position, $third->fresh()->position])->toBe([0, 2, 1])
        ->and($child->fresh()->position)->toBe(0);

    $this->actingAs($mentor)->patch(route('competency-positions.update', [$learner, $first]), ['direction' => 'up']);
    $this->actingAs($mentor)->patch(route('competency-positions.update', [$learner, $child]), ['direction' => 'down']);

    expect($first->fresh()->position)->toBe(0)
        ->and($child->fresh()->position)->toBe(0);

    $this->actingAs($mentor)
        ->patch(route('competency-positions.update', [$learner, $first]), ['direction' => 'sideways'])
        ->assertSessionHasErrors('direction');
    $this->actingAs($learner)
        ->patch(route('competency-positions.update', [$learner, $first]), ['direction' => 'down'])
        ->assertForbidden();
});

test('editing a Competency without a position keeps its place unless it changes parent', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    [$first, $second, $third] = collect([0, 1, 2])->map(fn (int $position): Competency => Competency::factory()
        ->forLearner($learner)
        ->create(['position' => $position]));
    $payload = fn (array $overrides): array => Arr::except(competencyPayload($overrides), 'position');

    $this->actingAs($mentor)
        ->patch(route('competencies.update', [$learner, $second]), $payload(['name' => 'Renamed']))
        ->assertRedirect(route('learners.show', $learner));

    expect($second->fresh())->name->toBe('Renamed')->position->toBe(1);

    $this->actingAs($mentor)
        ->patch(route('competencies.update', [$learner, $second]), $payload(['parent_id' => $first->id]))
        ->assertRedirect(route('learners.show', $learner));

    expect($second->fresh())->parent_id->toBe($first->id)->position->toBe(0)
        ->and($third->fresh()->position)->toBe(1);
});
