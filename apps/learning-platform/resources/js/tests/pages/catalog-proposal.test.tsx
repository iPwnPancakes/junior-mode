import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CatalogProposalShow from '@/pages/catalog-proposals/show';
import { renderPage } from '@/test/render-page';

const learner = {
    id: 4,
    name: 'Lee Learner',
    email: 'lee@example.com',
};

const root = {
    id: 10,
    parentId: null,
    position: 0,
    name: 'React development',
    definition: 'Build understandable interfaces with React.',
    demonstrationCriteria: 'Explains state flow and verifies visible behavior.',
    prerequisites: ['JavaScript'],
    workOpportunities: ['Feature work'],
    technologies: ['React'],
    selected: true,
    copiedCompetencyId: null,
};

const child = {
    ...root,
    id: 11,
    parentId: 10,
    name: 'Accessible forms',
    position: 0,
    prerequisites: [],
};

const proposal = {
    id: 9,
    status: 'awaiting_review',
    submittedAt: '2026-08-14',
    interviewContext: {
        stacks: ['TypeScript', 'React'],
        codebases: ['Customer dashboard'],
        expected_work: ['Build accessible forms'],
        development_goals: ['Reason about state flow'],
    },
    clientName: 'Mentor Mode on MacBook',
    nodes: [root, child],
    baselineAssessments: [
        {
            id: 12,
            nodeId: 11,
            nodeName: 'Accessible forms',
            level: 'not_yet_observed',
            rationale: null,
            decision: 'pending',
            applied: false,
        },
    ],
};

describe('Catalog Proposal review', () => {
    it('shows interview context, a selectable tree, and independent review actions', async () => {
        const { user } = renderPage(
            <CatalogProposalShow learner={learner} proposal={proposal} />,
        );

        expect(
            screen.getByRole('heading', {
                name: 'Catalog Proposal for Lee Learner',
            }),
        ).toBeInTheDocument();
        expect(screen.getByText('TypeScript')).toBeInTheDocument();
        expect(screen.getByText('Customer dashboard')).toBeInTheDocument();

        const children = screen.getByRole('list', {
            name: 'Children of React development',
        });
        expect(
            within(children).getByText('Accessible forms'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', {
                name: 'Exclude React development branch',
            }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByRole('button', { name: 'Approve selected branches' }),
        ).toBeEnabled();

        const assessmentList = screen.getByRole('list', {
            name: 'Baseline Assessments',
        });
        expect(
            within(assessmentList).getByText('Not yet observed'),
        ).toBeInTheDocument();
        expect(
            within(assessmentList).getByRole('button', { name: 'Approve' }),
        ).toBeEnabled();
        expect(
            within(assessmentList).getByRole('button', { name: 'Reject' }),
        ).toBeEnabled();

        await user.click(screen.getByRole('button', { name: 'Add node' }));
        expect(
            screen.getByRole('heading', { name: 'Add proposed Competency' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Name' })).toBeRequired();
    });

    it('renders a settled proposal without editing or catalog decision controls', () => {
        renderPage(
            <CatalogProposalShow
                learner={learner}
                proposal={{
                    ...proposal,
                    status: 'approved',
                    nodes: [
                        {
                            ...root,
                            copiedCompetencyId: 44,
                        },
                    ],
                    baselineAssessments: [
                        {
                            ...proposal.baselineAssessments[0],
                            decision: 'approved',
                            applied: true,
                        },
                    ],
                }}
            />,
        );

        expect(screen.getAllByText('Approved')).toHaveLength(2);
        expect(
            screen.queryByRole('button', { name: 'Add node' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', {
                name: 'Approve selected branches',
            }),
        ).not.toBeInTheDocument();
    });
});
