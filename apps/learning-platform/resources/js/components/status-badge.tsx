import { Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'destructive';

const variants = {
    neutral: 'secondary',
    info: 'info',
    success: 'success',
    warning: 'warning',
    destructive: 'destructive',
} as const;

export function StatusBadge({
    children,
    tone = 'neutral',
}: {
    children: React.ReactNode;
    tone?: Tone;
}) {
    return (
        <Badge variant={variants[tone]}>
            <Circle aria-hidden="true" className="size-1.5 fill-current" />
            {children}
        </Badge>
    );
}
