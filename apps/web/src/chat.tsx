import { Folder } from 'lucide-react';
import { ProjectSidebar } from './project-sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ProjectDialog } from './project-dialog';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type {
    CodexAnswer,
    CodexRequest,
    CodexState,
} from '@junior-mode/backend';
import { backend } from './backend';

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
    const [newChat, setNewChat] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    const noProjects = !state?.projects?.length;
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
        <main
            className={
                sidebarCollapsed
                    ? 'chat-layout sidebar-collapsed'
                    : 'chat-layout'
            }
        >
            <ProjectDialog
                open={addingProject}
                onOpenChange={setAddingProject}
                host={state?.host}
                onAdded={(next, added) => {
                    setState((current) =>
                        current?.instanceId === next.instanceId &&
                        current.revision > next.revision
                            ? current
                            : next,
                    );
                    setProjectId(added.id);
                    setNewChat(true);
                    setError('');
                }}
            />
            <ProjectSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed((value) => !value)}
                state={state}
                disabled={busy || Boolean(running)}
                draftProjectId={draft && !noProjects ? project?.id : undefined}
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
                    <div className="flex min-w-0 items-center gap-3">
                        {!noProjects && (
                            <>
                                <span className="project-monogram">
                                    {(project?.name || 'JM').slice(0, 2)}
                                </span>
                                <span className="max-w-48 truncate text-sm text-muted-foreground">
                                    {project?.name}
                                </span>
                                <span className="text-muted-foreground">/</span>
                            </>
                        )}
                        <h2 className="truncate">
                            {noProjects
                                ? 'Welcome'
                                : draft
                                  ? 'New chat'
                                  : state?.thread?.title}
                        </h2>
                    </div>
                    <span className="status" role="status">
                        {running ? 'Codex is working…' : ''}
                    </span>
                </div>
                {noProjects ? (
                    <div className="chat-setup">
                        <h2>Start with a project</h2>
                        <p>
                            Add a local folder to start your first coaching
                            chat.
                        </p>
                        <Button
                            className="mt-6"
                            onClick={() => setAddingProject(true)}
                        >
                            Add project
                        </Button>
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
                    {!noProjects && !newChat && state?.thread && (
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
