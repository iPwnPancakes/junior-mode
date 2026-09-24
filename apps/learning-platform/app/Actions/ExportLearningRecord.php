<?php

namespace App\Actions;

use App\Models\Assessment;
use App\Models\BaselineAssessmentProposal;
use App\Models\CatalogProposal;
use App\Models\CatalogProposalNode;
use App\Models\ClientAuthorization;
use App\Models\ClientConnection;
use App\Models\CoachingActivityEvent;
use App\Models\CoachingPriority;
use App\Models\CoachingSession;
use App\Models\Competency;
use App\Models\CompetencyMerge;
use App\Models\EnrolledRepository;
use App\Models\HandoffSnapshot;
use App\Models\LearnerInvitation;
use App\Models\LearningEvidence;
use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Support\Facades\DB;

class ExportLearningRecord
{
    /** @return array<string, mixed> */
    public function handle(User $learner): array
    {
        abort_unless($learner->isLearner(), 403);

        return DB::transaction(function () use ($learner): array {
            $owner = User::query()->whereKey($learner->id)->lockForUpdate()->firstOrFail();

            return $this->snapshot($owner);
        });
    }

    /** @return array<string, mixed> */
    private function snapshot(User $learner): array
    {
        $proposals = CatalogProposal::query()->where('learner_id', $learner->id)->get(['id', 'client_connection_id', 'interview_context', 'status', 'submitted_at', 'reviewed_by_id', 'reviewed_at', 'created_at', 'updated_at']);
        $competencies = Competency::query()->where('learner_id', $learner->id)->get(['id', 'parent_id', 'position', 'name', 'definition', 'demonstration_criteria', 'prerequisites', 'work_opportunities', 'technologies', 'archived_at', 'merged_into_id', 'created_at', 'updated_at']);
        $clients = ClientConnection::query()->where('learner_id', $learner->id)->get(['id', 'name', 'authorized_at', 'last_used_at', 'revoked_at', 'created_at', 'updated_at']);

        return [
            'schema_version' => '1',
            'exported_at' => now()->toIso8601String(),
            'account' => $learner->only(['id', 'name', 'email', 'role', 'mentor_id', 'created_at', 'updated_at']),
            'competencies' => $competencies->toArray(),
            'competency_merges' => CompetencyMerge::query()->whereIn('source_competency_id', $competencies->modelKeys())->get(['id', 'source_competency_id', 'target_competency_id', 'merged_by_id', 'created_at', 'updated_at'])->toArray(),
            'catalog_proposals' => $proposals->toArray(),
            'catalog_proposal_nodes' => CatalogProposalNode::query()->whereIn('catalog_proposal_id', $proposals->modelKeys())->get(['id', 'catalog_proposal_id', 'parent_id', 'position', 'name', 'definition', 'demonstration_criteria', 'prerequisites', 'work_opportunities', 'technologies', 'selected', 'copied_competency_id', 'created_at', 'updated_at'])->toArray(),
            'baseline_assessment_proposals' => BaselineAssessmentProposal::query()->whereIn('catalog_proposal_id', $proposals->modelKeys())->get(['id', 'catalog_proposal_id', 'catalog_proposal_node_id', 'level', 'rationale', 'decision', 'reviewed_by_id', 'reviewed_at', 'created_at', 'updated_at'])->toArray(),
            'assessments' => Assessment::query()->where('learner_id', $learner->id)->get(['id', 'competency_id', 'assessed_by_id', 'baseline_assessment_proposal_id', 'level', 'rationale', 'assessed_at', 'created_at', 'updated_at'])->toArray(),
            'coaching_priorities' => CoachingPriority::query()->where('learner_id', $learner->id)->get(['id', 'competency_id', 'created_by_id', 'replaced_by_priority_id', 'emphasis', 'expiration_mode', 'expires_at', 'status', 'note', 'resolved_at', 'created_at', 'updated_at'])->toArray(),
            'repositories' => EnrolledRepository::query()->where('learner_id', $learner->id)->get(['id', 'identity', 'display_name', 'normalized_remote', 'local_path', 'enrolled_at', 'unenrolled_at', 'created_at', 'updated_at'])->toArray(),
            'work_items' => WorkItem::query()->where('learner_id', $learner->id)->get(['id', 'enrolled_repository_id', 'title', 'description', 'external_url', 'detected_technologies', 'likely_catalog_branches', 'created_at', 'updated_at'])->toArray(),
            'coaching_sessions' => CoachingSession::query()->where('learner_id', $learner->id)->get(['id', 'work_item_id', 'primary_learning_objective_id', 'client_connection_id', 'status', 'desired_outcome', 'acceptance_criteria', 'responsibility_split', 'completion', 'completed_at', 'last_active_at', 'created_at', 'updated_at'])->toArray(),
            'coaching_activity_events' => CoachingActivityEvent::query()->where('learner_id', $learner->id)->orderBy('id')->get(['id', 'coaching_session_id', 'client_connection_id', 'kind', 'payload', 'created_at'])->toArray(),
            'learning_evidence' => LearningEvidence::query()->where('learner_id', $learner->id)->orderBy('id')->get(['id', 'coaching_session_id', 'competency_id', 'recorded_by_id', 'client_connection_id', 'supersedes_id', 'schema_version', 'evidence', 'created_at'])->toArray(),
            'handoff_snapshots' => HandoffSnapshot::query()->where('learner_id', $learner->id)->get(['id', 'coaching_session_id', 'mentor_id', 'payload', 'shared_at', 'created_at', 'updated_at'])->toArray(),
            'client_connections' => $clients->toArray(),
            'client_authorizations' => ClientAuthorization::query()->whereIn('client_connection_id', $clients->modelKeys())->get(['id', 'name', 'client_connection_id', 'expires_at', 'approved_at', 'exchanged_at', 'created_at', 'updated_at'])->toArray(),
            'accepted_invitations' => LearnerInvitation::query()->where('accepted_by_user_id', $learner->id)->get(['id', 'mentor_id', 'email', 'expires_at', 'accepted_at', 'created_at', 'updated_at'])->toArray(),
        ];
    }
}
