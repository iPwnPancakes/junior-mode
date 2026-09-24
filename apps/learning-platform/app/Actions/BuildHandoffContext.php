<?php

namespace App\Actions;

use App\Models\CoachingSession;
use App\Support\HandoffText;

class BuildHandoffContext
{
    public function __construct(private HandoffText $text) {}

    /** @param array<string, mixed> $reported
     * @return array<string, mixed>
     */
    public function handle(CoachingSession $session, array $reported): array
    {
        $session->loadMissing('workItem.enrolledRepository', 'primaryLearningObjective', 'learner');

        return [
            'contract_version' => '1',
            'session_id' => $session->id,
            'facts' => [
                'desired_outcome' => $this->text->clean($session->getAttribute('desired_outcome') ?? $session->workItem->description),
                'task' => [
                    'title' => $this->text->clean($session->workItem->title),
                    'reference' => $this->text->clean($session->workItem->external_url),
                ],
                'repository' => [
                    'identity' => $session->workItem->enrolledRepository->identity,
                    'name' => $this->text->clean($session->workItem->enrolledRepository->display_name),
                ],
                'learning_objective' => $this->text->clean($session->primaryLearningObjective->name),
                'relevant_artifacts' => $this->text->lines($reported['relevant_artifacts']),
                'current_understanding' => $this->text->clean($reported['current_understanding']),
                'attempts' => $this->text->lines($reported['attempts']),
                'exact_error_or_unexpected_behavior' => $this->text->clean($reported['exact_error_or_unexpected_behavior']),
                'source' => 'Session record and concise agent-reported observations; review their accuracy before sharing.',
            ],
            'likely_knowledge_gap' => [
                'kind' => 'hypothesis',
                'summary' => $this->text->clean($reported['likely_knowledge_gap']),
            ],
            'agent_hypotheses' => $this->text->lines($reported['agent_hypotheses']),
            'mentor_questions' => $this->text->lines($reported['mentor_questions']),
            'progress' => $this->progress($session),
        ];
    }

    /** @return array<string, mixed> */
    private function progress(CoachingSession $session): array
    {
        $progress = app(BuildLearningProgress::class)->handle($session->learner, $session->primary_learning_objective_id);

        return [
            'projection_version' => $progress['projection_version'],
            'scope' => 'Current Learning Objective; latest 20 current evidence events. Snapshot taken before sharing.',
            'competencies' => array_map(function (array $competency): array {
                return [
                    'competency_id' => $competency['competency_id'],
                    'name' => $this->text->clean($competency['name']),
                    'stage' => $competency['stage'],
                    'has_evidence' => $competency['has_evidence'],
                    'next_stage_requirement' => $this->text->clean($competency['next_stage_requirement']),
                    'supporting_evidence' => array_map(function (array $event): array {
                        $evidence = $event['evidence'];

                        return [
                            'id' => $event['id'],
                            'session_id' => $event['session_id'],
                            'qualifies' => $event['qualifies'],
                            'solution_escape_used' => $event['solution_escape_used'],
                            'recorded_hints_used' => $event['recorded_hints_used'],
                            'recorded_at' => $event['recorded_at'],
                            'activity' => $evidence['activity'],
                            'assistance' => $evidence['assistance'],
                            'hints_used' => max($evidence['hints_used'], $event['recorded_hints_used']),
                            'ownership' => $evidence['ownership'],
                            'learner_work' => $this->text->clean($evidence['learner_work']),
                            'verification' => [
                                'passed' => $evidence['verification']['passed'],
                                'reference' => $this->text->clean($evidence['verification']['reference']),
                            ],
                            'teach_back' => [
                                'demonstrated' => $evidence['teach_back']['demonstrated'],
                                'summary' => $this->text->clean($evidence['teach_back']['summary']),
                            ],
                        ];
                    }, array_slice($competency['supporting_evidence'], -20)),
                ];
            }, $progress['competencies']),
        ];
    }
}
