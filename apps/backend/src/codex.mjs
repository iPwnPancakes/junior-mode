import { mkdir, realpath, stat } from 'node:fs/promises';
import { openStorage } from './storage.mjs';
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { createCodexProcess } from './codex-process.mjs';

const limit = (value) => String(value ?? '').slice(-100000);
const policy = {
    approvalPolicy: 'on-request',
    approvalsReviewer: 'user',
    sandbox: 'workspace-write',
};

function displayItem(item) {
    let text = item.text || '';
    if (item.type === 'userMessage')
        text =
            item.content
                ?.filter((part) => part.type === 'text')
                .map((part) => part.text)
                .join('\n') || '';
    if (item.type === 'commandExecution')
        text = `${item.command}\n${item.aggregatedOutput || ''}`;
    if (item.type === 'fileChange')
        text =
            item.changes
                ?.map((change) => `${change.path}\n${change.diff || ''}`)
                .join('\n\n') || '';
    if (item.type === 'mcpToolCall')
        text = `${item.server} / ${item.tool}\n${item.error?.message || JSON.stringify(item.result || '')}`;
    // Reasoning summaries are intentionally not shown as chat messages.
    if (!text && !['agentMessage', 'commandExecution'].includes(item.type))
        return null;
    return {
        id: item.id,
        type: item.type,
        text: limit(text),
        status: item.status || 'completed',
    };
}

