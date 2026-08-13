import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LearnerDashboard from '@/pages/learner/dashboard';
import { renderPage } from '@/test/render-page';

describe('Learner dashboard', () => {
    it('renders the Learner empty state and attributed Mentor', () => {
        renderPage(
            <LearnerDashboard
                mentor={{
                    id: 1,
                    name: 'Morgan Mentor',
                    email: 'morgan@example.com',
                }}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Learner dashboard' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Your learning record' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('No coaching activity yet'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Your Mentor' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Morgan Mentor')).toBeInTheDocument();
        expect(screen.getByText('morgan@example.com')).toBeInTheDocument();
    });
});
