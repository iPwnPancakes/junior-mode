import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LearningProgress } from '@/components/learning-progress';
import type { Progress } from '@/components/learning-progress';
import { renderPage } from '@/test/render-page';

const evidence = {
    activity: 'implementation',
    assistance: 'review_only',
    hints_used: 0,
    ownership: 'learner',
    learner_work: 'Implemented input validation',
    agent_work: '',
    verification: { passed: true, reference: 'Validation tests passed' },
    teach_back: {
        demonstrated: true,
        summary: 'Explained required constraints',
    },
    context_key: 'http',
    context_description: 'HTTP profile endpoint',
    source: 'agent',
};
const progress: Progress = {
    assessment_relationship: 'Mentor assessments remain separate judgments.',
    competencies: [
        {
            competency_id: 1,
            name: 'Validation',
            stage: 'independent',
            has_evidence: true,
            next_stage_requirement: 'Repeat in a materially different context.',
            suggested_support: 'review_only',
            supporting_evidence: [
                {
                    id: 7,
                    session_id: 3,
                    qualifies: true,
                    recorded_at: '2026-09-24',
                    evidence,
                },
            ],
            correction_history: [
                {
                    id: 7,
                    supersedes_id: 6,
                    reason: 'Reviewed authorship',
                    original_evidence: { ...evidence, ownership: 'agent' },
                },
            ],
            assistance_trend: [
                { evidence_id: 7, assistance: 'review_only', hints_used: 0 },
            ],
        },
    ],
};

describe('Learning progress', () => {
    it('shows transparent evidence, next challenge, receipt and original correction history', () => {
        renderPage(
            <LearningProgress
                progress={progress}
                receipts={[
                    {
                        id: 3,
                        title: 'Profile validation',
                        completion: {
                            outcome: 'Invalid input rejected',
                            reflection: 'I understand validation order',
                            unresolved_questions: ['How do imports differ?'],
                            next_challenge: 'Validate queued imports',
                        },
                    },
                ]}
            />,
        );
        expect(screen.getByText('independent')).toBeInTheDocument();
        expect(
            screen.getByText('Repeat in a materially different context.'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Correction #7 replaced #6'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Next challenge: Validate queued imports'),
        ).toBeInTheDocument();
        fireEvent.click(screen.getByText(/Observation #7/));
        fireEvent.click(
            screen.getByRole('button', { name: 'Correct this observation' }),
        );
        expect(screen.getByLabelText('Reason for correction')).toBeRequired();
        expect(screen.getByLabelText('agent work')).toHaveValue('');
        expect(
            screen.getByRole('button', { name: 'Append correction' }),
        ).toBeInTheDocument();
    });

    it('distinguishes unobserved catalog entries from introduced evidence', () => {
        renderPage(
            <LearningProgress
                progress={{
                    ...progress,
                    competencies: [
                        {
                            ...progress.competencies[0],
                            has_evidence: false,
                            stage: 'introduced',
                            supporting_evidence: [],
                            correction_history: [],
                            assistance_trend: [],
                        },
                    ],
                }}
                receipts={[]}
            />,
        );
        expect(screen.getByText('Not yet observed')).toBeInTheDocument();
        expect(screen.queryByText('introduced')).not.toBeInTheDocument();
    });
});

it('explains recorded assistance without rewriting the original observation', () => {
    const assisted = structuredClone(progress);
    assisted.competencies[0].stage = 'guided';
    assisted.competencies[0].supporting_evidence[0].recorded_hints_used = 4;
    assisted.competencies[0].supporting_evidence[0].solution_escape_used = true;
    renderPage(<LearningProgress progress={assisted} receipts={[]} />);
    fireEvent.click(screen.getByText(/Observation #7/));
    expect(
        screen.getByText(
            /4 requested hints and a Solution Escape were recorded/,
        ),
    ).toBeVisible();
    expect(screen.getAllByText(/review only · 0 hints/).length).toBeGreaterThan(
        0,
    );
});
