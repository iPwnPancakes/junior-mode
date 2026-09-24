import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Props = Omit<ComponentProps<typeof Button>, 'children'> & {
    children: React.ReactNode;
    processing?: boolean;
    processingLabel?: string;
};

export function SubmitButton({
    children,
    processing = false,
    processingLabel = 'Saving…',
    disabled,
    ...props
}: Props) {
    return (
        <Button
            type="submit"
            disabled={disabled || processing}
            aria-busy={processing}
            {...props}
        >
            {processing && <Spinner aria-hidden="true" />}
            {processing ? processingLabel : children}
        </Button>
    );
}
