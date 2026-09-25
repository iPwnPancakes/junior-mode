import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import {
    mkdir,
    mkdtemp,
    readFile,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { createCodexProcess } from '../src/codex-process.mjs';
import { createCodexService } from '../src/codex.mjs';
import { createBackendServer } from '../src/http.mjs';

const fixtureScript = fileURLToPath(
    new URL('./fixtures/codex-server.mjs', import.meta.url),
);
async function fixture(t) {
    const directory = await mkdtemp(join(tmpdir(), 'junior-codex-'));
    const services = [];
    const options = {
        statePath: join(directory, 'chats.json'),
        processFactory: (handlers) =>
            createCodexProcess({
                ...handlers,
                executable: process.execPath,
                args: [fixtureScript, join(directory, 'codex.json')],
            }),
    };
    async function create() {
        const service = await createCodexService(options);
        services.push(service);
        return service;
    }
    t.after(async () => {
        services.forEach((service) => service.dispose());
        await rm(directory, { recursive: true, force: true });
    });
    return { directory, create, service: await create() };
}
async function until(service, predicate) {
    const timeout = Date.now() + 5000;
    while (Date.now() < timeout) {
        const state = await service.getCodexState();
        if (predicate(state)) return state;
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.fail('Timed out waiting for Codex state');
}

test('Codex handshake, streamed turns, local thread index and resume survive a backend restart', async (t) => {
    const { service, directory, create } = await fixture(t);
    assert.equal((await service.getCodexState()).status, 'disconnected');
    const events = [];
    const unsubscribe = service.subscribeCodex((state) => events.push(state));
    t.after(unsubscribe);
    await service.startChat({ cwd: directory });
    await service.sendMessage('Hello Codex');
    let state = await until(
        service,
        (value) => value.thread.status === 'completed',
    );
    assert.deepEqual(
        state.thread.items.map((item) => item.text),
        ['Hello Codex', 'Fixture reply'],
    );
    assert.ok(
        events.some((value) =>
            value.thread?.items.some(
                (item) =>
                    item.text === 'Fixture reply' &&
                    item.status === 'inProgress',
            ),
        ),
    );
    const id = state.thread.id;
    const requests = (
        await readFile(join(directory, 'codex.json.requests'), 'utf8')
    )
        .trim()
        .split('\n')
        .map(JSON.parse);
    assert.deepEqual(
        requests.slice(0, 3).map((entry) => entry.method),
        ['initialize', 'initialized', 'account/read'],
    );
    const start = requests.find((entry) => entry.method === 'thread/start');
    assert.equal(start.params.cwd, directory);
    assert.equal(start.params.sandbox, 'workspace-write');
    assert.equal(start.params.approvalPolicy, 'on-request');
    assert.equal(start.params.approvalsReviewer, 'user');
    service.dispose();
    const restored = await create();
    state = await restored.openChat(id);
    assert.equal(state.thread.items[1].text, 'Fixture reply');
    assert.equal(state.threads[0].title, 'Hello Codex');
    await assert.rejects(restored.openChat('someone-elses-chat'), /Unknown/);
});

test('approval and input requests require explicit valid answers; unknown requests fail closed', async (t) => {
    const { service, directory } = await fixture(t);
    await service.startChat({ cwd: directory });
    await service.sendMessage('approve');
    let state = await until(service, (value) => value.requests.length === 1);
    await assert.rejects(
        service.respondToCodex({
            id: state.requests[0].id,
            decision: 'acceptForSession',
        }),
        /Invalid/,
    );
    await service.respondToCodex({
        id: state.requests[0].id,
        decision: 'decline',
    });
    state = await until(
        service,
        (value) => value.thread.status === 'completed',
    );
    assert.equal(state.thread.items.at(-1).text, 'Decision: decline');
    await assert.rejects(
        service.respondToCodex({ id: '700', decision: 'accept' }),
        /no longer pending/,
    );
    await service.sendMessage('question');
    await until(service, (value) => value.requests.length === 1);
    await assert.rejects(
        service.respondToCodex({ id: '701', answers: {} }),
        /Answer each/,
    );
    await service.respondToCodex({ id: '701', answers: { choice: 'Small' } });
    state = await until(
        service,
        (value) => value.thread.status === 'completed',
    );
    assert.equal(state.thread.items.at(-1).text, 'Answer: Small');
    await service.sendMessage('unsupported');
    state = await until(
        service,
        (value) => value.thread.status === 'completed',
    );
    assert.equal(
        state.thread.items.at(-1).text,
        'Unsupported request rejected',
    );
});

test('a running turn cannot be duplicated or switched, can be stopped, and process crashes are surfaced', async (t) => {
    const { service, directory } = await fixture(t);
    await assert.rejects(
        service.startChat({ cwd: 'relative/path' }),
        /absolute/,
    );
    await service.startChat({ cwd: directory });
    await service.sendMessage('wait');
    await until(service, (value) => value.thread.turnId);
    await assert.rejects(service.sendMessage('again'), /Stop the current turn/);
    await assert.rejects(
        service.startChat({ cwd: directory }),
        /Stop the current turn/,
    );
    await service.interruptChat();
    await until(service, (value) => value.thread.status === 'interrupted');
    await service.sendMessage('crash');
    const state = await until(
        service,
        (value) => value.status === 'disconnected',
    );
    assert.match(state.error, /Codex stopped/);
    assert.equal(state.thread.turnId, null);
    assert.deepEqual(state.requests, []);
    // Reconnecting may rejoin a turn still marked active by Codex. Do not
    // start a second turn just because it was disconnected before reconnect.
    await assert.rejects(service.sendMessage('retry'), /Stop the current turn/);
});

test('missing Codex executable is actionable and does not crash the app', async (t) => {
    const { directory } = await fixture(t);
    const service = await createCodexService({
        statePath: join(directory, 'missing.json'),
        processFactory: (handlers) =>
            createCodexProcess({
                ...handlers,
                executable: join(directory, 'missing-codex'),
            }),
    });
    t.after(() => service.dispose());
    await assert.rejects(service.connectCodex(), /Codex was not found/);
    assert.equal((await service.getCodexState()).status, 'disconnected');
});

test('browser chat transport streams state and blocks cross-origin Codex execution', async (t) => {
    const { service, directory } = await fixture(t);
    const server = createBackendServer(service);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => {
        server.closeAllConnections();
        server.close();
    });
    const url = `http://127.0.0.1:${server.address().port}`;
    const headers = {
        'X-Junior-Mode-Client': 'web',
        'Content-Type': 'application/json',
    };
    assert.equal(
        (
            await fetch(`${url}/api/codex/chats`, {
                method: 'POST',
                headers: { ...headers, Origin: 'https://other.example' },
                body: JSON.stringify({ cwd: directory }),
            })
        ).status,
        403,
    );
    assert.equal((await fetch(`${url}/api/codex/events`)).status, 403);
    const controller = new AbortController();
    t.after(() => controller.abort());
    const response = await fetch(`${url}/api/codex/events`, {
        headers,
        signal: controller.signal,
    });
    const reader = response.body.getReader();
    const initial = await reader.read();
    assert.match(
        new TextDecoder().decode(initial.value),
        /"status":"disconnected"/,
    );
    const projectResponse = await fetch(`${url}/api/codex/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ cwd: directory }),
    });
    assert.equal(projectResponse.status, 200);
    const projectId = (await projectResponse.json()).project.id;
    assert.equal(
        (
            await fetch(`${url}/api/codex/projects`, {
                method: 'POST',
                headers: { ...headers, Origin: 'https://other.example' },
                body: JSON.stringify({ cwd: directory }),
            })
        ).status,
        403,
    );
    const started = await fetch(`${url}/api/codex/chats`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ projectId }),
    });
    assert.equal(started.status, 200);
    assert.equal((await started.json()).thread.cwd, directory);
    controller.abort();
});

test('projects persist independently, deduplicate canonical folders, and scope every new chat', async (t) => {
    const { service, directory, create } = await fixture(t);
    const alpha = join(directory, 'Alpha');
    const beta = join(directory, 'Beta');
    await mkdir(alpha);
    await mkdir(beta);
    await symlink(alpha, join(directory, 'alias'), 'dir');
    await assert.rejects(service.addProject({ cwd: 'relative' }), /absolute/);
    await assert.rejects(
        service.addProject({ cwd: join(directory, 'missing') }),
    );
    await writeFile(join(directory, 'file'), 'not a directory');
    await assert.rejects(
        service.addProject({ cwd: join(directory, 'file') }),
        /directory/,
    );
    let { state } = await service.addProject({ cwd: alpha });
    const alphaId = state.projects[0].id;
    ({ state } = await service.addProject({ cwd: join(directory, 'alias') }));
    assert.equal(state.projects.length, 1);
    assert.equal(state.projects[0].id, alphaId);
    ({ state } = await service.addProject({ cwd: beta }));
    const betaId = state.projects[1].id;
    assert.equal(
        state.status,
        'disconnected',
        'Adding a project does not require Codex',
    );
    assert.equal(state.threads.length, 0);
    service.dispose();

    const restored = await create();
    assert.deepEqual((await restored.getCodexState()).projects, state.projects);
    await assert.rejects(
        restored.startChat({ projectId: 'missing' }),
        /existing project/,
    );
    await assert.rejects(
        restored.startChat({ projectId: alphaId, cwd: beta }),
        /does not match/,
    );
    await restored.startChat({ projectId: alphaId });
    await restored.startChat({ projectId: betaId });
    state = await restored.startChat({ projectId: alphaId });
    assert.deepEqual(
        state.threads.map((thread) => [thread.projectId, thread.cwd]),
        [
            [alphaId, alpha],
            [betaId, beta],
            [alphaId, alpha],
        ],
    );
    const betaChat = state.threads.find(
        (thread) => thread.projectId === betaId,
    );
    state = await restored.openChat(betaChat.id);
    assert.equal(state.thread.projectId, betaId);
    assert.equal(state.thread.cwd, beta);
    const requests = (
        await readFile(join(directory, 'codex.json.requests'), 'utf8')
    )
        .trim()
        .split('\n')
        .map(JSON.parse);
    assert.deepEqual(
        requests
            .filter((request) => request.method === 'thread/start')
            .map((request) => request.params.cwd),
        [alpha, beta, alpha],
    );
    await rm(beta, { recursive: true });
    await assert.rejects(restored.startChat({ projectId: betaId }));
    restored.dispose();
    const final = await create();
    assert.deepEqual(
        (await final.getCodexState()).projects.map((project) => project.id),
        [alphaId, betaId],
    );
    assert.equal((await final.getCodexState()).threads.length, 3);
});

test('legacy chat indexes migrate into stable projects without losing history or missing folders', async (t) => {
    const { service, directory, create } = await fixture(t);
    const initial = await service.startChat({ cwd: directory });
    const chatId = initial.thread.id;
    service.dispose();
    const legacy = initial.threads.map((thread) => {
        const saved = { ...thread };
        delete saved.projectId;
        return saved;
    });
    const alias = join(directory, 'repository-alias');
    await symlink(directory, alias, 'dir');
    legacy.push({ ...legacy[0], id: 'same-project-chat', cwd: alias });
    legacy.push({
        ...legacy[0],
        id: 'missing-folder-chat',
        cwd: join(directory, 'no-longer-present'),
    });
    await rm(join(directory, 'junior-mode.sqlite'));
    await writeFile(join(directory, 'chats.json'), JSON.stringify(legacy));
    const migrated = await create();
    const state = await migrated.getCodexState();
    assert.equal(state.projects.length, 2);
    assert.deepEqual(
        state.threads.map((thread) => thread.id),
        [chatId, 'same-project-chat', 'missing-folder-chat'],
    );
    assert.equal(state.threads[0].projectId, state.threads[1].projectId);
    assert.equal((await migrated.openChat(chatId)).thread.id, chatId);
    assert.deepEqual(
        JSON.parse(await readFile(join(directory, 'chats.json'), 'utf8')),
        legacy,
    );
    migrated.dispose();
    const reopened = await create();
    assert.deepEqual((await reopened.getCodexState()).projects, state.projects);
    assert.deepEqual((await reopened.getCodexState()).threads, state.threads);
});

test('a failed project save leaves no phantom project in memory', async (t) => {
    const { service, directory } = await fixture(t);
    const db = new DatabaseSync(join(directory, 'junior-mode.sqlite'));
    t.after(() => db.close());
    db.exec(
        "CREATE TRIGGER reject_project BEFORE INSERT ON projects BEGIN SELECT RAISE(ABORT, 'Disk failure fixture'); END",
    );
    await assert.rejects(service.addProject({ cwd: directory }));
    assert.deepEqual((await service.getCodexState()).projects, []);
});

test('project creation only creates folders when explicitly requested', async (t) => {
    const { service, directory } = await fixture(t);
    const cwd = join(directory, 'New project');
    await assert.rejects(service.addProject({ cwd }));
    const added = await service.addProject({ cwd, create: true });
    assert.equal(added.project.cwd, cwd);
    assert.equal(added.state.projects.length, 1);
    assert.equal(
        (await service.addProject({ cwd, create: true })).project.id,
        added.project.id,
    );
});
