import { screen } from '@testing-library/react';
import { Inbox, Users } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { renderPage } from '@/test/render-page';

describe('Product interface patterns', () => {
    it('keeps page and section headings in a logical hierarchy', () => {
        renderPage(
            <>
                <PageHeader
                    eyebrow="Mentor workspace"
                    title="Mentor dashboard"
                    description="Guide a Learner's development."
                />
                <SectionCard title="Your Learners" icon={Users}>
                    <EmptyState
                        icon={Inbox}
                        title="No Learners yet"
                        description="Send an invitation to begin."
                    />
                </SectionCard>
            </>,
        );

        expect(
            screen.getByRole('heading', {
                level: 1,
                name: 'Mentor dashboard',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Your Learners',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', {
                level: 3,
                name: 'No Learners yet',
            }),
        ).toBeInTheDocument();
    });

    it('connects validation feedback to its labelled control', () => {
        renderPage(
            <FormField
                id="learner-email"
                label="Learner email"
                error="Enter a valid email address."
            >
                <Input
                    id="learner-email"
                    aria-invalid="true"
                    aria-describedby="learner-email-error"
                />
            </FormField>,
        );

        const input = screen.getByRole('textbox', { name: 'Learner email' });

        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAccessibleDescription(
            'Enter a valid email address.',
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Enter a valid email address.',
        );
    });

    it('names status and processing states without relying on color', () => {
        renderPage(
            <>
                <StatusBadge tone="info">Learner</StatusBadge>
                <SubmitButton processing processingLabel="Sending…">
                    Send invitation
                </SubmitButton>
            </>,
        );

        expect(screen.getByText('Learner')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
        expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });
});
