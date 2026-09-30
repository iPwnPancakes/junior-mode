import { usePage } from '@inertiajs/react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { renderPage } from '@/test/render-page';

function visit(url: string, role: 'learner' | 'mentor') {
    vi.mocked(usePage).mockReturnValue({
        url,
        props: {
            name: 'Junior Mode',
            auth: {
                user: {
                    id: 5,
                    name: 'Lee',
                    email: 'lee@example.test',
                    role,
                },
            },
        },
    } as unknown as ReturnType<typeof usePage>);

    renderPage(
        <SidebarProvider>
            <AppSidebar />
        </SidebarProvider>,
    );
}

describe('App sidebar', () => {
    it('gives a Mentor coaching and setup destinations with one highlighted page', () => {
        visit('/learners/2', 'mentor');

        expect(screen.getByText('Mentor workspace')).toBeInTheDocument();
        expect(screen.getByText('Coaching')).toBeInTheDocument();
        expect(screen.getByText('Setup')).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Home' }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Learners' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(
            1,
        );
    });

    it('keeps Help Requests highlighted on a Help Request detail page', () => {
        visit('/help-requests/3', 'mentor');

        expect(
            screen.getByRole('link', { name: 'Help Requests' }),
        ).toHaveAttribute('aria-current', 'page');
        expect(
            screen.getByRole('link', { name: 'Learners' }),
        ).not.toHaveAttribute('aria-current');
    });

    it('takes a Learner straight to their own coaching plan', () => {
        visit('/learners/5', 'learner');

        expect(screen.getByText('Learner workspace')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
            'href',
            '/dashboard',
        );
        const plan = screen.getByRole('link', { name: 'Coaching plan' });
        expect(plan).toHaveAttribute('href', '/learners/5');
        expect(plan).toHaveAttribute('aria-current', 'page');
        expect(
            screen.queryByRole('link', { name: 'Learners' }),
        ).not.toBeInTheDocument();
    });
});
