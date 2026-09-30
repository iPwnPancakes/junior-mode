import { Head, Link } from '@inertiajs/react';
import {
    CircleDot,
    Clock,
    ExternalLink,
    FolderGit2,
    History,
    MessagesSquare,
    MonitorSmartphone,
    Target,
    UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button';
import { index as coachingSessions } from '@/routes/coaching-sessions';
import { show as showLearner } from '@/routes/learners';

export type CoachingSession = {
    id: number;
    learnerId: number;
    learnerName: string;
    workItem: {
        title: string;
        description: string;
        externalUrl: string | null;
    };
    repository: { name: string; identity: string };
    objective: string;
    clientSource: string;
    status: string;
    lastActiveAt: string;
    lastActive: string;
};

type Props = {
    viewerRole: 'mentor' | 'learner';
    sessions: CoachingSession[];
};

function Detail({
    icon: Icon,
    label,
    children,
}: {
    icon: LucideIcon;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="flex min-w-0 items-center gap-1.5" title={label}>
            <dt className="sr-only">{label}</dt>
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            <dd className="truncate">{children}</dd>
        </div>
    );
}

function SessionRow({
    session,
    showLearnerName,
}: {
    session: CoachingSession;
    showLearnerName: boolean;
}) {
    const isActive = session.status === 'active';
    const statusLabel =
        session.status.charAt(0).toUpperCase() + session.status.slice(1);

    return (
        <li className="grid gap-3 rounded-lg border bg-background p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="grid min-w-0 gap-1.5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="font-medium">{session.workItem.title}</h3>
                    {!isActive && <StatusBadge>{statusLabel}</StatusBadge>}
                </div>
                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {session.workItem.description}
                </p>
                <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    {showLearnerName && (
                        <Detail icon={UserRound} label="Learner">
                            <Link
                                href={showLearner(session.learnerId)}
                                className="font-medium text-foreground hover:underline"
                            >
                                {session.learnerName}
                            </Link>
                        </Detail>
                    )}
                    <Detail icon={Target} label="Learning Objective">
                        {session.objective}
                    </Detail>
                    <Detail icon={FolderGit2} label="Repository">
                        {session.repository.name}
                    </Detail>
                    <Detail icon={MonitorSmartphone} label="Client source">
                        {session.clientSource}
                    </Detail>
                    <Detail icon={Clock} label="Last active">
                        <time dateTime={session.lastActiveAt}>
                            {session.lastActive}
                        </time>
                    </Detail>
                </dl>
            </div>
            {session.workItem.externalUrl && (
                <a
                    href={session.workItem.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({
                        variant: 'outline',
                        size: 'sm',
                        className: 'w-fit',
                    })}
                >
                    Open Work Item
                    <ExternalLink aria-hidden="true" />
                </a>
            )}
        </li>
    );
}

export default function CoachingSessions({ viewerRole, sessions }: Props) {
    const isMentor = viewerRole === 'mentor';
    const active = sessions.filter((session) => session.status === 'active');
    const settled = sessions.filter((session) => session.status !== 'active');
    const groups = [
        {
            title: 'Active',
            description: isMentor
                ? 'Work your Learners are doing with Junior Mode right now.'
                : 'Work you are doing with Junior Mode right now.',
            icon: CircleDot,
            sessions: active,
        },
        {
            title: 'Settled',
            description:
                'Settled Sessions no longer accept coaching activity. Their evidence stays in the learning record.',
            icon: History,
            sessions: settled,
        },
    ].filter((group) => group.sessions.length > 0);

    return (
        <>
            <Head title="Coaching Sessions" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    title="Coaching Sessions"
                    description={
                        isMentor
                            ? 'The Work Items and Learning Objectives each Learner is coached on, as reported by their Codex clients.'
                            : 'The Work Items and Learning Objectives Junior Mode is coaching you on.'
                    }
                />

                {sessions.length === 0 ? (
                    <EmptyState
                        icon={MessagesSquare}
                        title="No Coaching Sessions yet"
                        description="A Session appears here after Junior Mode starts relevant work in an Enrolled Repository."
                    />
                ) : (
                    groups.map((group) => (
                        <SectionCard
                            key={group.title}
                            title={group.title}
                            description={group.description}
                            icon={group.icon}
                        >
                            <ul
                                className="grid gap-3"
                                aria-label={`${group.title} Coaching Sessions`}
                            >
                                {group.sessions.map((session) => (
                                    <SessionRow
                                        key={session.id}
                                        session={session}
                                        showLearnerName={isMentor}
                                    />
                                ))}
                            </ul>
                        </SectionCard>
                    ))
                )}
            </div>
        </>
    );
}

CoachingSessions.layout = {
    breadcrumbs: [{ title: 'Coaching Sessions', href: coachingSessions() }],
};
