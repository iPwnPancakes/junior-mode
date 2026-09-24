import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ClientConnections from '@/pages/client-connections/index';
import { renderPage } from '@/test/render-page';

const activeConnection = {
    id: 1,
    name: 'Codex on MacBook',
    status: 'active' as const,
    authorizedAt: '2026-08-12',
    lastUsedAt: '2026-08-12',
    revokedAt: null,
};

describe('Client connections', () => {
    it('lets a Learner review and begin revoking an active client', async () => {
        const { user } = renderPage(
            <ClientConnections
                viewerRole="learner"
                connections={[activeConnection]}
                learners={[]}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Codex clients' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Codex on MacBook')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Revoke' }));

        expect(
            screen.getByRole('heading', {
                name: 'Revoke Codex on MacBook?',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Revoke client' }),
        ).toBeEnabled();
    });

    it('gives a Mentor credential-free visibility without revocation controls', () => {
        renderPage(
            <ClientConnections
                viewerRole="mentor"
                connections={[]}
                learners={[
                    {
                        id: 2,
                        name: 'Lee Learner',
                        email: 'lee@example.com',
                        connections: [activeConnection],
                    },
                ]}
            />,
        );

        expect(screen.getByText('Lee Learner')).toBeInTheDocument();
        expect(screen.getByText('lee@example.com')).toBeInTheDocument();
        expect(screen.getByText('Codex on MacBook')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Revoke' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/access_token/i)).not.toBeInTheDocument();
    });
});
