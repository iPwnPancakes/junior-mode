import { usePage } from '@inertiajs/react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Profile from '@/pages/settings/profile';
import { renderPage } from '@/test/render-page';

function setRole(role: 'learner' | 'mentor') {
    vi.mocked(usePage).mockReturnValue({
        props: {
            auth: {
                user: {
                    id: 1,
                    name: 'Lee',
                    email: 'lee@example.test',
                    role,
                    email_verified_at: '2026-09-24',
                },
            },
        },
    } as ReturnType<typeof usePage>);
}

describe('Learning record privacy', () => {
    it('offers a normal download link to the Learner so JSON is not handled as an Inertia page', () => {
        setRole('learner');
        renderPage(<Profile mustVerifyEmail={false} />);
        expect(
            screen.getByRole('link', { name: 'Download learning record' }),
        ).toHaveAttribute('href', '/settings/learning-record/export');
        expect(
            screen.getByText(/You may be asked to confirm your password/),
        ).toBeInTheDocument();
    });

    it('does not offer a Learner export to a Mentor', () => {
        setRole('mentor');
        renderPage(<Profile mustVerifyEmail={false} />);
        expect(
            screen.queryByRole('link', { name: 'Download learning record' }),
        ).not.toBeInTheDocument();
    });
});
