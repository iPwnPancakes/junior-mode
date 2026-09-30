import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LearnerPage from '@/pages/learners/show';
import { renderPage } from '@/test/render-page';
import type {
    CoachingFocus,
    CompetencyTemplate,
    PlanCompetency,
} from '@/types/coaching-plan';

const learner = { id: 2, name: 'Lee Learner', email: 'lee@example.com' };

const focus: CoachingFocus = {
    id: 30,
    competencyId: 11,
    competencyName: 'Authorization',
    emphasis: 'normal',
    expirationMode: 'default_duration',
    expiresOn: '2026-10-05',
    status: 'active',
    displayStatus: 'active',
    displayStatusLabel: 'Active',
    note: null,
    createdAt: '2026-09-28',
    resolvedAt: null,
    replacement: null,
};

function competency(overrides: Partial<PlanCompetency>): PlanCompetency {
    return {
        id: 10,
        parentId: null,
        name: 'Laravel development',
        definition: 'Building web applications with Laravel conventions.',
        demonstrationCriteria: 'Implements and explains an end-to-end request.',
        prerequisites: [],
        workOpportunities: [],
        technologies: ['Laravel'],
        archivedAt: null,
        mergedInto: null,
        level: null,
        focus: null,
        ...overrides,
    };
}

const root = competency({});
const child = competency({
    id: 11,
    parentId: 10,
    name: 'Authorization',
    definition: 'Restricting actions to the correct actor.',
    level: {
        value: 'developing',
        label: 'Developing',
        rationale: null,
        assessedAt: '2026-09-20',
    },
    focus,
});

const template: CompetencyTemplate = {
    id: 5,
    name: 'Programming foundations',
    description: 'Stack-neutral foundations.',
    nodes: [
        {
            id: 50,
            parentId: null,
            position: 0,
            name: 'Automated testing',
            definition: 'Verifying behaviour with executable examples.',
            demonstrationCriteria: 'Writes a focused failing test first.',
            prerequisites: [],
            workOpportunities: [],
            technologies: [],
        },
    ],
};

function renderLearnerPage(
    overrides: Partial<Parameters<typeof LearnerPage>[0]> = {},
) {
    return renderPage(
        <LearnerPage
            learner={learner}
            canManage
            defaultPriorityDurationDays={7}
            competencies={[root, child]}
            templates={[template]}
            assessments={[]}
            priorities={[focus]}
            {...overrides}
        />,
    );
}

describe('Learner page', () => {
    it('starts an empty plan from a template in one click', () => {
        renderLearnerPage({ competencies: [], priorities: [] });

        expect(screen.getByText('No competencies yet')).toBeInTheDocument();
        const useTemplate = screen.getByRole('button', {
            name: 'Use this template',
        });
        const form = useTemplate.closest('form');

        expect(form).toHaveAttribute(
            'action',
            '/learners/2/competency-template-copies',
        );
        expect(form?.querySelector('input[name="template_id"]')).toHaveValue(
            '5',
        );
        expect(form?.querySelector('[name="parent_id"]')).toBeNull();
    });

    it('adds a competency without asking for a position', async () => {
        const { user } = renderLearnerPage({
            competencies: [],
            priorities: [],
        });

        await user.click(
            screen.getByRole('button', { name: 'Add your own competency' }),
        );

        const dialog = screen.getByRole('dialog', { name: 'Add a competency' });
        expect(within(dialog).getByLabelText('Name')).toBeRequired();
        expect(within(dialog).getByLabelText('What it means')).toBeRequired();
        expect(
            within(dialog).getByLabelText("How you'll know it's demonstrated"),
        ).toBeRequired();
        expect(within(dialog).queryByLabelText('Position')).toBeNull();
        expect(
            within(dialog).getByRole('button', { name: 'More details' }),
        ).toBeInTheDocument();
    });

    it('focuses coaching on a competency in one click with the defaults', () => {
        renderLearnerPage();

        const row = screen.getByRole('article', {
            name: 'Laravel development',
        });
        const form = within(row)
            .getByRole('button', { name: 'Focus coaching here' })
            .closest('form');

        expect(form).toHaveAttribute(
            'action',
            '/learners/2/coaching-priorities',
        );
        expect(form?.querySelector('[name="competency_id"]')).toHaveValue('10');
        expect(form?.querySelector('[name="emphasis"]')).toHaveValue('normal');
        expect(form?.querySelector('[name="expiration_mode"]')).toHaveValue(
            'default_duration',
        );
    });

    it('shows level and focus inline and offers Extend, Done, and Edit focus', async () => {
        const { user } = renderLearnerPage();

        const row = screen.getByRole('article', { name: 'Authorization' });
        expect(within(row).getByText('Developing')).toBeInTheDocument();
        expect(
            within(row).getByText('Focus until Oct 5, 2026'),
        ).toBeInTheDocument();
        expect(
            within(row)
                .getByRole('button', { name: 'Extend 7 days' })
                .closest('form'),
        ).toHaveAttribute(
            'action',
            '/learners/2/coaching-priorities/30/renewal',
        );
        expect(
            within(row)
                .getByRole('button', { name: 'Done' })
                .closest('form')
                ?.querySelector('[name="status"]'),
        ).toHaveValue('sufficiently_demonstrated');
        expect(
            within(row).queryByRole('button', { name: 'Replace' }),
        ).toBeNull();

        await user.click(
            within(row).getByRole('button', { name: 'Edit focus' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Focus on Authorization',
        });
        expect(
            within(dialog).getByRole('button', {
                name: 'Stop without marking done',
            }),
        ).toBeInTheDocument();
    });

    it('sets a level by choosing one option', async () => {
        const { user } = renderLearnerPage();

        const row = screen.getByRole('article', {
            name: 'Laravel development',
        });
        await user.click(
            within(row).getByRole('button', { name: 'Set level' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'How is Laravel development going?',
        });

        await user.click(
            within(dialog).getByRole('button', { name: /Consistent/ }),
        );

        expect(dialog.querySelector('input[name="level"]')).toHaveValue(
            'consistent',
        );
        expect(dialog.querySelector('input[name="competency_id"]')).toHaveValue(
            '10',
        );
    });

    it('still adds competencies after every one is archived', async () => {
        const { user } = renderLearnerPage({
            competencies: [competency({ archivedAt: '2026-09-28' })],
            priorities: [],
        });

        await user.click(
            screen.getByRole('button', { name: 'Add competency' }),
        );

        expect(
            screen.getByRole('dialog', { name: 'Add a competency' }),
        ).toBeInTheDocument();
    });

    it('keeps the Learner view read-only', () => {
        renderLearnerPage({ canManage: false });

        expect(
            screen.getByRole('heading', { name: 'Your coaching plan' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Developing')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Focus coaching here' }),
        ).toBeNull();
        expect(screen.queryByRole('button', { name: 'Set level' })).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Add competency' }),
        ).toBeNull();
    });

    it('shows recorded Solution Escapes and the evidence limit', () => {
        renderLearnerPage({
            canManage: false,
            learningActivities: [
                {
                    id: 1,
                    kind: 'solution_escape',
                    session_title: 'Validate profiles',
                    payload: {
                        summary:
                            'Requested the complete solution after four hints',
                        reason: 'still_stuck',
                    },
                },
            ],
        });

        expect(
            screen.getByRole('heading', { name: 'Coaching activity' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Reason: still stuck')).toBeInTheDocument();
        expect(
            screen.getByText(
                /Evidence from this Session can support Guided progress at most/,
            ),
        ).toBeInTheDocument();
    });
});
