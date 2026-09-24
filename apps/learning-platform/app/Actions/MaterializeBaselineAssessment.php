<?php

namespace App\Actions;

use App\BaselineAssessmentDecision;
use App\Models\Assessment;
use App\Models\BaselineAssessmentProposal;

class MaterializeBaselineAssessment
{
    public function handle(BaselineAssessmentProposal $baselineAssessmentProposal): ?Assessment
    {
        $baselineAssessmentProposal->loadMissing('node', 'proposal');

        if ($baselineAssessmentProposal->decision !== BaselineAssessmentDecision::Approved
            || $baselineAssessmentProposal->node->copied_competency_id === null
            || $baselineAssessmentProposal->reviewed_by_id === null) {
            return null;
        }

        return Assessment::query()->firstOrCreate(
            ['baseline_assessment_proposal_id' => $baselineAssessmentProposal->id],
            [
                'learner_id' => $baselineAssessmentProposal->proposal->learner_id,
                'competency_id' => $baselineAssessmentProposal->node->copied_competency_id,
                'assessed_by_id' => $baselineAssessmentProposal->reviewed_by_id,
                'level' => $baselineAssessmentProposal->level,
                'rationale' => $baselineAssessmentProposal->rationale,
                'assessed_at' => $baselineAssessmentProposal->reviewed_at ?? now(),
            ],
        );
    }
}
