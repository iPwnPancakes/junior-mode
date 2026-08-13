import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { renderPage } from '@/test/render-page';
import type { User } from '@/types';

const mentor: User = {
    id: 1,
    name: 'Base UI Mentor',
    email: 'mentor@example.test',
    role: 'mentor',
    mentor_id: null,
    email_verified_at: null,
    created_at: '2026-08-12T00:00:00.000000Z',
    updated_at: '2026-08-12T00:00:00.000000Z',
};

describe('User menu', () => {
    it('opens with every labelled section inside a Base UI menu group', async () => {
        const user = userEvent.setup();

        renderPage(
            <DropdownMenu>
                <DropdownMenuTrigger>Open account menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <UserMenuContent user={mentor} />
                </DropdownMenuContent>
            </DropdownMenu>,
        );

        await user.click(
            screen.getByRole('button', { name: 'Open account menu' }),
        );

        expect(await screen.findByRole('menu')).toBeVisible();
        expect(screen.getByText('mentor@example.test')).toBeVisible();
        expect(
            screen.getByRole('menuitem', { name: /settings/i }),
        ).toBeVisible();
        expect(
            screen.getByRole('menuitem', { name: /log out/i }),
        ).toBeVisible();
    });
});
