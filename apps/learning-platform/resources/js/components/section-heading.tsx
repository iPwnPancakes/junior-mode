import { cn } from '@/lib/utils';

export function SectionHeading({
    title,
    description,
    className,
}: {
    title: string;
    description?: string;
    className?: string;
}) {
    return (
        <header className={cn('grid gap-1', className)}>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description && (
                <p className="text-sm leading-5 text-muted-foreground">
                    {description}
                </p>
            )}
        </header>
    );
}
