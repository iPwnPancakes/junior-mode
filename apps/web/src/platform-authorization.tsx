import { useEffect, useState } from 'react';
import type { PlatformAuthorization } from '@junior-mode/backend';
import { backend } from './backend';

export function PlatformAuthorizationPanel({
    connected,
}: {
    connected: boolean;
}) {
    const [state, setState] = useState<PlatformAuthorization | null>(null);
    const [name, setName] = useState('My Junior Mode desktop');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
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
        <section
            className="connection-card"
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
            <label htmlFor="client-name">Client name</label>
            <input
                id="client-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                disabled={busy}
            />
            <div className="actions">
                <button
                    disabled={!connected || busy}
                    onClick={() =>
                        void run(() => backend.beginPlatformAuthorization(name))
                    }
                >
                    Authorize client
                </button>
                <button
                    className="secondary"
                    disabled={!connected || busy}
                    onClick={() => void run(backend.checkPlatformAuthorization)}
                >
                    Check authorization
                </button>
            </div>
            {state?.authorizationUrl && (
                <div>
                    <p>
                        Open this address in your browser, sign in to the
                        platform, and approve code{' '}
                        <strong>{state.userCode}</strong>:
                    </p>
                    <p className="hint">{state.authorizationUrl}</p>
                    <button
                        disabled={busy}
                        onClick={() =>
                            void backend
                                .openPlatformAuthorization()
                                .catch((error) => setError(error.message))
                        }
                    >
                        Open approval in browser
                    </button>
                    <button
                        disabled={busy}
                        onClick={() =>
                            void run(backend.completePlatformAuthorization)
                        }
                    >
                        I approved this client
                    </button>
                </div>
            )}
            {error && (
                <p className="error" role="alert">
                    {error}
                </p>
            )}
        </section>
    );
}
