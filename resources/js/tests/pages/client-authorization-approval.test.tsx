import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ClientAuthorizationApproval from '@/pages/client-authorizations/show';
import { renderPage } from '@/test/render-page';

describe('Client authorization approval', () => {
    it('identifies the requesting client and exposes an accessible approval action', () => {
        renderPage(
            <ClientAuthorizationApproval
                clientName="Codex on MacBook"
                userCode="ABCD-2345"
                expiresAt="2026-08-12T18:00:00Z"
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Approve Codex client' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Codex on MacBook')).toBeInTheDocument();
        expect(screen.getByLabelText('Authorization code')).toHaveTextContent(
            'ABCD-2345',
        );
        expect(
            screen.getByRole('button', { name: 'Approve client' }),
        ).toBeEnabled();
        expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
            'href',
            '/client-connections',
        );
    });
});
