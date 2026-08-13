import type { LucideProps } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    title: string;
    description: string;
    icon?: ComponentType<LucideProps>;
    action?: ReactNode;
    className?: string;
};

export function EmptyState({
    title,
    description,
    icon: Icon,
    action,
    className,
}: Props) {
    return (
        <div
            className={cn(
                'flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/25 px-6 py-8 text-center',
                className,
            )}
        >
            {Icon && (
                <span className="mb-4 flex size-10 items-center justify-center rounded-full bg-background text-muted-foreground shadow-xs ring-1 ring-border">
                    <Icon aria-hidden="true" className="size-5" />
                </span>
            )}
            <h3 className="font-medium">{title}</h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-pretty text-muted-foreground">
                {description}
            </p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