export async function createCodexService({
    statePath,
    storage: providedStorage,
    processFactory = createCodexProcess,
    processOptions = () => ({}),
    coachingSkill = async () => {
        throw new Error('The coaching plugin is unavailable.');
    },
    coachingThreadConfig = () => ({}),
    authorizeCoaching = async () => {
        throw new Error('Authorize the learning platform first.');
    },
    redact = (value) => value,
}) {
    const storage =
        providedStorage ??
        (await openStorage({
            databasePath: join(dirname(statePath), 'junior-mode.sqlite'),
            legacyChatPath: statePath,
        }));
    const listeners = new Set();
    let transport;
    let starting;
    let operating = false;
    let disposed = false;
    const state = {
        instanceId: randomUUID(),
        host: hostname(),
        status: 'disconnected',
        account: null,
        error: null,
        projects: [],
        threads: [],
        thread: null,
        requests: [],
        revision: 0,
    };
    Object.assign(state, storage.loadChats());

    const snapshot = () => JSON.parse(redact(JSON.stringify(state)));
    function projectResult(project) {
        const current = snapshot();
        return {
            state: current,
            project: current.projects.find((entry) => entry.id === project.id),
        };
    }
    function publish() {
        state.revision++;
        for (const listener of listeners) listener(snapshot());
    }
    async function save(projects = state.projects) {
        storage.saveChats({ projects, threads: state.threads });
    }
    function upsert(item) {
        const normalized = displayItem(item);
        if (!normalized || !state.thread) return;
        const index = state.thread.items.findIndex(
            (existing) => existing.id === item.id,
        );
        if (index < 0) state.thread.items.push(normalized);
        else state.thread.items[index] = normalized;
    }
    function notify({ method, params = {} }) {
        if (method === 'serverRequest/resolved') {
            state.requests = state.requests.filter(
                (request) => request.id !== String(params.requestId),
            );
            publish();
            return;
        }
        if (!state.thread || params.threadId !== state.thread.id) return;
        if (method === 'turn/started') {
            state.thread.turnId = params.turn.id;
            state.thread.status = 'running';
        } else if (method === 'turn/completed') {
            state.thread.turnId = null;
            state.thread.status = params.turn.status;
            state.error = params.turn.error?.message || null;
            state.requests = [];
        } else if (method === 'item/started' || method === 'item/completed') {
            upsert({
                ...params.item,
                status:
                    params.item.status ||
                    (method === 'item/started' ? 'inProgress' : 'completed'),
            });
        } else if (
            method === 'item/agentMessage/delta' ||
            method === 'item/commandExecution/outputDelta'
        ) {
            let item = state.thread.items.find(
                (entry) => entry.id === params.itemId,
            );
            if (!item) {
                item = {
                    id: params.itemId,
                    type: method.includes('agentMessage')
                        ? 'agentMessage'
                        : 'commandExecution',
                    text: '',
                    status: 'inProgress',
                };
                state.thread.items.push(item);
            }
            item.text = limit(item.text + params.delta);
        } else if (method === 'error') {
            state.error = params.error?.message || 'Codex reported an error.';
        } else return;
        publish();
    }
    function request(message) {
        const { id, method, params = {} } = message;
        if (!state.thread || params.threadId !== state.thread.id) {
            transport.reject(
                id,
                'No active Junior Mode chat for this request.',
            );
            return;
        }
        if (
            [
                'item/commandExecution/requestApproval',
                'item/fileChange/requestApproval',
            ].includes(method)
        ) {
            const available = params.availableDecisions || [
                'accept',
                'decline',
                'cancel',
            ];
            state.requests.push({
                id: String(id),
                rpcId: id,
                kind: 'approval',
                title: method.includes('commandExecution')
                    ? 'Run command?'
                    : 'Apply file changes?',
                detail: limit(
                    [
                        params.reason,
                        params.command,
                        params.cwd,
                        state.thread.items.find(
                            (item) => item.id === params.itemId,
                        )?.text,
                        params.networkApprovalContext &&
                            JSON.stringify(params.networkApprovalContext),
                    ]
                        .filter(Boolean)
                        .join('\n'),
                ),
                decisions: available.filter((decision) =>
                    ['accept', 'decline', 'cancel'].includes(decision),
                ),
            });
        } else if (method === 'item/tool/requestUserInput') {
            state.requests.push({
                id: String(id),
                rpcId: id,
                kind: 'input',
                title: 'Codex needs your input',
                questions: params.questions,
            });
        } else {
            // Never silently grant an unknown capability. Surface the limitation
            // and return a protocol error so a turn does not hang indefinitely.
            transport.reject(id, `Junior Mode does not support ${method} yet.`);
            state.error = `Codex requested ${method}, which this client does not support yet.`;
        }
        publish();
    }
    function exited(error) {
        transport = undefined;
        state.status = 'disconnected';
        state.account = null;
        state.error = error.message;
        state.requests = [];
        if (state.thread) {
            state.thread.status = 'interrupted';
            state.thread.turnId = null;
        }
        publish();
    }
    async function connect() {
        if (disposed) throw new Error('The backend is shutting down.');
        if (starting) return starting;
        if (transport && state.status === 'ready') return;
        state.status = 'connecting';
        state.error = null;
        publish();
        starting = (async () => {
            const current = processFactory({
                ...processOptions(),
                onNotification: notify,
                onRequest: request,
                onExit: exited,
            });
            transport = current;
            try {
                await current.request('initialize', {
                    clientInfo: {
                        name: 'junior_mode',
                        title: 'Junior Mode',
                        version: '0.1.0',
                    },
                });
                current.notify('initialized');
                const account = await current.request('account/read', {
                    refreshToken: false,
                });
                state.account = account.account
                    ? account.account.type === 'chatgpt'
                        ? 'ChatGPT account'
                        : 'API key'
                    : account.requiresOpenaiAuth
                      ? null
                      : 'Configured provider';
                state.status = 'ready';
                if (!state.account)
                    state.error =
                        'Sign in with `codex login` on this machine, then reconnect.';
                if (state.thread) await resume(state.thread.id);
                publish();
            } catch (error) {
                current.dispose();
                exited(error);
                throw error;
            }
        })().finally(() => {
            starting = undefined;
        });
        return starting;
    }
    async function repositoryPath(value) {
        if (typeof value !== 'string' || !isAbsolute(value))
            throw new Error(
                'Enter an absolute repository path on the Codex machine.',
            );
        const cwd = await realpath(value);
        if (!(await stat(cwd)).isDirectory())
            throw new Error('The repository path must be a directory.');
        return cwd;
    }
    async function sanitized(operation) {
        try {
            return await operation();
        } catch (error) {
            throw new Error(redact(error.message));
        }
    }
    async function exclusive(operation) {
        if (operating)
            throw new Error('Another chat operation is in progress.');
        operating = true;
        try {
            return await operation();
        } catch (error) {
            throw new Error(redact(error.message));
        } finally {
            operating = false;
        }
    }
    function idle() {
        if (state.thread?.status === 'running')
            throw new Error(
                'Stop the current turn before switching chats or sending another message.',
            );
    }
    async function resume(id) {
        const saved = state.threads.find((entry) => entry.id === id);
        if (!saved) throw new Error('Unknown Junior Mode chat.');
        if (saved.coaching) {
            await coachingSkill();
            await authorizeCoaching(saved.cwd);
        }
        const { thread } = await transport.request('thread/resume', {
            threadId: id,
            cwd: saved.cwd,
            config: {
                'mcp_servers.junior-mode.enabled': Boolean(saved.coaching),
                ...coachingThreadConfig(Boolean(saved.coaching)),
            },
            ...policy,
        });
        state.thread = { ...saved, items: [], turnId: null, status: 'idle' };
        for (const turn of thread.turns || []) {
            for (const item of turn.items || []) upsert(item);
            if (turn.status === 'inProgress') {
                state.thread.status = 'running';
                state.thread.turnId = turn.id;
            }
        }
        state.requests = [];
    }

    return {
        invalidateConnection() {
            if (transport) transport.dispose();
            transport = undefined;
            state.thread = null;
            state.requests = [];
            state.status = 'disconnected';
            publish();
        },
        resetConnection: () =>
            exclusive(async () => {
                idle();
                if (transport) transport.dispose();
                transport = undefined;
                state.thread = null;
                state.status = 'disconnected';
                publish();
            }),
        getCodexState: async () => snapshot(),
        subscribeCodex(listener) {
            listeners.add(listener);
            listener(snapshot());
            return () => listeners.delete(listener);
        },
        addProject: (input) =>
            exclusive(async () => {
                if (
                    input?.create !== undefined &&
                    typeof input.create !== 'boolean'
                )
                    throw new Error('Invalid create-folder option.');
                if (input?.create) {
                    if (typeof input.cwd !== 'string' || !isAbsolute(input.cwd))
                        throw new Error('Enter an absolute repository path.');
                    await mkdir(input.cwd, { recursive: true });
                }
                const cwd = await repositoryPath(input?.cwd);
                const existing = state.projects.find(
                    (project) => project.cwd === cwd,
                );
                if (existing) return projectResult(existing);
                const project = {
                    id: randomUUID(),
                    name: basename(cwd) || cwd,
                    cwd,
                };
                const projects = [...state.projects, project];
                await save(projects);
                state.projects = projects;
                publish();
                return projectResult(project);
            }),
        connectCodex: () =>
            exclusive(async () => {
                idle();
                // Re-read account state after a user signs in through the CLI.
                if (transport) {
                    transport.dispose();
                    transport = undefined;
                }
                await connect();
                return snapshot();
            }),
        startChat: (input) =>
            exclusive(async () => {
                idle();
                let project;
                if (input?.projectId !== undefined) {
                    project = state.projects.find(
                        (entry) => entry.id === input.projectId,
                    );
                    if (!project)
                        throw new Error('Choose an existing project.');
                    if (
                        input.cwd !== undefined &&
                        (await repositoryPath(input.cwd)) !== project.cwd
                    )
                        throw new Error(
                            'The repository path does not match the selected project.',
                        );
                }
                const cwd = await repositoryPath(project?.cwd ?? input?.cwd);
                if (project && cwd !== project.cwd)
                    throw new Error(
                        'The project folder has moved. Add its new location as a project.',
                    );
                const coaching = input.coaching === true;
                if (coaching) {
                    await coachingSkill();
                    await authorizeCoaching(cwd);
                }
                await connect();
                idle();
                if (!state.account) throw new Error(state.error);
                const { thread } = await transport.request('thread/start', {
                    cwd,
                    config: {
                        'mcp_servers.junior-mode.enabled': coaching,
                        ...coachingThreadConfig(coaching),
                    },
                    ...policy,
                });
                project ??= state.projects.find((entry) => entry.cwd === cwd);
                if (!project) {
                    project = {
                        id: randomUUID(),
                        name: basename(cwd) || cwd,
                        cwd,
                    };
                    state.projects.push(project);
                }
                const saved = {
                    projectId: project.id,
                    id: thread.id,
                    cwd,
                    coaching,
                    title: 'New chat',
                    updatedAt: new Date().toISOString(),
                };
                state.threads.unshift(saved);
                state.thread = {
                    ...saved,
                    items: [],
                    turnId: null,
                    status: 'idle',
                };
                state.requests = [];
                state.error = null;
                await save();
                publish();
                return snapshot();
            }),
        openChat: (id) =>
            exclusive(async () => {
                idle();
                await connect();
                idle();
                await resume(id);
                state.error = null;
                publish();
                return snapshot();
            }),
        sendMessage: (text) =>
            exclusive(async () => {
                idle();
                if (
                    typeof text !== 'string' ||
                    !text.trim() ||
                    text.length > 12000
                )
                    throw new Error('Enter a message of 1–12,000 characters.');
                if (!state.thread)
                    throw new Error('Start or open a chat first.');
                await connect();
                idle();
                if (!state.account)
                    throw new Error('Sign in with codex login first.');
                if (state.thread.coaching)
                    await authorizeCoaching(state.thread.cwd);
                const thread = state.thread;
                thread.status = 'running';
                state.error = null;
                publish();
                try {
                    // item/started supplies the authoritative user message and ID.
                    const result = await transport.request('turn/start', {
                        threadId: thread.id,
                        input: [
                            ...(thread.coaching ? [await coachingSkill()] : []),
                            { type: 'text', text: text.trim() },
                        ],
                    });
                    if (thread.status === 'running')
                        thread.turnId = result.turn.id;
                    const saved = state.threads.find(
                        (entry) => entry.id === thread.id,
                    );
                    if (saved.title === 'New chat')
                        saved.title = text.trim().slice(0, 70);
                    saved.updatedAt = new Date().toISOString();
                    thread.title = saved.title;
                    await save();
                } catch (error) {
                    // A live turn remains stoppable if only saving the index failed.
                    if (!thread.turnId) thread.status = 'failed';
                    state.error = error.message;
                    publish();
                    throw error;
                }
                publish();
                return snapshot();
            }),
        interruptChat: () =>
            sanitized(async () => {
                if (!transport || !state.thread?.turnId)
                    throw new Error('There is no running turn to stop yet.');
                await transport.request('turn/interrupt', {
                    threadId: state.thread.id,
                    turnId: state.thread.turnId,
                });
                return snapshot();
            }),
        respondToCodex: ({ id, decision, answers } = {}) =>
            sanitized(async () => {
                const pending = state.requests.find((entry) => entry.id === id);
                if (!pending || !transport)
                    throw new Error('This request is no longer pending.');
                let result;
                if (pending.kind === 'approval') {
                    if (!pending.decisions.includes(decision))
                        throw new Error('Invalid approval decision.');
                    result = { decision };
                } else {
                    const validated = {};
                    for (const question of pending.questions) {
                        const value = answers?.[question.id];
                        if (typeof value !== 'string' || value.length > 4000)
                            throw new Error(
                                'Answer each question (up to 4,000 characters).',
                            );
                        validated[question.id] = { answers: [value] };
                    }
                    result = { answers: validated };
                }
                transport.respond(pending.rpcId, result);
                state.requests = state.requests.filter(
                    (entry) => entry !== pending,
                );
                publish();
                return snapshot();
            }),
        dispose() {
            disposed = true;
            transport?.dispose();
            transport = undefined;
            listeners.clear();
            if (!providedStorage) storage.close();
        },
    };
}
