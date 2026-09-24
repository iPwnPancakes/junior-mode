import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';

type Props = {
    id: string;
    label: string;
    error?: string;
    description?: string;
    optional?: boolean;
    labelAction?: ReactNode;
    children: ReactNode;
};

export function FormField({
    id,
    label,
    error,
    description,
    optional = false,
    labelAction,
    children,
}: Props) {
    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
                <Label htmlFor={id}>{label}</Label>
                {optional && (
                    <span className="text-xs text-muted-foreground">
                        Optional
                    </span>
                )}
                {labelAction}
            </div>
            {children}
            {description && !error && (
                <p
                    id={`${id}-description`}
                    className="text-xs text-muted-foreground"
                >
                    {description}
                </p>
            )}
            <InputError id={`${id}-error`} message={error} />
        </div>
    );
}
