import { useEffect, useState } from 'react';
import { ArrowLeft, Cable, GraduationCap } from 'lucide-react';
import type { CodexState } from '@junior-mode/backend';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { backend, isDesktop } from './backend';
import { PlatformSettings } from './platform-settings';

function Providers() {
    const [state, setState] = useState<CodexState | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [streamError, setStreamError] = useState('');

    function accept(next: CodexState) {
        setState((current) =>
            current?.instanceId === next.instanceId &&
            current.revision > next.revision
                ? current
                : next,
        );
    }
    useEffect(
        () =>
            backend.subscribeCodex((next) => {
                accept(next);
                setStreamError('');
            }, setStreamError),
        [],
    );

    async function connect() {
        setBusy(true);
        setError('');
        try {
            accept(await backend.connectCodex());
        } catch (failure) {
            setError(
                failure instanceof Error
                    ? failure.message
                    : 'Could not connect to Codex.',
            );
        } finally {
            setBusy(false);
        }
    }

    const connecting = busy || state?.status === 'connecting';
    const connected = state?.status === 'ready' && Boolean(state.account);
    const running = state?.thread?.status === 'running';
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">Providers</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    Manage the coding agents used by your chats.
                </p>
            </div>
            <Card className="gap-6 p-6">
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold">Codex</h2>
                    <Badge
                        variant={connected ? 'secondary' : 'outline'}
                        role="status"
                    >
                        {connecting
                            ? 'Starting Codex…'
                            : connected
                              ? 'Connected'
                              : state?.status === 'ready'
                                ? 'Sign-in required'
                                : 'Not connected'}
                    </Badge>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                    <dt className="text-muted-foreground">Account</dt>
                    <dd>{state?.account || 'Not signed in'}</dd>
                    <dt className="text-muted-foreground">Runs on</dt>
                    <dd>
                        {isDesktop ? 'Your computer' : 'Preview server'}
                        {state?.host ? ' · ' + state.host : ''}
                    </dd>
                    <dt className="text-muted-foreground">Configuration</dt>
                    <dd>Your existing Codex CLI configuration</dd>
                </dl>
                <p className="text-muted-foreground text-sm">
                    {isDesktop
                        ? 'Codex starts automatically when you open the desktop app.'
                        : 'Connect to Codex on the preview server to use browser chats.'}
                </p>
                <div className="space-y-3 border-t pt-5">
                    <p className="text-muted-foreground text-sm">
                        Install the Codex CLI and run <code>codex login</code>{' '}
                        on {isDesktop ? 'your computer' : 'the preview server'}.
                        After signing in or changing your Codex configuration,
                        reconnect to apply it.
                    </p>
                    <Button
                        onClick={() => void connect()}
                        disabled={
                            !state ||
                            connecting ||
                            running ||
                            Boolean(streamError)
                        }
                    >
                        {connecting
                            ? 'Starting Codex…'
                            : state?.status === 'ready'
                              ? 'Reconnect Codex'
                              : 'Connect Codex'}
                    </Button>
                    {running && (
                        <p className="text-muted-foreground text-sm">
                            Wait for the current turn to finish before
                            reconnecting.
                        </p>
                    )}
                    {(error || streamError || state?.error) && (
                        <p className="error" role="alert">
                            {error || streamError || state?.error}
                        </p>
                    )}
                </div>
            </Card>
        </div>
    );
}

export function Settings({ onBack }: { onBack: () => void }) {
    useEffect(() => {
        function handleKey(event: KeyboardEvent) {
            if (event.key === 'Escape' && !event.defaultPrevented) {
                event.preventDefault();
                onBack();
            }
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onBack]);
    return (
        <Tabs
            defaultValue="providers"
            orientation="vertical"
            className="min-h-0 flex-1 flex-col gap-0 sm:flex-row"
        >
            <aside className="flex flex-col border-b bg-sidebar p-4 sm:w-[260px] sm:shrink-0 sm:border-r sm:border-b-0">
                <h2 className="mb-4 px-2 font-semibold">Settings</h2>
                <TabsList
                    aria-label="Settings sections"
                    className="h-auto w-full justify-start bg-transparent sm:flex-col"
                >
                    <TabsTrigger
                        value="providers"
                        className="justify-start sm:w-full"
                    >
                        <Cable />
                        Providers
                    </TabsTrigger>
                    <TabsTrigger
                        value="platform"
                        className="justify-start sm:w-full"
                    >
                        <GraduationCap />
                        Learning platform
                    </TabsTrigger>
                </TabsList>
                <Button
                    variant="ghost"
                    className="mt-4 justify-start sm:mt-auto"
                    onClick={onBack}
                >
                    <ArrowLeft /> Back to chats
                </Button>
            </aside>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6 sm:p-10">
                <TabsContent value="providers" className="mx-auto max-w-3xl">
                    <Providers />
                </TabsContent>
                <TabsContent value="platform" className="mx-auto max-w-3xl">
                    <PlatformSettings />
                </TabsContent>
            </div>
        </Tabs>
    );
}
