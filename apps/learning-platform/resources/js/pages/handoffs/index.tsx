import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronRight, LifeBuoy } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { index, show } from '@/routes/handoffs';

type Props = {
    handoffs: {
        id: number;
        title: string | null;
        learnerName: string;
        shared: boolean;
        createdAt: string;
    }[];
};

export default function Handoffs({ handoffs }: Props) {
    const { auth } = usePage().props;
    const isMentor = auth.user?.role === 'mentor';

    return (
        <>
            <Head title="Handoffs" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    title="Handoffs"
                    description={
                        isMentor
                            ? 'Blockers your Learners chose to share, each with the smallest question that would help. Sharing never sends a notification.'
                            : 'Review a blocker and the smallest question that would help before sharing it with your Mentor. Sharing never sends a notification or changes progress.'
                    }
                />

                {handoffs.length === 0 ? (
                    <EmptyState
                        icon={LifeBuoy}
                        title="No handoffs yet"
                        description={
                            isMentor
                                ? 'A handoff appears here after a Learner reviews and shares one with you.'
                                : 'Ask Junior Mode for a handoff when you are stuck in a Coaching Session.'
                        }
                    />
                ) : (
                    <ul className="grid gap-3" aria-label="Handoffs">
                        {handoffs.map((handoff) => (
                            <li key={handoff.id}>
                                <Link
                                    href={show(handoff.id)}
                                    className="group flex items-center gap-4 rounded-lg border bg-card p-4 shadow-xs transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                    <div className="grid min-w-0 flex-1 gap-1">
                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <span className="truncate font-medium">
                                                {handoff.title ??
                                                    'Untitled handoff'}
                                            </span>
                                            {isMentor ? null : handoff.shared ? (
                                                <StatusBadge tone="success">
                                                    Shared with Mentor
                                                </StatusBadge>
                                            ) : (
                                                <StatusBadge tone="warning">
                                                    Waiting for your review
                                                </StatusBadge>
                                            )}
                                        </div>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {isMentor
                                                ? `${handoff.learnerName} · ${handoff.createdAt}`
                                                : handoff.createdAt}
                                        </p>
                                    </div>
                                    <ChevronRight
                                        aria-hidden="true"
                                        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}

Handoffs.layout = {
    breadcrumbs: [{ title: 'Handoffs', href: index() }],
};
