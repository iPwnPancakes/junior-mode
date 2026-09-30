import { Form, Head, Link } from '@inertiajs/react';
import { ArrowRight, Inbox, Mail, UserPlus, Users } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/components/section-card';
import { SubmitButton } from '@/components/submit-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInitials } from '@/hooks/use-initials';
import { dashboard } from '@/routes';
import { store } from '@/routes/learner-invitations';
import { show as showLearner } from '@/routes/learners';

type NextStep = {
    kind:
        | 'review_proposal'
        | 'set_up_plan'
        | 'enroll_repository'
        | 'read_help_request'
        | 'focus_expired'
        | 'focus_ending'
        | 'choose_focus'
        | 'on_track';
    label: string;
    detail: string;
    href: string;
};

type Learner = {
    id: number;
    name: string;
    email: string;
    competencyCount: number;
    focus: string[];
    nextStep: NextStep;
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

function summary(learner: Learner): string {
    const competencies = `${learner.competencyCount} ${learner.competencyCount === 1 ? 'competency' : 'competencies'}`;

    return learner.focus.length > 0
        ? `${competencies} · Focus: ${learner.focus.join(', ')}`
        : competencies;
}

function LearnerCard({ learner }: { learner: Learner }) {
    const { nextStep } = learner;
    const needsAttention = nextStep.kind !== 'on_track';
    const getInitials = useInitials();

    return (
        <li className="grid gap-3 rounded-lg border bg-background p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
            <Avatar size="lg" className="hidden sm:flex">
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {getInitials(learner.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 gap-1">
                <Link
                    href={showLearner(learner.id)}
                    className="w-fit truncate font-medium hover:underline"
                >
                    {learner.name}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                    {summary(learner)}
                </p>
                <p
                    className={
                        needsAttention
                            ? 'text-sm font-medium text-foreground'
                            : 'text-sm text-muted-foreground'
                    }
                >
                    {nextStep.detail}
                </p>
            </div>
            <Link
                href={nextStep.href}
                className={buttonVariants({
                    variant: needsAttention ? 'default' : 'outline',
                    size: 'sm',
                })}
            >
                {nextStep.label}
                <ArrowRight aria-hidden="true" />
            </Link>
        </li>
    );
}

export default function MentorDashboard({
    learners,
    pendingInvitations,
}: Props) {
    const waiting = learners.filter(
        (learner) => learner.nextStep.kind !== 'on_track',
    ).length;

    return (
        <>
            <Head title="Mentor dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    title="Your learners"
                    description={
                        learners.length === 0
                            ? 'Invite a learner to get started.'
                            : waiting === 0
                              ? 'Everyone is on track.'
                              : `${waiting} ${waiting === 1 ? 'learner needs' : 'learners need'} something from you.`
                    }
                    eyebrow="Mentor workspace"
                />

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                    <SectionCard
                        title="Learners"
                        description="Each card shows the one thing to do next."
                        icon={Users}
                    >
                        {learners.length === 0 ? (
                            <EmptyState
                                icon={Inbox}
                                title="No learners yet"
                                description="Send an invitation to start your private mentoring workspace."
                            />
                        ) : (
                            <ul className="grid gap-3" aria-label="Learners">
                                {learners.map((learner) => (
                                    <LearnerCard
                                        key={learner.id}
                                        learner={learner}
                                    />
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

                    <div className="grid h-fit gap-6">
                        <SectionCard
                            title="Invite a learner"
                            description="Invitations expire after seven days."
                            icon={UserPlus}
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
                                                aria-invalid={Boolean(
                                                    errors.email,
                                                )}
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
            </div>
        </>
    );
}

MentorDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Learners',
            href: dashboard(),
        },
    ],
};
