import type * as InertiaReact from '@inertiajs/react';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
    cleanup();
});

vi.mock('@inertiajs/react', async (importOriginal) => {
    const actual = await importOriginal<typeof InertiaReact>();
    const React = await import('react');

    return {
        ...actual,
        Form: ({ children, action, method, className }: any) =>
            React.createElement(
                'form',
                { action, method, className },
                typeof children === 'function'
                    ? children({ errors: {}, processing: false })
                    : children,
            ),
        Head: () => null,
    };
});
