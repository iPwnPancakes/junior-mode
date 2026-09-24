<?php

namespace App\Actions;

use App\BaselineAssessmentDecision;
use App\Models\BaselineAssessmentProposal;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReviewBaselineAssessmentProposal
{
    public function __construct(private MaterializeBaselineAssessment $materializeBaselineAssessment) {}

    public function handle(
        BaselineAssessmentProposal $baselineAssessmentProposal,
        User $mentor,
        BaselineAssessmentDecision $decision,
    ): BaselineAssessmentProposal {
        return DB::transaction(function () use ($baselineAssessmentProposal, $mentor, $decision): BaselineAssessmentProposal {
            $lockedAssessment = BaselineAssessmentProposal::query()
                ->with('proposal.learner', 'node')
                ->lockForUpdate()
                ->findOrFail($baselineAssessmentProposal->id);

            if ($lockedAssessment->proposal->learner->mentor_id !== $mentor->id
                || $lockedAssessment->decision !== BaselineAssessmentDecision::Pending) {
                throw ValidationException::withMessages([
                    'decision' => __('This baseline Assessment is not available for review.'),
                ]);
            }

            $lockedAssessment->update([
                'decision' => $decision,
                'reviewed_by_id' => $mentor->id,
                'reviewed_at' => now(),
            ]);

            $this->materializeBaselineAssessment->handle($lockedAssessment);

            return $lockedAssessment->fresh('assessment');
        });
    }
}
