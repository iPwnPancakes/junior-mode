<?php

namespace App\Actions;

use App\Models\LearningEvidence;
use App\Models\User;

class BuildLearningProgress
{
    /** @return array{contract_version: string, projection_version: string, assessment_relationship: string, competencies: array<int, array<string, mixed>>} */
    public function handle(User $learner, ?int $competencyId = null): array
    {
        $competencies = $learner->competencies()->when($competencyId !== null, fn ($query) => $query->whereKey($competencyId))->get();
        $events = LearningEvidence::query()->where('learner_id', $learner->id)
            ->when($competencyId !== null, fn ($query) => $query->where('competency_id', $competencyId))
            ->with('coachingSession.workItem')->orderBy('id')->get();
        $superseded = $events->pluck('supersedes_id')->filter();
        $current = $events->reject(fn (LearningEvidence $event) => $superseded->contains($event->id));

        return [
            'contract_version' => '1',
            'projection_version' => '1',
            'assessment_relationship' => 'Independence stages derive only from learning evidence. Mentor assessments remain separate judgments and do not advance these stages.',
            'competencies' => $competencies->map(function ($competency) use ($current, $events): array {
                $evidence = $current->where('competency_id', $competency->id)->values();
                $qualified = $evidence->filter(function (LearningEvidence $event): bool {
                    $data = $event->evidence;

                    return in_array($data['ownership'], ['learner', 'shared'], true)
                        && trim($data['learner_work']) !== ''
                        && $data['verification']['passed'] === true
                        && $data['teach_back']['demonstrated'] === true
                        && $data['assistance'] !== 'solution_provided'
                        && in_array($data['activity'], ['implementation', 'debugging', 'modification'], true)
                        && $data['source'] !== 'automated_check';
                });
                $independent = $qualified->filter(fn (LearningEvidence $event) => $event->evidence['assistance'] === 'review_only' && $event->evidence['hints_used'] === 0);
                $transferable = $independent->contains(fn (LearningEvidence $first) => $independent->contains(fn (LearningEvidence $second) => ($second->evidence['transfer_from_id'] ?? null) === $first->id
                    && $first->coachingSession->workItem->fingerprint !== $second->coachingSession->workItem->fingerprint
                    && $first->evidence['context_key'] !== $second->evidence['context_key']
                    && $first->evidence['context_description'] !== $second->evidence['context_description']
                    && ($first->coachingSession->workItem->external_url === null || $first->coachingSession->workItem->external_url !== $second->coachingSession->workItem->external_url)));
                $stage = $transferable ? 'transferable' : ($independent->isNotEmpty() ? 'independent' : ($qualified->isNotEmpty() ? 'guided' : 'introduced'));
                $assessment = $competency->assessments()->latest('assessed_at')->first();

                return [
                    'competency_id' => $competency->id,
                    'name' => $competency->name,
                    'stage' => $stage,
                    'has_evidence' => $evidence->isNotEmpty(),
                    'mentor_assessment' => $assessment === null ? null : ['level' => $assessment->level->value, 'assessed_at' => $assessment->assessed_at->toIso8601String()],
                    'supporting_evidence' => $evidence->map(fn (LearningEvidence $event) => ['id' => $event->id, 'session_id' => $event->coaching_session_id, 'qualifies' => $qualified->contains('id', $event->id), 'recorded_at' => $event->created_at->toIso8601String(), 'recorded_by_id' => $event->recorded_by_id, 'client_connection_id' => $event->client_connection_id, 'evidence' => $event->evidence])->all(),
                    'correction_history' => $events->where('competency_id', $competency->id)->whereNotNull('supersedes_id')->map(fn (LearningEvidence $event) => ['id' => $event->id, 'supersedes_id' => $event->supersedes_id, 'reason' => $event->evidence['correction_reason'], 'original_evidence' => $events->firstWhere('id', $event->supersedes_id)?->evidence])->values()->all(),
                    'assistance_trend' => $evidence->map(fn (LearningEvidence $event) => ['evidence_id' => $event->id, 'assistance' => $event->evidence['assistance'], 'hints_used' => $event->evidence['hints_used']])->all(),
                    'suggested_support' => match ($stage) {
                        'introduced' => 'scaffolded', 'guided' => 'conceptual_hint', default => 'review_only'
                    },
                    'next_stage_requirement' => match ($stage) {
                        'introduced' => 'Complete learner-owned work with verification and a demonstrated teach-back; hints or scaffolding are allowed.',
                        'guided' => 'Complete learner-owned work from requirements with review-only assistance, no hints, verification, and demonstrated understanding.',
                        'independent' => 'Repeat independently on a separate Work Item in a materially different context, with verification and demonstrated understanding.',
                        default => 'Continue demonstrating independent understanding in new contexts.',
                    },
                ];
            })->all(),
        ];
    }
}
