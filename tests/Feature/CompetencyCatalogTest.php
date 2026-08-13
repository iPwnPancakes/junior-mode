<?php

use App\Models\Competency;
use App\Models\CompetencyMerge;
use App\Models\CompetencyTemplate;
use App\Models\CompetencyTemplateNode;
use App\Models\User;
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
        ->get(route('competency-catalogs.show', $learner))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('competency-catalogs/show')
            ->where('learner.id', $learner->id)
            ->where('canManage', true)
            ->has('competencies', 2)
            ->where('competencies.0.id', $first->id)
            ->where('competencies.0.technologies.0', 'PHP')
            ->where('competencies.1.id', $second->id)
            ->has('templates', 1)
        );

    $this->actingAs($learner)
        ->get(route('competency-catalogs.show', $learner))
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
        ->assertRedirect(route('competency-catalogs.show', $learner));

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
        ->assertRedirect(route('competency-catalogs.show', $learner));

    expect($competency->fresh())
        ->name->toBe('Laravel request lifecycle')
        ->parent_id->toBe($existingRoot->id)
        ->position->toBe(0);

    $this->actingAs($mentor)
        ->post(route('competencies.archive', [$learner, $competency]))
        ->assertRedirect(route('competency-catalogs.show', $learner));

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
        ->assertRedirect(route('competency-catalogs.show', $learner));

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
        ->assertRedirect(route('competency-catalogs.show', $learner));

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
        ->get(route('competency-catalogs.show', $learner))
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
    $this->get(route('competency-catalogs.show', $learner))->assertRedirect(route('login'));
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
