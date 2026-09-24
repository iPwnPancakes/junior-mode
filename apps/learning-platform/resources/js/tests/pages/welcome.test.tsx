import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Welcome from '@/pages/welcome';
import { renderPage } from '@/test/render-page';

describe('Welcome page', () => {
    it('presents Junior Mode and the installation bootstrap action', () => {
        renderPage(<Welcome />);

        expect(
            screen.getByRole('heading', {
                level: 1,
                name: 'Build understanding while you build the work.',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('navigation', { name: 'Account navigation' }),
        ).toBeInTheDocument();
        expect(
            screen.getAllByRole('link', {
                name: /create the mentor account|set up junior mode/i,
            }),
        ).not.toHaveLength(0);
        expect(
            screen.getByRole('heading', {
                name: 'Assistance that leaves understanding behind.',
            }),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(/Laravel has an incredibly rich ecosystem/i),
        ).not.toBeInTheDocument();
    });
});
