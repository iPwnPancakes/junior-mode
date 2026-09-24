import type { LucideProps } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
    title: string;
    description?: string;
    icon?: ComponentType<LucideProps>;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
};

export function SectionCard({
    title,
    description,
    icon: Icon,
    action,
    children,
    className,
    contentClassName,
}: Props) {
    return (
        <Card className={cn('min-w-0', className)}>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                        {Icon && (
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon aria-hidden="true" className="size-4.5" />
                            </span>
                        )}
                        <div className="grid min-w-0 gap-1">
                            <CardTitle role="heading" aria-level={2}>
                                {title}
                            </CardTitle>
                            {description && (
                                <CardDescription>{description}</CardDescription>
                            )}
                        </div>
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
            </CardHeader>
            <CardContent className={contentClassName}>{children}</CardContent>
        </Card>
    );
}
