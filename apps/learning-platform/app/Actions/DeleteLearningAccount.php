<?php

namespace App\Actions;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeleteLearningAccount
{
    public function handle(User $user): void
    {
        DB::transaction(function () use ($user): void {
            $owner = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            if ($owner->learners()->exists()) {
                throw ValidationException::withMessages(['account' => 'Reassign your attached Learners to another Mentor before deleting your account. Their learning records will be preserved.']);
            }
            $this->protectOtherLearners($owner);
            $competencyIds = DB::table('competencies')->where('learner_id', $owner->id)->pluck('id');
            $clientIds = DB::table('client_connections')->where('learner_id', $owner->id)->pluck('id');

            // Account deletion is the explicit privacy boundary for otherwise append-only evidence.
            foreach (DB::table('learning_evidence')->where('learner_id', $owner->id)->orderByDesc('id')->pluck('id') as $evidenceId) {
                DB::table('learning_evidence')->where('id', $evidenceId)->delete();
            }
            DB::table('handoff_snapshots')->where('learner_id', $owner->id)->delete();
            DB::table('coaching_sessions')->where('learner_id', $owner->id)->delete();
            DB::table('work_items')->where('learner_id', $owner->id)->delete();
            DB::table('assessments')->where('learner_id', $owner->id)->delete();
            DB::table('coaching_priorities')->where('learner_id', $owner->id)->delete();
            DB::table('catalog_proposals')->where('learner_id', $owner->id)->delete();
            DB::table('competency_merges')->whereIn('source_competency_id', $competencyIds)->delete();
            DB::table('competencies')->where('learner_id', $owner->id)->update(['parent_id' => null, 'merged_into_id' => null]);
            DB::table('competencies')->where('learner_id', $owner->id)->delete();
            DB::table('client_authorizations')->whereIn('client_connection_id', $clientIds)->delete();
            DB::table('client_connections')->where('learner_id', $owner->id)->delete();
            DB::table('enrolled_repositories')->where('learner_id', $owner->id)->delete();
            DB::table('learner_invitations')->where('accepted_by_user_id', $owner->id)->delete();
            DB::table('password_reset_tokens')->where('email', $owner->email)->delete();
            DB::table('sessions')->where('user_id', $owner->id)->delete();
            $owner->delete();
        });
    }

    private function protectOtherLearners(User $user): void
    {
        $authoredElsewhere = DB::table('learner_invitations')->where('mentor_id', $user->id)->whereNotNull('accepted_by_user_id')->where('accepted_by_user_id', '!=', $user->id)->exists()
            || DB::table('learning_evidence')->where('recorded_by_id', $user->id)->where('learner_id', '!=', $user->id)->exists()
            || DB::table('assessments')->where('assessed_by_id', $user->id)->where('learner_id', '!=', $user->id)->exists()
            || DB::table('coaching_priorities')->where('created_by_id', $user->id)->where('learner_id', '!=', $user->id)->exists()
            || DB::table('catalog_proposals')->where('reviewed_by_id', $user->id)->where('learner_id', '!=', $user->id)->exists()
            || DB::table('baseline_assessment_proposals')->join('catalog_proposals', 'catalog_proposals.id', '=', 'baseline_assessment_proposals.catalog_proposal_id')
                ->where('baseline_assessment_proposals.reviewed_by_id', $user->id)->where('catalog_proposals.learner_id', '!=', $user->id)->exists()
            || DB::table('competency_merges')->join('competencies', 'competencies.id', '=', 'competency_merges.source_competency_id')
                ->where('merged_by_id', $user->id)->where('competencies.learner_id', '!=', $user->id)->exists();
        if ($authoredElsewhere) {
            throw ValidationException::withMessages(['account' => 'Your account is attributed in another Learner’s record. Contact an administrator to resolve that attribution before deleting your account; their records cannot be deleted with yours.']);
        }
    }
}
