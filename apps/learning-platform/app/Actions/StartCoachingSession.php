<?php

namespace App\Actions;

use App\CoachingSessionStatus;
use App\Models\ClientConnection;
use App\Models\CoachingSession;
use App\Models\Competency;
use App\Models\EnrolledRepository;
use App\Models\User;
use App\Models\WorkItem;
use App\Support\LearningContract;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StartCoachingSession
{
    public function __construct(private BuildCoachingBrief $buildCoachingBrief) {}

    /**
     * @param  array{title: string, description: string, external_url?: string|null, detected_technologies: array<int, string>, likely_catalog_branches: array<int, int>, idempotency_key?: string, desired_outcome?: string, acceptance_criteria?: array<int, string>, responsibility_split?: array{agent: string, learner: string}}  $context
     */
    public function handle(
        User $learner,
        ClientConnection $clientConnection,
        EnrolledRepository $repository,
        Competency $objective,
        array $context,
    ): CoachingSession {
        if (isset($context['idempotency_key'])) {
            $existing = CoachingSession::query()->where('learner_id', $learner->id)->where('idempotency_key', $context['idempotency_key'])->first();
            if ($existing !== null) {
                $this->assertSameRequest($existing, $repository, $objective, $context);

                return $existing->load(['workItem.enrolledRepository', 'primaryLearningObjective', 'clientConnection']);
            }
        }
        LearningContract::validateSummaries($context);
        $brief = $this->buildCoachingBrief->handle($learner, $context);

        if (! collect($brief)->contains('competency_id', $objective->id)) {
            throw ValidationException::withMessages([
                'primary_learning_objective_id' => 'The Learning Objective must be selected from the current Coaching Brief.',
            ]);
        }

        $fingerprint = hash('sha256', Str::squish(implode('|', [
            Str::lower($context['title']),
            Str::lower($context['description']),
            Str::lower($context['external_url'] ?? ''),
        ])));

        return DB::transaction(function () use ($learner, $clientConnection, $repository, $objective, $context, $fingerprint): CoachingSession {
            User::query()->whereKey($learner->id)->lockForUpdate()->firstOrFail();
            if (isset($context['idempotency_key'])) {
                $retry = CoachingSession::query()->where('learner_id', $learner->id)->where('idempotency_key', $context['idempotency_key'])->first();
                if ($retry !== null) {
                    $this->assertSameRequest($retry, $repository, $objective, $context);

                    return $retry->load(['workItem.enrolledRepository', 'primaryLearningObjective', 'clientConnection']);
                }
            }
            $existingSession = CoachingSession::query()
                ->whereBelongsTo($learner, 'learner')
                ->where('primary_learning_objective_id', $objective->id)
                ->where('status', CoachingSessionStatus::Active)
                ->whereHas('workItem', fn ($query) => $query
                    ->where('enrolled_repository_id', $repository->id)
                    ->where('fingerprint', $fingerprint))
                ->lockForUpdate()
                ->first();

            if ($existingSession !== null && ! isset($context['idempotency_key'])) {
                $existingSession->update(['last_active_at' => now()]);

                return $existingSession->load(['workItem.enrolledRepository', 'primaryLearningObjective', 'clientConnection']);
            }

            if ($existingSession !== null) {
                throw ValidationException::withMessages(['idempotency_key' => 'An active Session already exists for this Work Item and objective. Resume it using the session ID from get-coaching-brief.']);
            }

            $workItem = WorkItem::query()->create([
                'learner_id' => $learner->id,
                'enrolled_repository_id' => $repository->id,
                'fingerprint' => $fingerprint,
                'title' => $context['title'],
                'description' => $context['description'],
                'external_url' => $context['external_url'] ?? null,
                'detected_technologies' => $context['detected_technologies'],
                'likely_catalog_branches' => $context['likely_catalog_branches'],
            ]);

            return CoachingSession::query()->create([
                'learner_id' => $learner->id,
                'work_item_id' => $workItem->id,
                'primary_learning_objective_id' => $objective->id,
                'client_connection_id' => $clientConnection->id,
                'status' => CoachingSessionStatus::Active,
                'last_active_at' => now(),
                'idempotency_key' => $context['idempotency_key'] ?? null,
                'request_hash' => LearningContract::hash([$repository->id, $objective->id, $context]),
                'desired_outcome' => $context['desired_outcome'] ?? null,
                'acceptance_criteria' => $context['acceptance_criteria'] ?? null,
                'responsibility_split' => $context['responsibility_split'] ?? null,
            ])->load(['workItem.enrolledRepository', 'primaryLearningObjective', 'clientConnection']);
        });
    }

    /** @param array<string, mixed> $context */
    private function assertSameRequest(CoachingSession $session, EnrolledRepository $repository, Competency $objective, array $context): void
    {
        if ($session->request_hash !== LearningContract::hash([$repository->id, $objective->id, $context])) {
            throw ValidationException::withMessages(['idempotency_key' => 'This key was already used for a different Session request.']);
        }
    }
}
