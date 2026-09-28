import { ArrowUp, Folder, PanelLeft, ShieldCheck, Square } from 'lucide-react';
import { ProjectSidebar } from './project-sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
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
    // Phones get the sidebar as a drawer so the conversation keeps the full width.
    const mobile = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawer = useRef<HTMLDivElement>(null);
    const drawerTrigger = useRef<HTMLButtonElement>(null);
    const drawerWasOpen = useRef(false);
    const [projectId, setProjectId] = useState('');
    const [addingProject, setAddingProject] = useState(false);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const submitting = useRef(false);
    const composerInput = useRef<HTMLTextAreaElement>(null);
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
        if (
            submitting.current || busy || running || streamError ||
            !message.trim() || !project
        ) return;
        submitting.current = true;
        const submitted = message;
        follow.current = true;
        try {
            await run(async () => {
                if (draft) {
                    const next = await backend.startChat({
                        projectId: project.id,
                        coaching: true,
                    });
                    setState((current) =>
                        current?.instanceId === next.instanceId &&
                        current.revision > next.revision ? current : next,
                    );
                    setNewChat(false);
                }
                const next = await backend.sendMessage(submitted);
                setMessage((current) =>
                    current === submitted ? '' : current,
                );
                return next;
            });
        } finally {
            submitting.current = false;
            composerInput.current?.focus();
        }
    }

    useEffect(() => {
        if (drawerOpen) drawer.current?.focus({ preventScroll: true });
        // Return focus unless a sidebar action (like Add project) moved it.
        else if (
            drawerWasOpen.current &&
            (document.activeElement === document.body ||
                drawer.current?.contains(document.activeElement))
        )
            drawerTrigger.current?.focus();
        drawerWasOpen.current = drawerOpen;
    }, [drawerOpen]);

    const sidebar = (
        <ProjectSidebar
            collapsed={!mobile && sidebarCollapsed}
            onToggle={() =>
                mobile
                    ? setDrawerOpen(false)
                    : setSidebarCollapsed((value) => !value)
            }
            state={state}
            disabled={busy || Boolean(running)}
            draftProjectId={draft && !noProjects ? project?.id : undefined}
            onNewChat={(selected = project) => {
                setDrawerOpen(false);
                if (!selected) {
                    setAddingProject(true);
                    return;
                }
                setProjectId(selected.id);
                setAddingProject(false);
                setNewChat(true);
                setMessage('');
                setError('');
            }}
            onAddProject={() => {
                setDrawerOpen(false);
                setAddingProject(true);
                setError('');
            }}
            onOpenChat={(id) => {
                setDrawerOpen(false);
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
            onSettleChat={(id) => void run(() => backend.settleChat(id))}
            onUnsettleChat={(id) => void run(() => backend.unsettleChat(id))}
            actionsDisabled={busy}
            onOpenSettings={() => {
                setDrawerOpen(false);
                onOpenSettings();
            }}
        />
    );

    return (
        <main
            className={
                !mobile && sidebarCollapsed
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
            {mobile ? (
                // Stays mounted so opening only toggles a compositor transform.
                <>
                    <div
                        className="mobile-sidebar-overlay bg-black/50"
                        data-state={drawerOpen ? 'open' : 'closed'}
                        aria-hidden
                        onClick={() => setDrawerOpen(false)}
                    />
                    <div
                        ref={drawer}
                        className="mobile-sidebar shadow-lg"
                        data-state={drawerOpen ? 'open' : 'closed'}
                        role="dialog"
                        aria-modal
                        aria-label="Chats"
                        tabIndex={-1}
                        inert={!drawerOpen}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') setDrawerOpen(false);
                        }}
                    >
                        {sidebar}
                    </div>
                </>
            ) : (
                sidebar
            )}
            <section
                className="chat-panel"
                aria-label="Codex chat"
                inert={mobile && drawerOpen}
            >
                <div className="chat-heading">
                    <div className="flex min-w-0 items-center gap-3">
                        {mobile && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="sidebar-icon -ml-1.5"
                                ref={drawerTrigger}
                                aria-label="Open sidebar"
                                aria-expanded={drawerOpen}
                                title="Open sidebar"
                                onClick={() => setDrawerOpen(true)}
                            >
                                <PanelLeft />
                            </Button>
                        )}
                        {!noProjects && (
                            <>
                                <span className="project-monogram">
                                    {(project?.name || 'JM').slice(0, 2)}
                                </span>
                                <span className="max-w-24 truncate text-sm text-muted-foreground sm:max-w-48">
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
                        {!draft &&
                            state?.thread?.settledOverride === 'settled' && (
                                <Badge
                                    variant="outline"
                                    title="Sending a message moves this chat back to active work"
                                >
                                    Settled
                                </Badge>
                            )}
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
                    {!noProjects && (
                        <form
                            className="composer"
                            onSubmit={(event) => void send(event)}
                        >
                            <Label className="sr-only" htmlFor="chat-message">
                                Message Codex
                            </Label>
                            <Textarea
                                ref={composerInput}
                                className="min-h-[88px] max-h-[240px] resize-none rounded-none border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0 dark:bg-transparent"
                                id="chat-message"
                                placeholder="Ask Codex anything…"
                                value={message}
                                onChange={(event) =>
                                    setMessage(event.target.value)
                                }
                                maxLength={12000}
                                rows={2}
                                readOnly={busy}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === 'Enter' &&
                                        !event.shiftKey &&
                                        !event.nativeEvent.isComposing &&
                                        event.nativeEvent.keyCode !== 229
                                    ) {
                                        event.preventDefault();
                                        if (!event.repeat)
                                            event.currentTarget.form?.requestSubmit();
                                    }
                                }}
                                required
                            />
                            <div className="composer-actions">
                                <div className="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
                                    <span>Codex</span>
                                    <span
                                        className="inline-flex items-center gap-1.5"
                                        title="Commands can access files and the network without approval prompts"
                                    >
                                        <ShieldCheck className="size-3.5" />
                                        Full Access
                                    </span>
                                </div>
                                {running ? (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        className="shrink-0 rounded-full"
                                        aria-label="Stop"
                                        title="Stop"
                                        disabled={busy || !state?.thread?.turnId}
                                        onClick={() =>
                                            void run(backend.interruptChat)
                                        }
                                    >
                                        <Square className="size-3.5" fill="currentColor" />
                                    </Button>
                                ) : (
                                    <Button
                                        size="icon"
                                        className="shrink-0 rounded-full"
                                        aria-label="Send message"
                                        title="Send message (Enter)"
                                        disabled={
                                            busy ||
                                            !message.trim() ||
                                            Boolean(streamError)
                                        }
                                    >
                                        <ArrowUp />
                                    </Button>
                                )}
                            </div>
                        </form>
                    )}
                    {!noProjects && (
                        <p className="composer-hint">
                            Enter to send · Shift+Enter for a new line
                        </p>
                    )}
                </div>
            </section>
        </main>
    );
}
