import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CoachingRecord from '@/pages/coaching-records/show';
import { renderPage } from '@/test/render-page';

const learner = {
    id: 2,
    name: 'Lee Learner',
    email: 'lee@example.com',
};

const competencies = [
    { id: 10, name: 'Authorization' },
    { id: 11, name: 'Request validation' },
];

const assessments = [
    {
        id: 20,
        competencyName: 'Authorization',
        level: 'developing',
        levelLabel: 'Developing',
        rationale: 'Can apply a policy with guidance.',
        assessedBy: 'Morgan Mentor',
        assessedAt: '2026-08-25',
    },
];

const priorities = [
    {
        id: 30,
        competencyId: 10,
        competencyName: 'Authorization',
        emphasis: 'high' as const,
        expirationMode: 'custom_date' as const,
        expiresOn: '2026-09-01',
        status: 'active',
        displayStatus: 'active',
        displayStatusLabel: 'Active',
        note: 'Look for policy boundaries in feature work.',
        createdAt: '2026-08-25',
        resolvedAt: null,
        replacement: null,
    },
    {
        id: 31,
        competencyId: 11,
        competencyName: 'Request validation',
        emphasis: 'normal' as const,
        expirationMode: 'until_removed' as const,
        expiresOn: null,
        status: 'active',
        displayStatus: 'persistent',
        displayStatusLabel: 'Persistent',
        note: null,
        createdAt: '2026-08-20',
        resolvedAt: null,
        replacement: null,
    },
];

describe('Coaching record', () => {
    it('provides separate Assessment and Priority forms with all expiration choices', async () => {
        const { user } = renderPage(
            <CoachingRecord
                learner={learner}
                canManage
                defaultPriorityDurationDays={7}
                competencies={competencies}
                assessments={[]}
                priorities={[]}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Record an Assessment' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Record Assessment' }),
        ).toBeEnabled();
        expect(
            screen.getByRole('button', { name: 'Activate Priority' }),
        ).toBeEnabled();

        const expiration = screen.getByRole('combobox', {
            name: 'Expiration',
        });
        expect(expiration).toHaveAccessibleDescription(
            'The default duration is 7 days.',
        );
        expect(
            screen.getByRole('option', { name: 'Until removed' }),
        ).toBeInTheDocument();

        await user.selectOptions(expiration, 'custom_date');

        expect(screen.getByLabelText('Expires on')).toBeRequired();
    });

    it('shows visible statuses and each Mentor lifecycle action', async () => {
        const { user } = renderPage(
            <CoachingRecord
                learner={learner}
                canManage
                defaultPriorityDurationDays={7}
                competencies={competencies}
                assessments={assessments}
                priorities={priorities}
            />,
        );

        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Persistent')).toBeInTheDocument();
        expect(screen.getAllByText('Developing')).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: 'Refine' })).toHaveLength(
            2,
        );
        expect(screen.getAllByRole('button', { name: 'Replace' })).toHaveLength(
            2,
        );
        expect(
            screen.getAllByRole('button', {
                name: 'Sufficiently demonstrated',
            }),
        ).toHaveLength(2);

        await user.click(screen.getAllByRole('button', { name: 'Renew' })[0]);

        expect(
            screen.getByRole('heading', { name: 'Renew Authorization' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Renew Priority' }),
        ).toBeEnabled();
    });

    it('keeps the Learner view read-only while exposing the complete record', () => {
        renderPage(
            <CoachingRecord
                learner={learner}
                canManage={false}
                defaultPriorityDurationDays={7}
                competencies={competencies}
                assessments={assessments}
                priorities={priorities}
            />,
        );

        expect(screen.getByText('Developing')).toBeInTheDocument();
        expect(screen.getByText('Persistent')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Activate Priority' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Refine' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText('Default duration in days'),
        ).not.toBeInTheDocument();
    });
});

it('shows recorded Solution Escapes and the evidence limit to the Learner', () => {
    renderPage(
        <CoachingRecord
            learner={learner}
            canManage={false}
            defaultPriorityDurationDays={7}
            competencies={competencies}
            assessments={[]}
            priorities={[]}
            learningActivities={[
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
            ]}
        />,
    );
    expect(
        screen.getByRole('heading', { name: 'Coaching activity' }),
    ).toBeInTheDocument();
    expect(
        screen.getByText('Requested the complete solution after four hints'),
    ).toBeInTheDocument();
    expect(screen.getByText('Reason: still stuck')).toBeInTheDocument();
    expect(
        screen.getByText(
            /Evidence from this Session can support Guided progress at most/,
        ),
    ).toBeInTheDocument();
});
