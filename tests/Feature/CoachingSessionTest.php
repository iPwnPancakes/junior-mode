<?php

use App\Models\ClientConnection;
use App\Models\CoachingSession;
use App\Models\Competency;
use App\Models\EnrolledRepository;
use App\Models\User;
use App\Models\WorkItem;
use Inertia\Testing\AssertableInertia as Assert;

test('Mentors and Learners see only their Coaching Sessions with complete startup context', function () {
    $mentor = User::factory()->mentor()->create();
    $otherMentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $otherLearner = User::factory()->learner($otherMentor)->create();

    foreach ([$learner, $otherLearner] as $index => $sessionLearner) {
        $repository = EnrolledRepository::factory()->for($sessionLearner, 'learner')->create(['display_name' => "Repository {$index}"]);
        $objective = Competency::factory()->forLearner($sessionLearner)->create(['name' => "Objective {$index}"]);
        $client = ClientConnection::factory()->for($sessionLearner, 'learner')->create(['name' => "Codex {$index}"]);
        $workItem = WorkItem::factory()->create([
            'learner_id' => $sessionLearner->id,
            'enrolled_repository_id' => $repository->id,
            'title' => "Work Item {$index}",
        ]);
        CoachingSession::factory()->create([
            'learner_id' => $sessionLearner->id,
            'work_item_id' => $workItem->id,
            'primary_learning_objective_id' => $objective->id,
            'client_connection_id' => $client->id,
        ]);
    }

    $this->actingAs($mentor)
        ->get(route('coaching-sessions.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('coaching-sessions/index')
            ->where('viewerRole', 'mentor')
            ->has('sessions', 1)
            ->where('sessions.0.learnerName', $learner->name)
            ->where('sessions.0.workItem.title', 'Work Item 0')
            ->where('sessions.0.repository.name', 'Repository 0')
            ->where('sessions.0.objective', 'Objective 0')
            ->where('sessions.0.clientSource', 'Codex 0')
            ->where('sessions.0.status', 'active'));

    $this->actingAs($learner)
        ->get(route('coaching-sessions.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('viewerRole', 'learner')
            ->has('sessions', 1)
            ->where('sessions.0.learnerName', $learner->name));
});
