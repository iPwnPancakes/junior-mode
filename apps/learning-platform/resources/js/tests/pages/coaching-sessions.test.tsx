import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CoachingSessions from '@/pages/coaching-sessions/index';
import { renderPage } from '@/test/render-page';

const session = {
    id: 1,
    learnerId: 7,
    learnerName: 'Lee Learner',
    workItem: {
        title: 'Validate profile updates',
        description: 'Add bounded validation to the profile endpoint.',
        externalUrl: 'https://github.com/example/project/issues/41',
    },
    repository: { name: 'Profiles', identity: 'repository-identity' },
    objective: 'Request validation',
    clientSource: 'Codex on laptop',
    status: 'active',
    lastActiveAt: '2026-08-25T16:00:00+00:00',
    lastActive: '2 hours ago',
};

describe('Coaching Sessions', () => {
    it('shows Work Item, repository, objective, client source, and recency to a Learner', () => {
        renderPage(
            <CoachingSessions viewerRole="learner" sessions={[session]} />,
        );

        const active = screen.getByRole('list', {
            name: 'Active Coaching Sessions',
        });
        expect(
            within(active).getByText('Validate profile updates'),
        ).toBeInTheDocument();
        expect(within(active).getByText('Profiles')).toBeInTheDocument();
        expect(
            within(active).getByText('Request validation'),
        ).toBeInTheDocument();
        expect(within(active).getByText('Codex on laptop')).toBeInTheDocument();
        expect(within(active).getByText('2 hours ago')).toHaveAttribute(
            'datetime',
            '2026-08-25T16:00:00+00:00',
        );
        expect(
            screen.getByRole('link', { name: 'Open Work Item' }),
        ).toHaveAttribute(
            'href',
            'https://github.com/example/project/issues/41',
        );
        expect(screen.queryByText('Lee Learner')).not.toBeInTheDocument();
    });

    it('links a Mentor to each Learner and separates settled Sessions', () => {
        renderPage(
            <CoachingSessions
                viewerRole="mentor"
                sessions={[
                    session,
                    {
                        ...session,
                        id: 2,
                        status: 'concluded',
                        workItem: {
                            ...session.workItem,
                            title: 'Paginate the audit log',
                        },
                    },
                ]}
            />,
        );

        expect(
            within(
                screen.getByRole('list', { name: 'Active Coaching Sessions' }),
            ).getByRole('link', { name: 'Lee Learner' }),
        ).toHaveAttribute('href', '/learners/7');

        const settled = screen.getByRole('list', {
            name: 'Settled Coaching Sessions',
        });
        expect(
            within(settled).getByText('Paginate the audit log'),
        ).toBeInTheDocument();
        expect(within(settled).getByText('Concluded')).toBeInTheDocument();
    });

    it('explains when no Sessions exist yet', () => {
        renderPage(<CoachingSessions viewerRole="learner" sessions={[]} />);

        expect(
            screen.getByRole('heading', { name: 'No Coaching Sessions yet' }),
        ).toBeInTheDocument();
    });
});
