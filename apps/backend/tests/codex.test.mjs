import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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
    const started = await fetch(`${url}/api/codex/chats`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ cwd: directory }),
    });
    assert.equal(started.status, 200);
    assert.equal((await started.json()).thread.cwd, directory);
    controller.abort();
});
