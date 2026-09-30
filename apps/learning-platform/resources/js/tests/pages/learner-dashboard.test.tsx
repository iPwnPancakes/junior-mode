import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LearnerDashboard from '@/pages/learner/dashboard';
import { renderPage } from '@/test/render-page';

const props = {
    learner: { id: 2, name: 'Lee Learner' },
    mentor: {
        id: 1,
        name: 'Morgan Mentor',
        email: 'morgan@example.com',
    },
    setup: { hasPlan: true, hasClient: true, hasRepository: true },
    focus: [],
    activeSessions: [],
    helpRequestsAwaitingReview: 0,
};

describe('Learner dashboard', () => {
    it('links to the coaching plan and shows the attributed Mentor', () => {
        renderPage(<LearnerDashboard {...props} />);

        expect(
            screen.getByRole('heading', { name: 'Your coaching' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'View coaching plan' }),
        ).toHaveAttribute('href', '/learners/2');
        expect(
            screen.getByRole('heading', { name: 'Your Mentor' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Morgan Mentor')).toBeInTheDocument();
        expect(screen.getByText('morgan@example.com')).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Get set up' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'No focus right now' }),
        ).toBeInTheDocument();
    });

    it('lists the setup steps that are still missing with a way to finish each', () => {
        renderPage(
            <LearnerDashboard
                {...props}
                setup={{
                    hasPlan: false,
                    hasClient: true,
                    hasRepository: false,
                }}
            />,
        );

        const steps = screen.getByRole('list', { name: 'Setup steps' });
        expect(
            within(steps).getByText(/Morgan Mentor is choosing/),
        ).toBeInTheDocument();
        expect(
            within(steps).getByRole('link', { name: /Repositories/ }),
        ).toHaveAttribute('href', '/repositories');
        expect(
            within(steps).queryByRole('link', { name: /Codex clients/ }),
        ).not.toBeInTheDocument();
    });

    it('shows current focus, active Sessions and Help Requests waiting for review', () => {
        renderPage(
            <LearnerDashboard
                {...props}
                focus={[
                    {
                        id: 4,
                        competencyName: 'Authorization',
                        emphasis: 'high',
                        expiresOn: 'Oct 3, 2026',
                        note: 'Look for policy work.',
                    },
                ]}
                activeSessions={[
                    {
                        id: 9,
                        title: 'Restrict invoice exports',
                        objective: 'Authorization',
                        lastActive: '5 hours ago',
                    },
                ]}
                helpRequestsAwaitingReview={2}
            />,
        );

        const focus = screen.getByRole('list', { name: 'Current focus' });
        expect(within(focus).getByText('High focus')).toBeInTheDocument();
        expect(
            within(focus).getByText('Until Oct 3, 2026'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Restrict invoice exports'),
        ).toBeInTheDocument();
        expect(screen.getByText('Active 5 hours ago')).toBeInTheDocument();
        expect(
            screen.getByText('2 Help Requests are waiting for your review'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Review Help Requests' }),
        ).toHaveAttribute('href', '/help-requests');
    });
});
