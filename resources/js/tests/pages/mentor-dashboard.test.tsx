import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MentorDashboard from '@/pages/mentor/dashboard';
import { renderPage } from '@/test/render-page';

describe('Mentor dashboard', () => {
    it('renders role-specific content and a keyboard-operable invitation form', async () => {
        const { user } = renderPage(
            <MentorDashboard learners={[]} pendingInvitations={[]} />,
        );

        expect(
            screen.getByRole('heading', { name: 'Mentor dashboard' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Your Learners' }),
        ).toBeInTheDocument();
        expect(screen.getByText('No Learners yet')).toBeInTheDocument();
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
});
