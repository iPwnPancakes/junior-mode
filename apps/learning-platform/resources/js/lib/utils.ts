import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
});

/**
 * Formats a server `Y-m-d` date for display ("Oct 3, 2026"). The date is read
 * and printed in UTC so server and browser rendering agree.
 */
export function formatDate(date: string): string {
    const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`);

    return Number.isNaN(parsed.getTime()) ? date : dateFormat.format(parsed);
}
