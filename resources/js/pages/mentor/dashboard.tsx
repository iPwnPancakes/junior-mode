import { Form, Head } from '@inertiajs/react';
import { Inbox, Mail, UserPlus, Users } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';
import { store } from '@/routes/learner-invitations';

type Learner = {
    id: number;
    name: string;
    email: string;
    joinedAt: string | null;
};

type PendingInvitation = {
    id: number;
    email: string;
    expiresAt: string;
};

type Props = {
    learners: Learner[];
    pendingInvitations: PendingInvitation[];
};

export default function MentorDashboard({
    learners,
    pendingInvitations,
}: Props) {
    return (
        <>
            <Head title="Mentor dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    title="Mentor dashboard"
                    description="Invite Learners and guide their development from one private workspace."
                    eyebrow="Mentor workspace"
                />

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                    <SectionCard
                        title="Your Learners"
                        description="People whose coaching record you manage."
                        icon={Users}
                    >
                        {learners.length === 0 ? (
                            <EmptyState
                                icon={Inbox}
                                title="No Learners yet"
                                description="Send an invitation to start your private mentoring workspace."
                            />
                        ) : (
                            <ul className="grid gap-3" aria-label="Learners">
                                {learners.map((learner) => (
                                    <li
                                        key={learner.id}
                                        className="flex min-w-0 flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">
                                                {learner.name}
                                            </p>
                                            <p className="truncate text-sm text-muted-foreground">
                                                {learner.email}
                                            </p>
                                        </div>
                                        <StatusBadge tone="info">
                                            Learner
                                        </StatusBadge>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {pendingInvitations.length > 0 && (
                            <section
                                className="mt-6 grid gap-3 border-t pt-6"
                                aria-labelledby="pending-invitations"
                            >
                                <h3
                                    id="pending-invitations"
                                    className="text-sm font-medium"
                                >
                                    Pending invitations
                                </h3>
                                <ul className="grid gap-2">
                                    {pendingInvitations.map((invitation) => (
                                        <li
                                            key={invitation.id}
                                            className="flex min-w-0 flex-col gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <Mail
                                                    aria-hidden="true"
                                                    className="size-4 shrink-0 text-muted-foreground"
                                                />
                                                <span className="truncate">
                                                    {invitation.email}
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                Expires {invitation.expiresAt}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </SectionCard>

                    <SectionCard
                        title="Invite a Learner"
                        description="Invitations expire after seven days."
                        icon={UserPlus}
                        className="h-fit"
                    >
                        <Form
                            {...store.form()}
                            resetOnSuccess
                            disableWhileProcessing
                            className="grid gap-4"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <FormField
                                        id="learner-email"
                                        label="Learner email"
                                        error={errors.email}
                                    >
                                        <Input
                                            id="learner-email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            placeholder="learner@example.com"
                                            aria-invalid={Boolean(errors.email)}
                                            aria-describedby={
                                                errors.email
                                                    ? 'learner-email-error'
                                                    : undefined
                                            }
                                            required
                                        />
                                    </FormField>
                                    <SubmitButton
                                        processing={processing}
                                        processingLabel="Sending…"
                                    >
                                        Send invitation
                                    </SubmitButton>
                                </>
                            )}
                        </Form>
                    </SectionCard>
                </div>
            </div>
        </>
    );
}

MentorDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Mentor dashboard',
            href: dashboard(),
        },
    ],
};
