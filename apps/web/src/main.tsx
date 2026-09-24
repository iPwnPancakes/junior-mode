import { StrictMode, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import type { ConnectionState } from '@junior-mode/backend';
import { backend, isDesktop } from './backend';
import './style.css';

const labels: Record<ConnectionState['status'], string> = {
    'not-configured': 'Not connected',
    unchecked: 'Not checked yet',
    connected: 'Connected',
    unavailable: 'Unavailable',
};

function App() {
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
        <div className="app">
            <header>
                <a className="brand" href="#">
                    <span className="mark">jm</span> Junior Mode
                </a>
                <span className="surface">
                    {isDesktop ? 'Desktop' : 'Browser preview'}
                </span>
            </header>
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
                <section
                    className="connection-card"
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
                        learning platform. Connect to an existing installation
                        below.
                    </p>
                    <form onSubmit={connect}>
                        <label htmlFor="platform-url">Platform address</label>
                        <div className="input-row">
                            <input
                                id="platform-url"
                                type="url"
                                value={url}
                                onChange={(event) => setUrl(event.target.value)}
                                required
                                disabled={busy}
                                spellCheck={false}
                                aria-describedby="connection-help"
                            />
                            <button
                                type="submit"
                                disabled={busy || !connection}
                            >
                                {busy ? 'Working…' : 'Connect'}
                            </button>
                        </div>
                        <p id="connection-help" className="hint">
                            Use your platform’s HTTPS address, or localhost for
                            a local installation.
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
                                <button
                                    className="secondary"
                                    disabled={busy}
                                    onClick={() =>
                                        void run(backend.checkPlatform)
                                    }
                                >
                                    Check connection
                                </button>
                                <button
                                    className="text-button"
                                    disabled={busy}
                                    onClick={() =>
                                        void run(backend.disconnectPlatform)
                                    }
                                >
                                    Disconnect
                                </button>
                            </div>
                        </div>
                    )}
                </section>
                <p className="footnote">
                    Connecting checks platform availability. It does not sign
                    you in.
                </p>
            </main>
            <footer>
                <span>Junior Mode</span>
                <span>Make progress. Build understanding.</span>
            </footer>
        </div>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
