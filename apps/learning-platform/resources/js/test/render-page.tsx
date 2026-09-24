import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';

export function renderPage(page: ReactElement) {
    return {
        user: userEvent.setup(),
        ...render(page),
    };
}
