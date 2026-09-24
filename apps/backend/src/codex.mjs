import {
    mkdir,
    readFile,
    realpath,
    rename,
    stat,
    writeFile,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { dirname, isAbsolute } from 'node:path';
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
    processFactory = createCodexProcess,
}) {
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
        threads: [],
        thread: null,
        requests: [],
        revision: 0,
    };
    try {
        const stored = JSON.parse(await readFile(statePath, 'utf8'));
        if (
            !Array.isArray(stored) ||
            stored.some((entry) => !entry.id || !isAbsolute(entry.cwd))
        )
            throw new Error('Invalid chat index');
        state.threads = stored;
    } catch (error) {
        if (error.code !== 'ENOENT')
            state.error =
                'Saved chat list could not be read. Existing transcripts remain in Codex storage.';
    }

    const snapshot = () => structuredClone(state);
    function publish() {
        state.revision++;
        for (const listener of listeners) listener(snapshot());
    }
    async function save() {
        await mkdir(dirname(statePath), { recursive: true });
        await writeFile(`${statePath}.tmp`, JSON.stringify(state.threads), {
            mode: 0o600,
        });
        await rename(`${statePath}.tmp`, statePath);
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
    async function exclusive(operation) {
        if (operating)
            throw new Error('Another chat operation is in progress.');
        operating = true;
        try {
            return await operation();
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
        const { thread } = await transport.request('thread/resume', {
            threadId: id,
            cwd: saved.cwd,
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
        getCodexState: async () => snapshot(),
        subscribeCodex(listener) {
            listeners.add(listener);
            listener(snapshot());
            return () => listeners.delete(listener);
        },
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
                if (typeof input?.cwd !== 'string' || !isAbsolute(input.cwd))
                    throw new Error(
                        'Enter an absolute repository path on the Codex machine.',
                    );
                const cwd = await realpath(input.cwd);
                if (!(await stat(cwd)).isDirectory())
                    throw new Error('The repository path must be a directory.');
                await connect();
                idle();
                if (!state.account) throw new Error(state.error);
                const { thread } = await transport.request('thread/start', {
                    cwd,
                    ...policy,
                });
                const saved = {
                    id: thread.id,
                    cwd,
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
                const thread = state.thread;
                thread.status = 'running';
                state.error = null;
                publish();
                try {
                    // item/started supplies the authoritative user message and ID.
                    const result = await transport.request('turn/start', {
                        threadId: thread.id,
                        input: [{ type: 'text', text: text.trim() }],
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
        interruptChat: async () => {
            if (!transport || !state.thread?.turnId)
                throw new Error('There is no running turn to stop yet.');
            await transport.request('turn/interrupt', {
                threadId: state.thread.id,
                turnId: state.thread.turnId,
            });
            return snapshot();
        },
        respondToCodex: async ({ id, decision, answers } = {}) => {
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
        },
        dispose() {
            disposed = true;
            transport?.dispose();
            transport = undefined;
            listeners.clear();
        },
    };
}
