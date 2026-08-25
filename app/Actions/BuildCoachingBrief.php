<?php

namespace App\Actions;

use App\BaselineAssessmentLevel;
use App\CoachingPriorityEmphasis;
use App\CoachingPriorityStatus;
use App\Models\Assessment;
use App\Models\CoachingPriority;
use App\Models\Competency;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class BuildCoachingBrief
{
    /**
     * @param  array{title: string, description: string, detected_technologies: array<int, string>, likely_catalog_branches: array<int, int>}  $context
     * @return array<int, array<string, mixed>>
     */
    public function handle(User $learner, array $context): array
    {
        $competencies = $learner->competencies()
            ->whereNull('archived_at')
            ->whereNull('merged_into_id')
            ->with(['assessments', 'coachingPriorities'])
            ->orderBy('position')
            ->orderBy('id')
            ->get();
        $parentIds = $competencies->pluck('parent_id', 'id')->all();

        return $competencies
            ->filter(fn (Competency $competency): bool => $this->isRelevant($competency, $parentIds, $context))
            ->map(fn (Competency $competency): ?array => $this->makeEntry($competency, $context['detected_technologies']))
            ->filter()
            ->sortBy([['rank', 'asc'], ['competency_id', 'asc']])
            ->groupBy('kind')
            ->map(fn (Collection $entries): array => $entries->first())
            ->sortBy('rank')
            ->take(6)
            ->map(fn (array $entry): array => collect($entry)->except('rank')->all())
            ->values()
            ->all();
    }

    /**
     * @param  array<array-key, int|null>  $parentIds
     * @param  array{title: string, description: string, detected_technologies: array<int, string>, likely_catalog_branches: array<int, int>}  $context
     */
    private function isRelevant(Competency $competency, array $parentIds, array $context): bool
    {
        if ($this->belongsToLikelyBranch($competency, $parentIds, $context['likely_catalog_branches'])) {
            return true;
        }

        $technologies = collect($competency->technologies ?? [])->map(fn (string $technology): string => Str::lower($technology));
        $detectedTechnologies = collect($context['detected_technologies'])->map(fn (string $technology): string => Str::lower($technology));

        if ($technologies->contains(fn (string $technology): bool => $detectedTechnologies->contains(
            fn (string $detected): bool => Str::contains($technology, $detected) || Str::contains($detected, $technology),
        ))) {
            return true;
        }

        $workItemTerms = $this->terms($context['title'].' '.$context['description'].' '.implode(' ', $context['detected_technologies']));
        $competencyTerms = $this->terms(implode(' ', [
            $competency->name,
            $competency->definition,
            implode(' ', $competency->work_opportunities ?? []),
            implode(' ', $competency->technologies ?? []),
        ]));

        return $workItemTerms->intersect($competencyTerms)->isNotEmpty();
    }

    /**
     * @param  array<array-key, int|null>  $parentIds
     * @param  array<int, int>  $likelyBranches
     */
    private function belongsToLikelyBranch(Competency $competency, array $parentIds, array $likelyBranches): bool
    {
        $candidateId = $competency->id;

        while ($candidateId !== null) {
            if (in_array($candidateId, $likelyBranches, true)) {
                return true;
            }

            $candidateId = $parentIds[$candidateId] ?? null;
        }

        return false;
    }

    /**
     * @param  array<int, string>  $detectedTechnologies
     * @return array<string, mixed>|null
     */
    private function makeEntry(Competency $competency, array $detectedTechnologies): ?array
    {
        $priority = $competency->coachingPriorities
            ->filter(fn (CoachingPriority $priority): bool => $priority->status === CoachingPriorityStatus::Active && ! $priority->isExpired())
            ->sortByDesc(fn (CoachingPriority $priority): bool => $priority->emphasis === CoachingPriorityEmphasis::High)
            ->first();
        $latestAssessment = $competency->assessments->first();
        $previousAssessment = $competency->assessments->skip(1)->first();
        $relevance = $detectedTechnologies === []
            ? 'the supplied Work Item context'
            : implode(', ', array_slice($detectedTechnologies, 0, 3));

        [$kind, $rank, $reason] = match (true) {
            $priority?->emphasis === CoachingPriorityEmphasis::High => [
                'active_high_priority', 1, "High-emphasis Coaching Priority applicable to {$relevance}.",
            ],
            $priority !== null => [
                'active_normal_priority', 2, "Active Coaching Priority applicable to {$relevance}.",
            ],
            $this->isRecentDifficulty($latestAssessment) => [
                'recent_difficulty', 3, 'Recent Mentor Assessment identifies this Competency as developing.',
            ],
            $this->isStaleOrContradictory($latestAssessment, $previousAssessment) => [
                'stale_or_contradictory_evidence', 4, $previousAssessment !== null && $latestAssessment?->level !== $previousAssessment->level
                    ? 'The two latest Mentor Assessments disagree.'
                    : 'The latest Mentor Assessment is older than 90 days.',
            ],
            $latestAssessment === null || $latestAssessment->level === BaselineAssessmentLevel::NotYetObserved => [
                'unobserved', 5, 'This applicable Competency has not yet been observed.',
            ],
            in_array($latestAssessment->level, [BaselineAssessmentLevel::Consistent, BaselineAssessmentLevel::Independent], true) => [
                'demonstrated_context', 6, 'A recent Mentor Assessment indicates useful demonstrated context.',
            ],
            default => [null, 99, null],
        };

        if ($kind === null || $reason === null) {
            return null;
        }

        return [
            'rank' => $rank,
            'kind' => $kind,
            'competency_id' => $competency->id,
            'name' => $competency->name,
            'definition' => $competency->definition,
            'demonstration_criteria' => $competency->demonstration_criteria,
            'reason' => $reason,
        ];
    }

    private function isRecentDifficulty(?Assessment $assessment): bool
    {
        return $assessment?->level === BaselineAssessmentLevel::Developing
            && $assessment->assessed_at->greaterThanOrEqualTo(now()->subDays(90));
    }

    private function isStaleOrContradictory(?Assessment $latest, ?Assessment $previous): bool
    {
        return $latest !== null && ($latest->assessed_at->lessThan(now()->subDays(90))
            || ($previous !== null && $latest->level !== $previous->level));
    }

    /** @return Collection<int, string> */
    private function terms(string $value): Collection
    {
        $ignored = ['with', 'from', 'that', 'this', 'into', 'using', 'work', 'item', 'build', 'add', 'create', 'update'];

        return Str::of($value)
            ->lower()
            ->matchAll('/[\pL\pN]+/u')
            ->filter(fn (string $term): bool => Str::length($term) >= 3 && ! in_array($term, $ignored, true))
            ->unique()
            ->values();
    }
}
