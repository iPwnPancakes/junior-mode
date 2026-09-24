import { Head } from '@inertiajs/react';
import { ExternalLink, MessagesSquare } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { index as coachingSessions } from '@/routes/coaching-sessions';

export type CoachingSession = {
    id: number;
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
};

type Props = {
    viewerRole: 'mentor' | 'learner';
    sessions: CoachingSession[];
};

export default function CoachingSessions({ viewerRole, sessions }: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Coaching Sessions', href: coachingSessions() },
            ]}
        >
            <Head title="Coaching Sessions" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    eyebrow="Junior Mode"
                    title="Coaching Sessions"
                    description={
                        viewerRole === 'mentor'
                            ? 'Review the active learning context reported by each named Codex client.'
                            : 'See the Work Items and Learning Objectives currently active in Junior Mode.'
                    }
                />

                {sessions.length === 0 ? (
                    <EmptyState
                        icon={MessagesSquare}
                        title="No Coaching Sessions yet"
                        description="A Session appears here after Junior Mode starts relevant work in an Enrolled Repository."
                    />
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {sessions.map((session) => (
                            <Card key={session.id}>
                                <CardHeader className="gap-3">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="grid gap-1">
                                            <CardTitle>
                                                {session.workItem.title}
                                            </CardTitle>
                                            <CardDescription>
                                                {session.repository.name}
                                            </CardDescription>
                                        </div>
                                        <Badge variant="success">
                                            {session.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid gap-4 text-sm">
                                    <p className="leading-6 text-muted-foreground">
                                        {session.workItem.description}
                                    </p>
                                    <dl className="grid gap-3 sm:grid-cols-2">
                                        {viewerRole === 'mentor' && (
                                            <div className="grid gap-1">
                                                <dt className="text-xs font-medium text-muted-foreground">
                                                    Learner
                                                </dt>
                                                <dd>{session.learnerName}</dd>
                                            </div>
                                        )}
                                        <div className="grid gap-1">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Learning Objective
                                            </dt>
                                            <dd>{session.objective}</dd>
                                        </div>
                                        <div className="grid gap-1">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Client source
                                            </dt>
                                            <dd>{session.clientSource}</dd>
                                        </div>
                                        <div className="grid gap-1">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Last active
                                            </dt>
                                            <dd>{session.lastActiveAt}</dd>
                                        </div>
                                    </dl>
                                    {session.workItem.externalUrl && (
                                        <a
                                            href={session.workItem.externalUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex w-fit items-center gap-1.5 font-medium text-primary hover:underline"
                                        >
                                            Open Work Item
                                            <ExternalLink
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                        </a>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
