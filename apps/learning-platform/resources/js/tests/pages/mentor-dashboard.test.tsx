import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MentorDashboard from '@/pages/mentor/dashboard';
import { renderPage } from '@/test/render-page';

describe('Mentor dashboard', () => {
    it('renders the empty state and a keyboard-operable invitation form', async () => {
        const { user } = renderPage(
            <MentorDashboard learners={[]} pendingInvitations={[]} />,
        );

        expect(
            screen.getByRole('heading', { name: 'Your learners' }),
        ).toBeInTheDocument();
        expect(screen.getByText('No learners yet')).toBeInTheDocument();
        const email = screen.getByRole('textbox', { name: 'Learner email' });
        const submit = screen.getByRole('button', {
            name: 'Send invitation',
        });

        await user.type(email, 'learner@example.com');
        await user.tab();

        expect(email).toHaveValue('learner@example.com');
        expect(submit).toHaveFocus();
        expect(submit).toBeEnabled();
    });

    it('shows one next step per learner and counts who needs attention', () => {
        renderPage(
            <MentorDashboard
                learners={[
                    {
                        id: 4,
                        name: 'Lee Learner',
                        email: 'lee@example.com',
                        competencyCount: 0,
                        focus: [],
                        nextStep: {
                            kind: 'review_proposal',
                            label: 'Review catalog proposal',
                            detail: 'Submitted Aug 14, 2026',
                            href: '/learners/4/catalog-proposals/9',
                        },
                    },
                    {
                        id: 5,
                        name: 'Sam Learner',
                        email: 'sam@example.com',
                        competencyCount: 3,
                        focus: ['Feature testing'],
                        nextStep: {
                            kind: 'on_track',
                            label: 'Open',
                            detail: 'On track. Nothing needs you right now.',
                            href: '/learners/5',
                        },
                    },
                ]}
                pendingInvitations={[]}
            />,
        );

        expect(
            screen.getByText('1 learner needs something from you.'),
        ).toBeInTheDocument();
        const cards = within(
            screen.getByRole('list', { name: 'Learners' }),
        ).getAllByRole('listitem');

        expect(
            within(cards[0]).getByRole('link', {
                name: 'Review catalog proposal',
            }),
        ).toHaveAttribute('href', '/learners/4/catalog-proposals/9');
        expect(
            within(cards[1]).getByText(
                '3 competencies · Focus: Feature testing',
            ),
        ).toBeInTheDocument();
        expect(
            within(cards[1]).getByRole('link', { name: 'Sam Learner' }),
        ).toHaveAttribute('href', '/learners/5');
    });
});
