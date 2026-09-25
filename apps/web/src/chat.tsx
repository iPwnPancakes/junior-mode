import { Folder } from 'lucide-react';
import { ProjectSidebar } from './project-sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RepositoryPicker } from './repository-picker';
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
                        <Button
                            key={decision}
                            disabled={busy}
                            variant={
                                decision === 'accept' ? 'default' : 'secondary'
                            }
                            onClick={() =>
                                respond({ id: request.id, decision })
                            }
                        >
                            {decision === 'accept'
                                ? 'Allow once'
                                : decision === 'decline'
                                  ? 'Decline'
                                  : 'Cancel'}
                        </Button>
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
                            <Label
                                className="mb-2"
                                htmlFor={`question-${question.id}`}
                            >
                                {question.question}
                            </Label>
                            {question.options?.map((option) => (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="answer-option h-auto whitespace-normal text-left"
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
                                </Button>
                            ))}
                            <Input
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
                    <Button disabled={busy}>Send answer</Button>
                </form>
            )}
        </section>
    );
}

export function Chat({ onOpenSettings }: { onOpenSettings: () => void }) {
    const [state, setState] = useState<CodexState | null>(null);
    const [cwd, setCwd] = useState('');
    const [newChat, setNewChat] = useState(false);
    const [projectId, setProjectId] = useState('');
    const [addingProject, setAddingProject] = useState(false);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [streamError, setStreamError] = useState('');
    const transcript = useRef<HTMLDivElement>(null);
    const follow = useRef(true);
    const running = state?.thread?.status === 'running';
    const project =
        state?.projects?.find(
            (entry) => entry.id === (projectId || state.thread?.projectId),
        ) ?? state?.projects?.[0];
    const showProjectForm = addingProject || !state?.projects?.length;
    const draft = newChat || !state?.thread;

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
            <ProjectSidebar
                state={state}
                disabled={busy || Boolean(running)}
                draftProjectId={
                    draft && !showProjectForm ? project?.id : undefined
                }
                onNewChat={(selected = project) => {
                    if (!selected) {
                        setAddingProject(true);
                        return;
                    }
                    setProjectId(selected.id);
                    setAddingProject(false);
                    setNewChat(true);
                    setError('');
                }}
                onAddProject={() => {
                    setCwd('');
                    setAddingProject(true);
                    setError('');
                }}
                onOpenChat={(id) => {
                    follow.current = true;
                    void run(() => backend.openChat(id)).then((opened) => {
                        if (opened) {
                            setProjectId(
                                state?.threads.find((chat) => chat.id === id)
                                    ?.projectId || '',
                            );
                            setNewChat(false);
                            setAddingProject(false);
                            setMessage('');
                        }
                    });
                }}
                onOpenSettings={onOpenSettings}
            />
            <section className="chat-panel" aria-label="Codex chat">
                <div className="chat-heading">
                    <div>
                        <span className="eyebrow">CODEX CHAT</span>
                        <h2>
                            {showProjectForm
                                ? 'Add project'
                                : draft
                                  ? 'New chat'
                                  : state?.thread?.title}
                        </h2>
                    </div>
                    <span className="status" role="status">
                        {running
                            ? 'Codex is working…'
                            : state?.thread?.status || 'Ready when you are'}
                    </span>
                </div>
                {showProjectForm ? (
                    <div className="chat-setup">
                        <h2>Add a project</h2>
                        <p>
                            Choose a repository once. Every chat in this project
                            will use that folder.
                        </p>
                        <p className="runtime-note">
                            {isDesktop
                                ? 'Folders on your computer'
                                : 'Folders on the preview server'}
                            {state ? ` · ${state.host}` : ''}
                        </p>
                        <form
                            onSubmit={async (event) => {
                                event.preventDefault();
                                if (
                                    await run(async () => {
                                        if (!backend.addProject)
                                            throw new Error(
                                                'Pull the latest desktop version and restart Electron to enable projects.',
                                            );
                                        const folder =
                                            await backend.browseDirectories({
                                                path: cwd,
                                            });
                                        if (!folder.currentPath)
                                            throw new Error(
                                                'Choose an existing folder first.',
                                            );
                                        const { state: next, project: added } =
                                            await backend.addProject({
                                                cwd: folder.currentPath,
                                            });
                                        setProjectId(added.id);
                                        return next;
                                    })
                                ) {
                                    setAddingProject(false);
                                    setNewChat(true);
                                }
                            }}
                        >
                            <RepositoryPicker
                                value={cwd}
                                onChange={setCwd}
                                disabled={busy || Boolean(running)}
                                host={state?.host}
                            />
                            <div className="flex gap-2">
                                <Button
                                    disabled={!cwd.trim() || busy || running}
                                >
                                    Add project
                                </Button>
                                {Boolean(state?.projects?.length) && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={busy}
                                        onClick={() => setAddingProject(false)}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                ) : draft ? (
                    <div className="chat-setup">
                        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                            <Folder />
                            <span>{project?.name}</span>
                        </div>
                        <h2>Start a new chat</h2>
                        <p>A new coaching chat in {project?.name}.</p>
                        <p className="runtime-note break-all">{project?.cwd}</p>
                        <form
                            onSubmit={async (event) => {
                                event.preventDefault();
                                if (!project) return;
                                follow.current = true;
                                if (
                                    await run(() =>
                                        backend.startChat({
                                            projectId: project.id,
                                            coaching: true,
                                        }),
                                    )
                                ) {
                                    setNewChat(false);
                                    setMessage('');
                                }
                            }}
                        >
                            <Button disabled={!project || busy || running}>
                                New chat
                            </Button>
                        </form>
                    </div>
                ) : (
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
                                    Choose a repository, start a chat, and ask
                                    Codex to help you explore or change it.
                                </p>
                            </div>
                        )}
                        {state?.thread?.items.map((item) =>
                            ['userMessage', 'agentMessage'].includes(
                                item.type,
                            ) ? (
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
                )}
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
                    {!showProjectForm && !newChat && state?.thread && (
                        <form
                            className="composer"
                            onSubmit={(event) => void send(event)}
                        >
                            <Label className="mb-2" htmlFor="chat-message">
                                Message Codex
                            </Label>
                            <Textarea
                                className="min-h-[70px] max-h-[220px] resize-y"
                                id="chat-message"
                                placeholder="What would you like to work on?"
                                value={message}
                                onChange={(event) =>
                                    setMessage(event.target.value)
                                }
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
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={!state?.thread?.turnId}
                                        onClick={() =>
                                            void run(backend.interruptChat)
                                        }
                                    >
                                        Stop
                                    </Button>
                                ) : (
                                    <Button
                                        disabled={
                                            busy ||
                                            !state?.thread ||
                                            !message.trim() ||
                                            Boolean(streamError)
                                        }
                                    >
                                        Send message
                                    </Button>
                                )}
                            </div>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
}
