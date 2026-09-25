import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { ConnectionState } from '@junior-mode/backend';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { backend } from './backend';
import { PlatformAuthorizationPanel } from './platform-authorization';

const labels: Record<ConnectionState['status'], string> = {
    'not-configured': 'Not connected',
    unchecked: 'Not checked yet',
    connected: 'Connected',
    unavailable: 'Unavailable',
};

export function PlatformSettings() {
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
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">Learning platform</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    Manage your coaching platform and client authorization.
                </p>
            </div>{' '}
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
                        {connection ? labels[connection.status] : 'Loading…'}
                    </span>
                </div>
                <p>
                    Your coaching records and competencies stay in your learning
                    platform. Connect to an existing installation below.
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
                            onChange={(event) => setUrl(event.target.value)}
                            required
                            disabled={busy}
                            spellCheck={false}
                            aria-describedby="connection-help"
                        />
                        <Button type="submit" disabled={busy || !connection}>
                            {busy ? 'Working…' : 'Connect'}
                        </Button>
                    </div>
                    <p id="connection-help" className="hint">
                        Use your platform’s HTTP or HTTPS address, including its
                        port for a development server.
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
                                onClick={() => void run(backend.checkPlatform)}
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
                Connecting checks platform availability. It does not sign you
                in.
            </p>
        </div>
    );
}
