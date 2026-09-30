import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronRight, LifeBuoy } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { index, show } from '@/routes/help-requests';

type Props = {
    helpRequests: {
        id: number;
        title: string | null;
        learnerName: string;
        shared: boolean;
        createdAt: string;
    }[];
};

export default function HelpRequests({ helpRequests }: Props) {
    const { auth } = usePage().props;
    const isMentor = auth.user?.role === 'mentor';

    return (
        <>
            <Head title="Help Requests" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    title="Help Requests"
                    description={
                        isMentor
                            ? 'Blockers your Learners chose to share, each with the smallest question that would help. Sharing never sends a notification.'
                            : 'Review a blocker and the smallest question that would help before sharing it with your Mentor. Sharing never sends a notification or changes progress.'
                    }
                />

                {helpRequests.length === 0 ? (
                    <EmptyState
                        icon={LifeBuoy}
                        title="No Help Requests yet"
                        description={
                            isMentor
                                ? 'A Help Request appears here after a Learner reviews and shares one with you.'
                                : 'Ask Junior Mode for a Help Request when you are stuck in a Coaching Session.'
                        }
                    />
                ) : (
                    <ul className="grid gap-3" aria-label="Help Requests">
                        {helpRequests.map((helpRequest) => (
                            <li key={helpRequest.id}>
                                <Link
                                    href={show(helpRequest.id)}
                                    className="group flex items-center gap-4 rounded-lg border bg-card p-4 shadow-xs transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                    <div className="grid min-w-0 flex-1 gap-1">
                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <span className="truncate font-medium">
                                                {helpRequest.title ??
                                                    'Untitled Help Request'}
                                            </span>
                                            {isMentor ? null : helpRequest.shared ? (
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
                                                ? `${helpRequest.learnerName} · ${helpRequest.createdAt}`
                                                : helpRequest.createdAt}
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

HelpRequests.layout = {
    breadcrumbs: [{ title: 'Help Requests', href: index() }],
};
