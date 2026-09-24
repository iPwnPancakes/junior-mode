import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EnrolledRepositories from '@/pages/enrolled-repositories/index';
import type { RepositoryLearner } from '@/pages/enrolled-repositories/index';
import { renderPage } from '@/test/render-page';

const learner: RepositoryLearner = {
    id: 2,
    name: 'Lee Learner',
    email: 'lee@example.com',
    repositories: [],
};

describe('Enrolled repositories', () => {
    it('shows a Learner the opt-in empty state and enrollment form', async () => {
        const { user } = renderPage(
            <EnrolledRepositories
                viewerRole="learner"
                learner={learner}
                learners={[]}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Enrolled repositories' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('No repositories enrolled'),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Enroll repository' }),
        );

        expect(
            screen.getByRole('heading', { name: 'Enroll a repository' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Display name')).toBeRequired();
        expect(screen.getByLabelText('Git remote')).toBeInTheDocument();
        expect(screen.getByLabelText('Local path')).toBeInTheDocument();
    });

    it('shows stable identity, mutable details, and a safe unenrollment confirmation', async () => {
        const { user } = renderPage(
            <EnrolledRepositories
                viewerRole="learner"
                learner={{
                    ...learner,
                    repositories: [
                        {
                            id: 7,
                            identity: 'b339159e-f8ee-4a0f-84bb-761f874b9677',
                            displayName: 'API service',
                            normalizedRemote: 'github.com/example/api',
                            localPath: '/work/api',
                            status: 'enrolled',
                            enrolledAt: '2026-08-25',
                            unenrolledAt: null,
                        },
                    ],
                }}
                learners={[]}
            />,
        );

        expect(screen.getByText('API service')).toBeInTheDocument();
        expect(screen.getByText('Enrolled')).toBeInTheDocument();
        expect(
            screen.getByText(/b339159e-f8ee-4a0f-84bb-761f874b9677/),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Edit' }));
        expect(
            screen.getByRole('heading', { name: 'Edit repository details' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Display name')).toHaveValue(
            'API service',
        );
        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        await user.click(screen.getByRole('button', { name: 'Unenroll' }));
        expect(
            screen.getByRole('heading', { name: 'Unenroll API service?' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Existing structured learning evidence remains/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Unenroll repository' }),
        ).toBeEnabled();
    });

    it('shows the Mentor empty state before a Learner joins', () => {
        renderPage(
            <EnrolledRepositories
                viewerRole="mentor"
                learner={null}
                learners={[]}
            />,
        );

        expect(screen.getByText('No Learners yet')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Enroll repository' }),
        ).not.toBeInTheDocument();
    });
});
