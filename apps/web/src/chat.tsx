import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type {
    CodexAnswer,
    CodexRequest,
    CodexState,
} from '@junior-mode/backend';
import { backend, isDesktop } from './backend';

function RequestCard({
    request,
    busy,
    respond,
}: {
    request: CodexRequest;
    busy: boolean;
    respond: (answer: CodexAnswer) => void;
}) {
    const [answers, setAnswers] = useState<Record<string, string>>({});
    return (
        <section className="codex-request" aria-label={request.title}>
            <h3>{request.title}</h3>
            {request.detail && <pre>{request.detail}</pre>}
            {request.kind === 'approval' ? (
                <div className="actions">
                    {request.decisions?.map((decision) => (
                        <button
                            key={decision}
                            disabled={busy}
                            className={decision === 'accept' ? '' : 'secondary'}
                            onClick={() =>
                                respond({ id: request.id, decision })
                            }
                        >
                            {decision === 'accept'
                                ? 'Allow once'
                                : decision === 'decline'
                                  ? 'Decline'
                                  : 'Cancel'}
                        </button>
                    ))}
                </div>
            ) : (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        respond({ id: request.id, answers });
                    }}
                >
                    {request.questions?.map((question) => (
                        <div key={question.id}>
                            <label htmlFor={`question-${question.id}`}>
                                {question.question}
                            </label>
                            {question.options?.map((option) => (
                                <button
                                    type="button"
                                    className="secondary answer-option"
                                    key={option.label}
                                    title={option.description}
                                    onClick={() =>
                                        setAnswers({
                                            ...answers,
                                            [question.id]: option.label,
                                        })
                                    }
                                >
                                    {option.label}
                                </button>
                            ))}
                            <input
                                id={`question-${question.id}`}
                                type={question.isSecret ? 'password' : 'text'}
                                value={answers[question.id] || ''}
                                maxLength={4000}
                                required
                                onChange={(event) =>
                                    setAnswers({
                                        ...answers,
                                        [question.id]: event.target.value,
                                    })
                                }
                            />
                        </div>
                    ))}
                    <button disabled={busy}>Send answer</button>
                </form>
            )}
        </section>
    );
}

