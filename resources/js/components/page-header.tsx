import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    title: string;
    description?: string;
    eyebrow?: string;
    actions?: ReactNode;
    className?: string;
    compact?: boolean;
};

export function PageHeader({
    title,
    description,
    eyebrow,
    actions,
    className,
    compact = false,
}: Props) {
    return (
        <header
            className={cn(
                'flex flex-col justify-between gap-4 sm:flex-row sm:items-end',
                className,
            )}
        >
            <div className={cn('grid gap-2', compact && 'gap-1')}>
                {eyebrow && (
                    <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                        {eyebrow}
                    </p>
                )}
                <div className="grid gap-1.5">
                    <h1
                        className={cn(
                            'text-2xl font-semibold tracking-tight text-balance sm:text-3xl',
                            compact && 'text-xl sm:text-2xl',
                        )}
                    >
                        {title}
                    </h1>
                    {description && (
                        <p className="max-w-2xl text-sm leading-6 text-pretty text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </header>
    );
}
