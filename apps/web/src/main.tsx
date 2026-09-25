import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StrictMode, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import type { ConnectionState } from '@junior-mode/backend';
import { backend, isDesktop } from './backend';
import './style.css';
import { PlatformAuthorizationPanel } from './platform-authorization';
import { Chat } from './chat';

const labels: Record<ConnectionState['status'], string> = {
    'not-configured': 'Not connected',
    unchecked: 'Not checked yet',
    connected: 'Connected',
    unavailable: 'Unavailable',
};

function App() {
    const [tab, setTab] = useState<'chat' | 'platform'>('chat');
    const [connection, setConnection] = useState<ConnectionState | null>(null);
    const [url, setUrl] = useState('http://localhost:8000');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        backend
            .getConnection()
            .then((state) => {
                if (active) {
                    setConnection(state);
                    setUrl(state.platformUrl || 'http://localhost:8000');
                }
            })
            .catch(() => {
                if (active) {
                    setError(
                        'The local app service is unavailable. Restart the app and try again.',
                    );
                }
            });

        return () => {
            active = false;
        };
    }, []);

    async function run(operation: () => Promise<ConnectionState>) {
        setBusy(true);
        setError('');

        try {
            const state = await operation();
            setConnection(state);
            setError(state.message || '');
        } catch (failure) {
            setError(
                failure instanceof Error
                    ? failure.message
                    : 'Could not complete the request.',
            );
        } finally {
            setBusy(false);
        }
    }

    function connect(event: FormEvent) {
        event.preventDefault();
        void run(() => backend.connectPlatform(url.trim()));
    }

    return (
        <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as 'chat' | 'platform')}
            className={tab === 'chat' ? 'app chat-app gap-0' : 'app gap-0'}
        >
            <header>
                <a className="brand" href="#">
                    <span className="mark">jm</span> Junior Mode
                </a>
                <TabsList aria-label="Main navigation">
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="platform">
                        Learning platform
                    </TabsTrigger>
                </TabsList>
                <Badge variant="outline" className="surface">
                    {isDesktop ? 'Desktop' : 'Browser preview'}
                </Badge>
            </header>
            <TabsContent
                value="chat"
                className="flex min-h-0 flex-1 data-[state=inactive]:hidden"
            >
                <Chat />
            </TabsContent>
            <TabsContent value="platform">
                <main>
                    <div className="intro">
                        <span className="eyebrow">YOUR LEARNING COMPANION</span>
                        <h1>
                            A place to grow
                            <br />
                            as you build.
                        </h1>
                        <p>
                            Connect your learning platform to get your workspace
                            ready.
                        </p>
                    </div>
                    <Card
                        className="connection-card gap-0 p-7"
                        aria-labelledby="connection-title"
                    >
                        <div className="card-heading">
                            <div>
                                <span className="eyebrow">CONNECTION</span>
                                <h2 id="connection-title">Learning platform</h2>
                            </div>
                            <span
                                className={`status ${connection?.status || ''}`}
                                role="status"
                            >
                                <span className="dot" />
                                {connection
                                    ? labels[connection.status]
                                    : 'Loading…'}
                            </span>
                        </div>
                        <p>
                            Your coaching records and competencies stay in your
                            learning platform. Connect to an existing
                            installation below.
                        </p>
                        <form onSubmit={connect}>
                            <Label className="mb-2" htmlFor="platform-url">
                                Platform address
                            </Label>
                            <div className="input-row">
                                <Input
                                    id="platform-url"
                                    type="url"
                                    value={url}
                                    onChange={(event) =>
                                        setUrl(event.target.value)
                                    }
                                    required
                                    disabled={busy}
                                    spellCheck={false}
                                    aria-describedby="connection-help"
                                />
                                <Button
                                    type="submit"
                                    disabled={busy || !connection}
                                >
                                    {busy ? 'Working…' : 'Connect'}
                                </Button>
                            </div>
                            <p id="connection-help" className="hint">
                                Use your platform’s HTTP or HTTPS address,
                                including its port for a development server.
                            </p>
                        </form>
                        {error && (
                            <p className="error" role="alert">
                                {error}
                            </p>
                        )}
                        {connection?.platformUrl && (
                            <div className="connection-detail">
                                <div>
                                    <strong>{connection.platformUrl}</strong>
                                    <span>
                                        {connection.checkedAt
                                            ? `Last checked ${new Date(connection.checkedAt).toLocaleTimeString()}`
                                            : 'Check this saved connection to continue.'}
                                    </span>
                                </div>
                                <div className="actions">
                                    <Button
                                        variant="secondary"
                                        disabled={busy}
                                        onClick={() =>
                                            void run(backend.checkPlatform)
                                        }
                                    >
                                        Check connection
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        disabled={busy}
                                        onClick={() =>
                                            void run(backend.disconnectPlatform)
                                        }
                                    >
                                        Disconnect
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                    <PlatformAuthorizationPanel
                        key={connection?.platformUrl}
                        connected={Boolean(connection?.platformUrl)}
                    />
                    <p className="footnote">
                        Connecting checks platform availability. It does not
                        sign you in.
                    </p>
                </main>
            </TabsContent>
            <footer>
                <span>Junior Mode</span>
                <span>Make progress. Build understanding.</span>
            </footer>
        </Tabs>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