export function Chat() {
    const [state, setState] = useState<CodexState | null>(null);
    const [cwd, setCwd] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [streamError, setStreamError] = useState('');
    const transcript = useRef<HTMLDivElement>(null);
    const follow = useRef(true);
    const running = state?.thread?.status === 'running';

    useEffect(
        () =>
            backend.subscribeCodex((next) => {
                // Event snapshots are authoritative, including after a backend restart.
                setState((current) =>
                    current?.instanceId === next.instanceId &&
                    current.revision > next.revision
                        ? current
                        : next,
                );
                setStreamError('');
            }, setStreamError),
        [],
    );
    useEffect(() => {
        if (follow.current && transcript.current)
            transcript.current.scrollTop = transcript.current.scrollHeight;
    }, [state]);

    async function run(operation: () => Promise<CodexState>) {
        setBusy(true);
        setError('');
        try {
            const next = await operation();
            // An event can arrive while the response is in flight.
            setState((current) =>
                current?.instanceId === next.instanceId &&
                current.revision > next.revision
                    ? current
                    : next,
            );
            return true;
        } catch (failure) {
            setError(
                failure instanceof Error
                    ? failure.message
                    : 'Could not complete the chat operation.',
            );
            return false;
        } finally {
            setBusy(false);
        }
    }
    async function send(event: FormEvent) {
        event.preventDefault();
        follow.current = true;
        if (await run(() => backend.sendMessage(message))) setMessage('');
    }

    return (
        <main className="chat-layout">
            <aside className="chat-sidebar">
                <span className="eyebrow">YOUR WORKSPACE</span>
                <h1>Build with Codex.</h1>
                <p className="runtime-note">
                    {isDesktop
                        ? 'Runs on your computer'
                        : 'Runs on the preview server'}
                    {state ? ` · ${state.host}` : ''}
                </p>
                <div className="codex-connection">
                    <span
                        className={`status ${state?.status === 'ready' && state.account ? 'connected' : ''}`}
                    >
                        <span className="dot" />
                        {state?.account ||
                            (state?.status === 'connecting'
                                ? 'Starting Codex…'
                                : 'Codex not connected')}
                    </span>
                    <button
                        className="secondary"
                        disabled={
                            busy || running || state?.status === 'connecting'
                        }
                        onClick={() => void run(backend.connectCodex)}
                    >
                        {state?.status === 'ready' ? 'Reconnect Codex' : 'Connect Codex'}
                    </button>
                </div>
                {!state?.account && (
                    <p className="hint">
                        Install Codex CLI and run <code>codex login</code> on{' '}
                        {isDesktop ? 'your computer' : 'the preview server'},
                        then connect. Your existing Codex account and
                        configuration are used.
                    </p>
                )}
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        follow.current = true;
                        void run(() => backend.startChat({ cwd: cwd.trim() }));
                    }}
                >
                    <label htmlFor="repository-path">Repository path</label>
                    <input
                        id="repository-path"
                        placeholder={
                            isDesktop
                                ? '/absolute/path/to/your/repository'
                                : '/absolute/path/on/the/server'
                        }
                        value={cwd}
                        onChange={(event) => setCwd(event.target.value)}
                        required
                        spellCheck={false}
                        disabled={busy || running}
                    />
                    <p className="hint">
                        An existing folder on{' '}
                        {state?.host || 'the Codex machine'}. Codex can edit
                        files and run commands in it.
                    </p>
                    <button disabled={!cwd.trim() || busy || running}>
                        New chat
                    </button>
                </form>
                <h2 className="chat-list-title">Recent chats</h2>
                <div className="chat-list">
                    {!state?.threads.length && (
                        <p className="hint">Your chats will appear here.</p>
                    )}
                    {state?.threads.map((chat) => (
                        <button
                            className={
                                state.thread?.id === chat.id
                                    ? 'chat-link active'
                                    : 'chat-link'
                            }
                            key={chat.id}
                            disabled={busy || running}
                            onClick={() => {
                                follow.current = true;
                                void run(() => backend.openChat(chat.id));
                            }}
                        >
                            <strong>{chat.title}</strong>
                            <span>{chat.cwd}</span>
                        </button>
                    ))}
                </div>
            </aside>
            <section className="chat-panel" aria-label="Codex chat">
                <div className="chat-heading">
                    <div>
                        <span className="eyebrow">CODEX CHAT</span>
                        <h2>
                            {state?.thread?.title || 'Start with a repository'}
                        </h2>
                    </div>
                    <span className="status" role="status">
                        {running
                            ? 'Codex is working…'
                            : state?.thread?.status || 'Ready when you are'}
                    </span>
                </div>
                <div
                    className="transcript"
                    ref={transcript}
                    onScroll={() => {
                        const el = transcript.current;
                        if (el)
                            follow.current =
                                el.scrollHeight -
                                    el.scrollTop -
                                    el.clientHeight <
                                80;
                    }}
                    aria-label="Chat messages"
                    role="log"
                    aria-live="polite"
                >
                    {!state?.thread?.items.length && (
                        <div className="chat-empty">
                            <h2>Make something. Understand it.</h2>
                            <p>
                                Choose a repository, start a chat, and ask Codex
                                to help you explore or change it.
                            </p>
                            <p className="hint">
                                These are Codex chats. Coaching and
                                learning-record synchronization are not
                                connected yet.
                            </p>
                        </div>
                    )}
                    {state?.thread?.items.map((item) =>
                        ['userMessage', 'agentMessage'].includes(item.type) ? (
                            <article
                                className={`chat-message ${item.type}`}
                                key={item.id}
                            >
                                <strong>
                                    {item.type === 'userMessage'
                                        ? 'You'
                                        : 'Codex'}
                                </strong>
                                <div>{item.text || '…'}</div>
                            </article>
                        ) : (
                            <details className="tool-item" key={item.id}>
                                <summary>
                                    {item.type === 'commandExecution'
                                        ? 'Command'
                                        : item.type === 'fileChange'
                                          ? 'File changes'
                                          : item.type}{' '}
                                    · {item.status}
                                </summary>
                                <pre>{item.text}</pre>
                            </details>
                        ),
                    )}
                </div>
                <div className="chat-controls">
                    {(error || state?.error || streamError) && (
                        <p className="error" role="alert">
                            {error || state?.error || streamError}
                        </p>
                    )}
                    {state?.requests.map((request) => (
                        <RequestCard
                            key={request.id}
                            request={request}
                            busy={busy}
                            respond={(answer) =>
                                void run(() => backend.respondToCodex(answer))
                            }
                        />
                    ))}
                    <form
                        className="composer"
                        onSubmit={(event) => void send(event)}
                    >
                        <label htmlFor="chat-message">Message Codex</label>
                        <textarea
                            id="chat-message"
                            placeholder="What would you like to work on?"
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            maxLength={12000}
                            rows={3}
                            disabled={!state?.thread}
                            required
                        />
                        <div className="composer-actions">
                            <span className="hint">
                                Workspace edits enabled · Codex approval
                                requests appear here
                            </span>
                            {running ? (
                                <button
                                    type="button"
                                    className="secondary"
                                    disabled={!state?.thread?.turnId}
                                    onClick={() =>
                                        void run(backend.interruptChat)
                                    }
                                >
                                    Stop
                                </button>
                            ) : (
                                <button
                                    disabled={
                                        busy ||
                                        !state?.thread ||
                                        !message.trim() ||
                                        Boolean(streamError)
                                    }
                                >
                                    Send message
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}
