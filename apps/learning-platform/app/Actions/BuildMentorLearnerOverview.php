<?php

namespace App\Actions;

use App\CatalogProposalStatus;
use App\CoachingPriorityStatus;
use App\Models\CatalogProposal;
use App\Models\CoachingPriority;
use App\Models\HelpRequest;
use App\Models\User;

/**
 * Summarizes each of a Mentor's Learners with the single most useful next step,
 * so the dashboard works as a to-do list rather than a set of destinations.
 */
class BuildMentorLearnerOverview
{
    private const int FocusEndingSoonDays = 2;

    private const int RecentHelpRequestDays = 7;

    /**
     * @return list<array{
     *     id: int,
     *     name: string,
     *     email: string,
     *     competencyCount: int,
     *     focus: list<string>,
     *     nextStep: array{kind: string, label: string, detail: string, href: string},
     * }>
     */
    public function handle(User $mentor): array
    {
        $learners = $mentor->learners()
            ->withCount([
                'competencies as active_competencies_count' => fn ($query) => $query
                    ->whereNull('archived_at')
                    ->whereNull('merged_into_id'),
                'enrolledRepositories as enrolled_repositories_count' => fn ($query) => $query
                    ->whereNull('unenrolled_at'),
            ])
            ->with(['coachingPriorities' => fn ($query) => $query
                ->where('status', CoachingPriorityStatus::Active)
                ->with('competency:id,name')
                ->orderBy('expires_at')])
            ->latest()
            ->get();
        $learnerIds = $learners->modelKeys();
        $proposals = CatalogProposal::query()
            ->whereIn('learner_id', $learnerIds)
            ->where('status', CatalogProposalStatus::AwaitingReview)
            ->latest('submitted_at')
            ->get()
            ->unique('learner_id')
            ->keyBy('learner_id');
        $helpRequests = HelpRequest::query()
            ->whereIn('learner_id', $learnerIds)
            ->where('mentor_id', $mentor->id)
            ->where('shared_at', '>=', now()->subDays(self::RecentHelpRequestDays))
            ->latest('shared_at')
            ->get()
            ->unique('learner_id')
            ->keyBy('learner_id');

        return array_values($learners->map(fn (User $learner): array => [
            'id' => $learner->id,
            'name' => $learner->name,
            'email' => $learner->email,
            'competencyCount' => (int) $learner->getAttribute('active_competencies_count'),
            'focus' => array_values($learner->coachingPriorities
                ->reject(fn (CoachingPriority $priority): bool => $priority->isExpired())
                ->map(fn (CoachingPriority $priority): string => $priority->competency->name)
                ->all()),
            'nextStep' => $this->nextStep(
                $learner,
                $proposals->get($learner->id),
                $helpRequests->get($learner->id),
            ),
        ])->all());
    }

    /** @return array{kind: string, label: string, detail: string, href: string} */
    private function nextStep(User $learner, ?CatalogProposal $proposal, ?HelpRequest $helpRequest): array
    {
        $learnerPage = route('learners.show', $learner);

        if ($proposal !== null) {
            return [
                'kind' => 'review_proposal',
                'label' => __('Review catalog proposal'),
                'detail' => __('Submitted :date', ['date' => $proposal->submitted_at?->toFormattedDateString()]),
                'href' => route('catalog-proposals.show', [$learner, $proposal]),
            ];
        }

        if ((int) $learner->getAttribute('active_competencies_count') === 0) {
            return [
                'kind' => 'set_up_plan',
                'label' => __('Set up coaching plan'),
                'detail' => __('Pick the competencies to grow, starting from a template.'),
                'href' => $learnerPage,
            ];
        }

        if ($learner->enrolled_repositories_count === 0) {
            return [
                'kind' => 'enroll_repository',
                'label' => __('Enroll a repository'),
                'detail' => __('Coaching only runs in enrolled repositories.'),
                'href' => route('enrolled-repositories.index'),
            ];
        }

        if ($helpRequest !== null) {
            return [
                'kind' => 'read_help_request',
                'label' => __('Read Help Request'),
                'detail' => __('Shared :date', ['date' => $helpRequest->shared_at->toFormattedDateString()]),
                'href' => route('help-requests.show', $helpRequest),
            ];
        }

        $expired = $learner->coachingPriorities->first(
            fn (CoachingPriority $priority): bool => $priority->isExpired(),
        );

        if ($expired !== null) {
            return [
                'kind' => 'focus_expired',
                'label' => __('Review focus'),
                'detail' => __(':competency focus ended :date', [
                    'competency' => $expired->competency->name,
                    'date' => $expired->expires_at->toFormattedDateString(),
                ]),
                'href' => $learnerPage,
            ];
        }

        $endingSoon = $learner->coachingPriorities->first(
            fn (CoachingPriority $priority): bool => $priority->expires_at?->lte(now()->addDays(self::FocusEndingSoonDays)) === true,
        );

        if ($endingSoon !== null) {
            return [
                'kind' => 'focus_ending',
                'label' => __('Review focus'),
                'detail' => __(':competency focus ends :date', [
                    'competency' => $endingSoon->competency->name,
                    'date' => $endingSoon->expires_at->toFormattedDateString(),
                ]),
                'href' => $learnerPage,
            ];
        }

        if ($learner->coachingPriorities->isEmpty()) {
            return [
                'kind' => 'choose_focus',
                'label' => __('Choose a focus'),
                'detail' => __('Tell coaching which competency to look for.'),
                'href' => $learnerPage,
            ];
        }

        return [
            'kind' => 'on_track',
            'label' => __('Open'),
            'detail' => __('On track. Nothing needs you right now.'),
            'href' => $learnerPage,
        ];
    }
}
