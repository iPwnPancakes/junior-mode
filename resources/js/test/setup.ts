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

    const usePage = vi.fn(() => ({
        props: {
            auth: { user: null },
            canRegister: true,
            name: 'Junior Mode',
        },
    }));

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
        Link: React.forwardRef<HTMLAnchorElement, any>(
            ({ href, children, ...props }, ref) =>
                React.createElement(
                    'a',
                    {
                        ...props,
                        href:
                            typeof href === 'string' ? href : (href?.url ?? ''),
                        ref,
                    },
                    children,
                ),
        ),
        usePage,
    };
});
