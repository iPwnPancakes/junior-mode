import { Form, Head } from '@inertiajs/react';
import { Cable, Inbox, MonitorSmartphone, ShieldX } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    destroy,
    index as clientConnections,
} from '@/routes/client-connections';

type ConnectionStatus = 'active' | 'awaiting_client' | 'revoked';

type ClientConnection = {
    id: number;
    name: string;
    status: ConnectionStatus;
    authorizedAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
};

type Learner = {
    id: number;
    name: string;
    email: string;
    connections: ClientConnection[];
};

type Props = {
    viewerRole: 'mentor' | 'learner';
    connections: ClientConnection[];
    learners: Learner[];
};

const statusDetails = {
    active: { label: 'Active', tone: 'success' },
    awaiting_client: { label: 'Waiting for Codex', tone: 'warning' },
    revoked: { label: 'Revoked', tone: 'destructive' },
} as const;

function ConnectionList({
    connections,
    canRevoke,
}: {
    connections: ClientConnection[];
    canRevoke: boolean;
}) {
    return (
        <ul className="grid gap-3" aria-label="Codex clients">
            {connections.map((connection) => {
                const status = statusDetails[connection.status];

                return (
                    <li
                        key={connection.id}
                        className="grid gap-4 rounded-lg border bg-background p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                        <div className="grid min-w-0 gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <p className="truncate font-medium">
                                    {connection.name}
                                </p>
                                <StatusBadge tone={status.tone}>
                                    {status.label}
                                </StatusBadge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Approved {connection.authorizedAt}
                                {connection.lastUsedAt && (
                                    <> · Last used {connection.lastUsedAt}</>
                                )}
                                {connection.revokedAt && (
                                    <> · Revoked {connection.revokedAt}</>
                                )}
                            </p>
                        </div>

                        {canRevoke && connection.status !== 'revoked' && (
                            <Dialog>
                                <DialogTrigger
                                    render={
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                        />
                                    }
                                >
                                    Revoke
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogTitle>
                                        Revoke {connection.name}?
                                    </DialogTitle>
                                    <DialogDescription>
                                        This client will immediately lose access
                                        to Junior Mode. You can connect it again
                                        later with a new code.
                                    </DialogDescription>
                                    <Form
                                        {...destroy.form(connection.id)}
                                        disableWhileProcessing
                                    >
                                        {({ processing }) => (
                                            <DialogFooter className="gap-2">
                                                <DialogClose
                                                    render={
                                                        <Button variant="secondary" />
                                                    }
                                                >
                                                    Cancel
                                                </DialogClose>
                                                <Button
                                                    type="submit"
                                                    variant="destructive"
                                                    disabled={processing}
                                                >
                                                    {processing
                                                        ? 'Revoking…'
                                                        : 'Revoke client'}
                                                </Button>
                                            </DialogFooter>
                                        )}
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

export default function ClientConnections({
    viewerRole,
    connections,
    learners,
}: Props) {
    const isLearner = viewerRole === 'learner';

    return (
        <>
            <Head title="Codex clients" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    title="Codex clients"
                    description={
                        isLearner
                            ? 'Review and revoke the named Codex installations connected to your learning record.'
                            : 'See which named Codex installations report activity for each Learner.'
                    }
                    eyebrow={
                        isLearner ? 'Client management' : 'Client visibility'
                    }
                />

                {isLearner ? (
                    <SectionCard
                        title="Your connections"
                        description="Credentials are never displayed here. Revocation takes effect immediately."
                        icon={Cable}
                    >
                        {connections.length === 0 ? (
                            <EmptyState
                                icon={MonitorSmartphone}
                                title="No Codex clients connected"
                                description="Start the Junior Mode connection flow from Codex to authorize a named installation."
                            />
                        ) : (
                            <ConnectionList
                                connections={connections}
                                canRevoke
                            />
                        )}
                    </SectionCard>
                ) : learners.length === 0 ? (
                    <EmptyState
                        icon={Inbox}
                        title="No Learners yet"
                        description="Client connections will appear after a Learner joins your workspace."
                    />
                ) : (
                    <div className="grid gap-6">
                        {learners.map((learner) => (
                            <SectionCard
                                key={learner.id}
                                title={learner.name}
                                description={learner.email}
                                icon={MonitorSmartphone}
                            >
                                {learner.connections.length === 0 ? (
                                    <EmptyState
                                        icon={ShieldX}
                                        title="No connected clients"
                                        description="This Learner has not authorized a Codex installation yet."
                                        className="min-h-36"
                                    />
                                ) : (
                                    <ConnectionList
                                        connections={learner.connections}
                                        canRevoke={false}
                                    />
                                )}
                            </SectionCard>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

ClientConnections.layout = {
    breadcrumbs: [
        {
            title: 'Codex clients',
            href: clientConnections(),
        },
    ],
};
