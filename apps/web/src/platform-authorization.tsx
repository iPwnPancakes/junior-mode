import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import type {
    CoachingPluginState,
    PlatformAuthorization,
} from '@junior-mode/backend';
import { backend } from './backend';

export function PlatformAuthorizationPanel({
    connected,
}: {
    connected: boolean;
}) {
    const [state, setState] = useState<PlatformAuthorization | null>(null);
    const [plugin, setPlugin] = useState<CoachingPluginState | null>(null);
    const [name, setName] = useState('My Junior Mode desktop');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        void backend
            .getCoachingPlugin()
            .then(setPlugin)
            .catch(() => setError('Could not read coaching plugin state.'));
        void backend
            .getPlatformAuthorization()
            .then(setState)
            .catch(() => setError('Could not read authorization state.'));
    }, []);
    async function run(operation: () => Promise<PlatformAuthorization>) {
        setBusy(true);
        setError('');
        try {
            setState(await operation());
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'Authorization failed.',
            );
            setState(
                await backend.getPlatformAuthorization().catch(() => null),
            );
        } finally {
            setBusy(false);
        }
    }
    return (
        <Card
            className="connection-card mt-5 gap-3 p-7"
            aria-labelledby="authorization-title"
        >
            <h2 id="authorization-title">Coaching authorization</h2>
            <p>
                Authorize this named client with your Learner account. Your
                Codex login is separate.
            </p>
            <p role="status">
                {state?.status === 'authorized'
                    ? `Authorized as ${state.learner} (${state.client})`
                    : (state?.status ?? 'Loading…')}
            </p>
            <Label className="mb-2" htmlFor="client-name">
                Client name
            </Label>
            <Input
                id="client-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                disabled={busy}
            />
            <div className="actions">
                <Button
                    disabled={!connected || busy}
                    onClick={() =>
                        void run(() => backend.beginPlatformAuthorization(name))
                    }
                >
                    Authorize client
                </Button>
                <Button
                    variant="secondary"
                    disabled={!connected || busy}
                    onClick={() => void run(backend.checkPlatformAuthorization)}
                >
                    Check authorization
                </Button>
            </div>
            {state?.authorizationUrl && (
                <div>
                    <p>
                        Open this address in your browser, sign in to the
                        platform, and approve code{' '}
                        <strong>{state.userCode}</strong>:
                    </p>
                    <p className="hint">{state.authorizationUrl}</p>
                    <Button
                        disabled={busy}
                        onClick={() =>
                            void backend
                                .openPlatformAuthorization()
                                .catch((error) => setError(error.message))
                        }
                    >
                        Open approval in browser
                    </Button>
                    <Button
                        disabled={busy}
                        onClick={() =>
                            void run(backend.completePlatformAuthorization)
                        }
                    >
                        I approved this client
                    </Button>
                </div>
            )}
            <h3>Coaching plugin</h3>
            <p>
                {plugin?.installed
                    ? `Version ${plugin.version} installed`
                    : 'Install the bundled coaching workflows before starting your first coaching chat.'}
            </p>
            <p className="hint">
                Installation adds only the Junior Mode plugin to Codex. New
                chats automatically use coaching in enrolled repositories.
            </p>
            <Button
                disabled={busy}
                onClick={() => {
                    setBusy(true);
                    setError('');
                    void backend
                        .installCoachingPlugin()
                        .then(setPlugin)
                        .catch((error) => setError(error.message))
                        .finally(() => setBusy(false));
                }}
            >
                {plugin?.installed
                    ? 'Reinstall coaching plugin'
                    : 'Install coaching plugin'}
            </Button>
            {error && (
                <p className="error" role="alert">
                    {error}
                </p>
            )}
        </Card>
    );
}
