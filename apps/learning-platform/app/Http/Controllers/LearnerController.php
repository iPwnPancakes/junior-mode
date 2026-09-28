<?php

namespace App\Http\Controllers;

use App\Actions\BuildLearningProgress;
use App\CoachingPriorityStatus;
use App\Models\Assessment;
use App\Models\CoachingActivityEvent;
use App\Models\CoachingPriority;
use App\Models\Competency;
use App\Models\CompetencyTemplate;
use App\Models\CompetencyTemplateNode;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * One page per Learner: the coaching plan (catalog, current level, and focus)
 * followed by progress and history.
 */
class LearnerController extends Controller
{
    public function __invoke(Request $request, User $learner): Response
    {
        Gate::authorize('viewCoachingRecord', $learner);

        $assessments = $learner->assessments()
            ->with(['competency:id,name', 'assessedBy:id,name'])
            ->latest('assessed_at')
            ->latest('id')
            ->get();
        $priorities = $learner->coachingPriorities()
            ->with(['competency:id,name', 'replacement.competency:id,name'])
            ->latest('id')
            ->get();
        $latestAssessments = $assessments->unique('competency_id')->keyBy('competency_id');
        $activeFocuses = $priorities
            ->where('status', CoachingPriorityStatus::Active)
            ->unique('competency_id')
            ->keyBy('competency_id');

        return Inertia::render('learners/show', [
            'learner' => [
                'id' => $learner->id,
                'name' => $learner->name,
                'email' => $learner->email,
            ],
            'canManage' => $request->user()?->can('manageCoachingRecord', $learner) === true,
            'defaultPriorityDurationDays' => $request->user()?->isMentor() === true
                ? $request->user()->default_priority_duration_days
                : $learner->mentor()->value('default_priority_duration_days') ?? 7,
            'competencies' => $learner->competencies()
                ->with('mergeTarget:id,name')
                ->orderBy('parent_id')
                ->orderBy('position')
                ->orderBy('id')
                ->get()
                ->map(fn (Competency $competency): array => $this->serializeCompetency(
                    $competency,
                    $latestAssessments->get($competency->id),
                    $activeFocuses->get($competency->id),
                )),
            'templates' => fn (): Collection => CompetencyTemplate::query()
                ->with('nodes')
                ->orderBy('name')
                ->get()
                ->map(fn (CompetencyTemplate $template): array => [
                    'id' => $template->id,
                    'name' => $template->name,
                    'description' => $template->description,
                    'nodes' => $template->nodes
                        ->map(fn (CompetencyTemplateNode $node): array => $this->serializeTemplateNode($node)),
                ]),
            'assessments' => $assessments->map(fn (Assessment $assessment): array => [
                'id' => $assessment->id,
                'competencyName' => $assessment->competency->name,
                'level' => $assessment->level->value,
                'levelLabel' => Str::headline($assessment->level->value),
                'rationale' => $assessment->rationale,
                'assessedBy' => $assessment->assessedBy->name,
                'assessedAt' => $assessment->assessed_at->toDateString(),
            ]),
            'priorities' => $priorities->map(fn (CoachingPriority $priority): array => $this->serializePriority($priority)),
            'learningActivities' => CoachingActivityEvent::query()->where('learner_id', $learner->id)->with('coachingSession.workItem')->latest('id')->get()->map(fn ($event): array => ['id' => $event->id, 'kind' => $event->kind, 'session_title' => $event->coachingSession->workItem->title, 'payload' => $event->payload]),
            'learningProgress' => app(BuildLearningProgress::class)->handle($learner),
            'learningReceipts' => $learner->coachingSessions()->whereNotNull('completed_at')->with('workItem')->get()->map(fn ($session): array => ['id' => $session->id, 'title' => $session->workItem->title, 'completion' => $session->completion]),
        ]);
    }

    /** @return array<string, mixed> */
    private function serializeCompetency(Competency $competency, ?Assessment $assessment, ?CoachingPriority $focus): array
    {
        return [
            'id' => $competency->id,
            'parentId' => $competency->parent_id,
            'name' => $competency->name,
            'definition' => $competency->definition,
            'demonstrationCriteria' => $competency->demonstration_criteria,
            'prerequisites' => $competency->prerequisites ?? [],
            'workOpportunities' => $competency->work_opportunities ?? [],
            'technologies' => $competency->technologies ?? [],
            'archivedAt' => $competency->archived_at?->toDateString(),
            'mergedInto' => $competency->mergeTarget === null
                ? null
                : ['id' => $competency->mergeTarget->id, 'name' => $competency->mergeTarget->name],
            'level' => $assessment === null ? null : [
                'value' => $assessment->level->value,
                'label' => Str::headline($assessment->level->value),
                'rationale' => $assessment->rationale,
                'assessedAt' => $assessment->assessed_at->toDateString(),
            ],
            'focus' => $focus === null ? null : $this->serializePriority($focus),
        ];
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

    /** @return array<string, mixed> */
    private function serializeTemplateNode(CompetencyTemplateNode $node): array
    {
        return [
            'id' => $node->id,
            'parentId' => $node->parent_id,
            'position' => $node->position,
            'name' => $node->name,
            'definition' => $node->definition,
            'demonstrationCriteria' => $node->demonstration_criteria,
            'prerequisites' => $node->prerequisites ?? [],
            'workOpportunities' => $node->work_opportunities ?? [],
            'technologies' => $node->technologies ?? [],
        ];
    }
}
