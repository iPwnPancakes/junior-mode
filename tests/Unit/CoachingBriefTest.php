<?php

use App\Actions\BuildCoachingBrief;
use App\BaselineAssessmentLevel;
use App\CoachingPriorityEmphasis;
use App\Models\Assessment;
use App\Models\CoachingPriority;
use App\Models\Competency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('the Coaching Brief is deterministic, bounded, diverse, and relevance first', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();

    $competencies = collect([
        'high' => Competency::factory()->forLearner($learner)->create(['name' => 'Laravel authorization', 'technologies' => ['Laravel']]),
        'normal' => Competency::factory()->forLearner($learner)->create(['name' => 'Request validation', 'technologies' => ['Laravel']]),
        'difficulty' => Competency::factory()->forLearner($learner)->create(['name' => 'Database transactions', 'technologies' => ['Laravel']]),
        'stale' => Competency::factory()->forLearner($learner)->create(['name' => 'Eloquent relationships', 'technologies' => ['Laravel']]),
        'unobserved' => Competency::factory()->forLearner($learner)->create(['name' => 'Feature testing', 'technologies' => ['Laravel']]),
        'demonstrated' => Competency::factory()->forLearner($learner)->create(['name' => 'Route model binding', 'technologies' => ['Laravel']]),
        'unrelated' => Competency::factory()->forLearner($learner)->create(['name' => 'CSS grid', 'technologies' => ['CSS']]),
    ]);

    foreach (['high' => CoachingPriorityEmphasis::High, 'normal' => CoachingPriorityEmphasis::Normal, 'unrelated' => CoachingPriorityEmphasis::High] as $key => $emphasis) {
        CoachingPriority::factory()->create([
            'learner_id' => $learner->id,
            'competency_id' => $competencies[$key]->id,
            'created_by_id' => $mentor->id,
            'emphasis' => $emphasis,
        ]);
    }

    foreach ([
        'difficulty' => [BaselineAssessmentLevel::Developing, now()],
        'stale' => [BaselineAssessmentLevel::Independent, now()->subDays(120)],
        'demonstrated' => [BaselineAssessmentLevel::Consistent, now()],
    ] as $key => [$level, $assessedAt]) {
        Assessment::factory()->create([
            'learner_id' => $learner->id,
            'competency_id' => $competencies[$key]->id,
            'assessed_by_id' => $mentor->id,
            'level' => $level,
            'assessed_at' => $assessedAt,
        ]);
    }

    $context = [
        'title' => 'Add a Laravel endpoint',
        'description' => 'Validate input and persist it safely.',
        'detected_technologies' => ['Laravel'],
        'likely_catalog_branches' => [],
    ];
    $action = app(BuildCoachingBrief::class);
    $firstBrief = $action->handle($learner, $context);
    $secondBrief = $action->handle($learner, $context);

    expect($firstBrief)->toBe($secondBrief)
        ->and($firstBrief)->toHaveCount(6)
        ->and(collect($firstBrief)->pluck('kind')->all())->toBe([
            'active_high_priority',
            'active_normal_priority',
            'recent_difficulty',
            'stale_or_contradictory_evidence',
            'unobserved',
            'demonstrated_context',
        ])
        ->and(collect($firstBrief)->pluck('competency_id'))->not->toContain($competencies['unrelated']->id)
        ->and(collect($firstBrief)->every(fn (array $entry): bool => isset($entry['reason']) && ! array_key_exists('rationale', $entry)))->toBeTrue();
});
