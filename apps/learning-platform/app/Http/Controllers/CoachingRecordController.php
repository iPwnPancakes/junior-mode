<?php

namespace App\Http\Controllers;

use App\Actions\BuildLearningProgress;
use App\Models\Assessment;
use App\Models\CoachingPriority;
use App\Models\Competency;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CoachingRecordController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request, User $learner): Response
    {
        Gate::authorize('viewCoachingRecord', $learner);

        return Inertia::render('coaching-records/show', [
            'learner' => [
                'id' => $learner->id,
                'name' => $learner->name,
                'email' => $learner->email,
            ],
            'learningProgress' => app(BuildLearningProgress::class)->handle($learner),
            'learningReceipts' => $learner->coachingSessions()->whereNotNull('completed_at')->with('workItem')->get()->map(fn ($session): array => ['id' => $session->id, 'title' => $session->workItem->title, 'completion' => $session->completion]),
            'canManage' => $request->user()?->can('manageCoachingRecord', $learner) === true,
            'defaultPriorityDurationDays' => $request->user()?->isMentor() === true
                ? $request->user()->default_priority_duration_days
                : $learner->mentor()->value('default_priority_duration_days') ?? 7,
            'competencies' => $learner->competencies()
                ->whereNull('archived_at')
                ->whereNull('merged_into_id')
                ->orderBy('position')
                ->orderBy('id')
                ->get(['id', 'name'])
                ->map(fn (Competency $competency): array => [
                    'id' => $competency->id,
                    'name' => $competency->name,
                ]),
            'assessments' => $learner->assessments()
                ->with(['competency:id,name', 'assessedBy:id,name'])
                ->get()
                ->map(fn (Assessment $assessment): array => [
                    'id' => $assessment->id,
                    'competencyName' => $assessment->competency->name,
                    'level' => $assessment->level->value,
                    'levelLabel' => Str::headline($assessment->level->value),
                    'rationale' => $assessment->rationale,
                    'assessedBy' => $assessment->assessedBy->name,
                    'assessedAt' => $assessment->assessed_at->toDateString(),
                ]),
            'priorities' => $learner->coachingPriorities()
                ->with(['competency:id,name', 'replacement.competency:id,name'])
                ->get()
                ->map(fn (CoachingPriority $priority): array => $this->serializePriority($priority)),
        ]);
    }

    /** @return array<string, mixed> */
    private function serializePriority(CoachingPriority $priority): array
    {
        $displayStatus = match (true) {
            $priority->isExpired() => 'expired',
            $priority->status->value !== 'active' => $priority->status->value,
            $priority->expires_at === null => 'persistent',
            default => 'active',
        };

        return [
            'id' => $priority->id,
            'competencyId' => $priority->competency_id,
            'competencyName' => $priority->competency->name,
            'emphasis' => $priority->emphasis->value,
            'expirationMode' => $priority->expiration_mode->value,
            'expiresOn' => $priority->expires_at?->toDateString(),
            'status' => $priority->status->value,
            'displayStatus' => $displayStatus,
            'displayStatusLabel' => Str::headline($displayStatus),
            'note' => $priority->note,
            'createdAt' => $priority->created_at?->toDateString(),
            'resolvedAt' => $priority->resolved_at?->toDateString(),
            'replacement' => $priority->replacement === null ? null : [
                'id' => $priority->replacement->id,
                'competencyName' => $priority->replacement->competency->name,
            ],
        ];
    }
}
