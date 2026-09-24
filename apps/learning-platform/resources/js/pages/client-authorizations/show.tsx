import { Form, Head, Link } from '@inertiajs/react';
import { KeyRound, MonitorCheck, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/components/section-card';
import { SubmitButton } from '@/components/submit-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { store } from '@/routes/client-authorizations/approval';
import { index as clientConnections } from '@/routes/client-connections';

type Props = {
    clientName: string;
    userCode: string;
    expiresAt: string;
};

export default function ClientAuthorizationApproval({
    clientName,
    userCode,
    expiresAt,
}: Props) {
    return (
        <>
            <Head title="Approve Codex client" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    title="Approve Codex client"
                    description="Confirm the named installation before it can access your Junior Mode record."
                    eyebrow="Client authorization"
                />

                <SectionCard
                    title={clientName}
                    description="This Codex installation is waiting for your approval."
                    icon={MonitorCheck}
                    className="max-w-2xl"
                    contentClassName="grid gap-5"
                >
                    <Alert variant="info">
                        <ShieldCheck aria-hidden="true" />
                        <AlertTitle>Check the code in Codex</AlertTitle>
                        <AlertDescription>
                            Only approve this request if Codex is displaying the
                            same code. The permanent credential is sent directly
                            to Codex and is never shown in your browser.
                        </AlertDescription>
                    </Alert>

                    <div className="grid gap-2 rounded-lg border bg-muted/30 p-4">
                        <span className="text-sm text-muted-foreground">
                            Authorization code
                        </span>
                        <code
                            aria-label="Authorization code"
                            className="font-mono text-2xl font-semibold tracking-[0.18em]"
                        >
                            {userCode}
                        </code>
                        <p className="text-xs text-muted-foreground">
                            Expires{' '}
                            <time dateTime={expiresAt}>
                                {new Date(expiresAt).toLocaleString()}
                            </time>
                        </p>
                    </div>

                    <Form
                        {...store.form(userCode)}
                        disableWhileProcessing
                        className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
                    >
                        {({ processing }) => (
                            <>
                                <Button
                                    variant="outline"
                                    render={<Link href={clientConnections()} />}
                                >
                                    Cancel
                                </Button>
                                <SubmitButton
                                    processing={processing}
                                    processingLabel="Approving…"
                                >
                                    <KeyRound aria-hidden="true" />
                                    Approve client
                                </SubmitButton>
                            </>
                        )}
                    </Form>
                </SectionCard>
            </div>
        </>
    );
}

ClientAuthorizationApproval.layout = {
    breadcrumbs: [
        {
            title: 'Codex clients',
            href: clientConnections(),
        },
        {
            title: 'Approve client',
            href: '#',
        },
    ],
};
