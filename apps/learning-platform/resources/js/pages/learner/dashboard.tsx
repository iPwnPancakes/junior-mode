import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    Clock,
    Crosshair,
    LifeBuoy,
    ListChecks,
    MessagesSquare,
    Target,
    UserRound,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as clientConnections } from '@/routes/client-connections';
import { index as coachingSessions } from '@/routes/coaching-sessions';
import { index as enrolledRepositories } from '@/routes/enrolled-repositories';
import { index as helpRequests } from '@/routes/help-requests';
import { show as showLearner } from '@/routes/learners';

type Props = {
    learner: {
        id: number;
        name: string;
    };
    mentor: {
        id: number;
        name: string;
        email: string;
    };
    setup: {
        hasPlan: boolean;
        hasClient: boolean;
        hasRepository: boolean;
    };
    focus: {
        id: number;
        competencyName: string;
        emphasis: 'normal' | 'high';
        expiresOn: string | null;
        note: string | null;
    }[];
    activeSessions: {
        id: number;
        title: string;
        objective: string;
        lastActive: string;
    }[];
    helpRequestsAwaitingReview: number;
};

function SetupChecklist({
    mentorName,
    setup,
}: {
    mentorName: string;
    setup: Props['setup'];
}) {
    const steps = [
        {
            done: setup.hasPlan,
            title: 'Coaching plan',
            detail: setup.hasPlan
                ? 'Your Mentor chose the competencies you are growing.'
                : `${mentorName} is choosing the competencies you will grow.`,
            action: null,
        },
        {
            done: setup.hasClient,
            title: 'Connect Codex',
            detail: 'Start the Junior Mode connection flow from Codex, then approve it here.',
            action: { label: 'Codex clients', href: clientConnections() },
        },
        {
            done: setup.hasRepository,
            title: 'Enroll a repository',
            detail: 'Coaching only runs in repositories you enroll.',
            action: { label: 'Repositories', href: enrolledRepositories() },
        },
    ];

    return (
        <SectionCard
            title="Get set up"
            description="Junior Mode starts coaching once these are in place."
            icon={ListChecks}
        >
            <ol className="grid gap-3" aria-label="Setup steps">
                {steps.map((step, index) => (
                    <li
                        key={step.title}
                        className="flex items-start gap-3 rounded-lg border bg-background p-4"
                    >
                        <span
                            className={cn(
                                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                                step.done
                                    ? 'bg-success/15 text-success-foreground'
                                    : 'bg-muted text-muted-foreground ring-1 ring-border',
                            )}
                        >
                            {step.done ? (
                                <Check
                                    aria-hidden="true"
                                    className="size-3.5"
                                />
                            ) : (
                                index + 1
                            )}
                        </span>
                        <div className="grid min-w-0 flex-1 gap-0.5">
                            <p className="flex flex-wrap items-center gap-2 font-medium">
                                {step.title}
                                <span className="sr-only">
                                    {step.done ? '(done)' : '(to do)'}
                                </span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {step.detail}
                            </p>
                        </div>
                        {!step.done && step.action && (
                            <Link
                                href={step.action.href}
                                className={buttonVariants({
                                    variant: 'outline',
                                    size: 'sm',
                                })}
                            >
                                {step.action.label}
                                <ArrowRight aria-hidden="true" />
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </SectionCard>
    );
}

export default function LearnerDashboard({
    learner,
    mentor,
    setup,
    focus,
    activeSessions,
    helpRequestsAwaitingReview,
}: Props) {
    const isSetUp = setup.hasPlan && setup.hasClient && setup.hasRepository;

    return (
        <>
            <Head title="Home" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    title="Your coaching"
                    description="What coaching is looking for right now and where to pick up."
                    eyebrow="Learner workspace"
                    actions={
                        <Link
                            href={showLearner(learner.id)}
                            className={buttonVariants({ variant: 'outline' })}
                        >
                            <Target aria-hidden="true" />
                            View coaching plan
                        </Link>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="grid h-fit min-w-0 gap-6">
                        {!isSetUp && (
                            <SetupChecklist
                                mentorName={mentor.name}
                                setup={setup}
                            />
                        )}

                        <SectionCard
                            title="Current focus"
                            description="Competencies your Mentor asked coaching to look for."
                            icon={Crosshair}
                        >
                            {focus.length === 0 ? (
                                <EmptyState
                                    icon={Crosshair}
                                    title="No focus right now"
                                    description="Coaching can choose any competency in your plan that fits the work."
                                    className="min-h-36"
                                />
                            ) : (
                                <ul
                                    className="grid gap-3"
                                    aria-label="Current focus"
                                >
                                    {focus.map((item) => (
                                        <li
                                            key={item.id}
                                            className="grid gap-1 rounded-lg border bg-background p-4"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-medium">
                                                    {item.competencyName}
                                                </span>
                                                {item.emphasis === 'high' && (
                                                    <StatusBadge tone="info">
                                                        High focus
                                                    </StatusBadge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {item.expiresOn
                                                    ? `Until ${item.expiresOn}`
                                                    : 'Until your Mentor removes it'}
                                            </p>
                                            {item.note && (
                                                <p className="text-sm leading-6">
                                                    {item.note}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </SectionCard>

                        <SectionCard
                            title="Active Coaching Sessions"
                            description="Work Junior Mode is coaching you on right now."
                            icon={MessagesSquare}
                            action={
                                activeSessions.length > 0 && (
                                    <Link
                                        href={coachingSessions()}
                                        className={buttonVariants({
                                            variant: 'ghost',
                                            size: 'sm',
                                        })}
                                    >
                                        All sessions
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                )
                            }
                        >
                            {activeSessions.length === 0 ? (
                                <EmptyState
                                    icon={MessagesSquare}
                                    title="No active Coaching Sessions"
                                    description="A Session starts when Junior Mode picks up work in an Enrolled Repository."
                                    className="min-h-36"
                                />
                            ) : (
                                <ul
                                    className="grid gap-3"
                                    aria-label="Active Coaching Sessions"
                                >
                                    {activeSessions.map((session) => (
                                        <li
                                            key={session.id}
                                            className="grid gap-1 rounded-lg border bg-background p-4"
                                        >
                                            <span className="font-medium">
                                                {session.title}
                                            </span>
                                            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1.5">
                                                    <Target
                                                        aria-hidden="true"
                                                        className="size-3.5"
                                                    />
                                                    {session.objective}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock
                                                        aria-hidden="true"
                                                        className="size-3.5"
                                                    />
                                                    Active {session.lastActive}
                                                </span>
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </SectionCard>
                    </div>

                    <div className="grid h-fit gap-6">
                        {helpRequestsAwaitingReview > 0 && (
                            <Alert variant="warning">
                                <LifeBuoy aria-hidden="true" />
                                <AlertTitle>
                                    {helpRequestsAwaitingReview === 1
                                        ? 'A Help Request is waiting for your review'
                                        : `${helpRequestsAwaitingReview} Help Requests are waiting for your review`}
                                </AlertTitle>
                                <AlertDescription>
                                    <p>
                                        Nothing reaches your Mentor until you
                                        review and share it.
                                    </p>
                                    <Link
                                        href={helpRequests()}
                                        className="mt-1 inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                                    >
                                        Review Help Requests
                                        <ArrowRight
                                            aria-hidden="true"
                                            className="size-3.5"
                                        />
                                    </Link>
                                </AlertDescription>
                            </Alert>
                        )}

                        <SectionCard
                            title="Your Mentor"
                            description="The person responsible for your coaching record."
                            icon={UserRound}
                            contentClassName="grid gap-2"
                        >
                            <div className="flex min-w-0 items-center justify-between gap-3">
                                <p className="truncate font-medium">
                                    {mentor.name}
                                </p>
                                <StatusBadge tone="info">Mentor</StatusBadge>
                            </div>
                            <p className="truncate text-sm text-muted-foreground">
                                {mentor.email}
                            </p>
                        </SectionCard>
                    </div>
                </div>
            </div>
        </>
    );
}

LearnerDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Home',
            href: dashboard(),
        },
    ],
};
