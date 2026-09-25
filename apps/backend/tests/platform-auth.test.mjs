import { openStorage } from '../src/storage.mjs';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createBackend } from '../src/index.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

async function fixture(t, credentialCodec) {
    const directory = await mkdtemp(join(tmpdir(), 'junior-platform-'));
    const calls = [];
    const token = `jm_${'a'.repeat(64)}`;
    let revoked = false,
        unavailable = false,
        enrolled = true,
        approved = false;
    const options = {
        credentialCodec,
        pluginCommand: async () => ({
            stdout: JSON.stringify({
                pluginId: 'junior-mode@junior-mode-desktop',
                installedPath: fileURLToPath(
                    new URL('../../../plugins/junior-mode', import.meta.url),
                ),
            }),
        }),
        settingsPath: join(directory, 'connection.json'),
        fetchImpl: async (url, init) => {
            if (unavailable) throw new TypeError('private network details');
            const body = init.body ? JSON.parse(init.body) : null;
            calls.push({ url, body });
            if (url.endsWith('/health'))
                return Response.json({
                    service: 'junior-mode',
                    api_version: 1,
                    status: 'ok',
                });
            if (url.endsWith('/client-authorizations'))
                return Response.json({
                    device_code: 'private-device-code',
                    user_code: 'AAAA-BBBB',
                    authorization_url:
                        'http://platform.test/codex/authorize/AAAA-BBBB',
                    expires_in: 600,
                });
            if (url.endsWith('/token'))
                return Response.json(
                    approved
                        ? { access_token: token }
                        : { status: 'authorization_pending' },
                );
            assert.equal(init.headers.Authorization, `Bearer ${token}`);
            if (revoked) return Response.json({}, { status: 401 });
            return Response.json({
                result: {
                    structuredContent:
                        body.params.name === 'identify-client'
                            ? {
                                  learner: { name: 'Lee' },
                                  client: { name: 'Desktop' },
                              }
                            : { enrolled, repository: { identity: 'repo-id' } },
                },
            });
        },
        codexProcessFactory: (handlers) => {
            calls.push({ processOptions: handlers });
            return {
                request: async (method) => {
                    if (method === 'turn/interrupt') throw new Error(token);
                    if (method === 'turn/start')
                        return { turn: { id: 'turn' } };
                    return method === 'account/read'
                        ? { account: { type: 'chatgpt' } }
                        : method === 'thread/start'
                          ? { thread: { id: 'thread' } }
                          : {};
                },
                notify() {},
                dispose() {
                    calls.push({ disposed: true });
                },
            };
        },
    };
    const backend = await createBackend(options);
    const storage = await openStorage({
        databasePath: join(directory, 'junior-mode.sqlite'),
    });
    t.after(async () => {
        backend.dispose();
        storage.close();
        await rm(directory, { recursive: true, force: true });
    });
    await backend.connectPlatform('http://platform.test');
    await backend.installCoachingPlugin();
    return {
        directory,
        storage,
        backend,
        options,
        calls,
        token,
        approve: () => (approved = true),
        revoke: () => (revoked = true),
        offline: () => (unavailable = true),
        unenroll: () => (enrolled = false),
    };
}

test('named authorization keeps credentials out of renderer state and settings and scopes Codex configuration', async (t) => {
    const f = await fixture(t);
    assert.equal(
        (await f.backend.getPlatformAuthorization()).status,
        'signed-out',
    );
    await assert.rejects(f.backend.checkPlatformAuthorization(), /Authorize/);
    assert.equal(
        (await f.backend.beginPlatformAuthorization('Desktop')).status,
        'pending',
    );
    assert.equal(
        (await f.backend.completePlatformAuthorization()).status,
        'pending',
    );
    f.approve();
    const auth = await f.backend.completePlatformAuthorization();
    assert.equal(auth.learner, 'Lee');
    assert.equal(auth.status, 'authorized');
    assert.ok(!JSON.stringify(auth).includes(f.token));
    assert.ok(!JSON.stringify(auth).includes('private-device-code'));
    assert.ok(
        !JSON.stringify(f.storage.getSetting('connection')).includes(f.token),
    );
    assert.equal(
        (await stat(join(f.directory, 'junior-mode.sqlite'))).mode & 0o777,
        0o600,
    );
    await f.backend.connectCodex();
    const config = f.calls.find((call) => call.processOptions).processOptions;
    assert.equal(config.env.JUNIOR_MODE_TOKEN, f.token);
    assert.equal(config.config['mcp_servers.junior-mode.enabled'], false);
    assert.ok(!JSON.stringify(config.config).includes(f.token));
    const restored = await createBackend(f.options);
    t.after(() => restored.dispose());
    assert.equal((await restored.checkPlatformAuthorization()).learner, 'Lee');
    await f.backend.disconnectPlatform();
    assert.equal(f.storage.getCredentials(), undefined);
});

test('enrollment is checked before coaching threads and rechecked before messages; unavailable and revoked access fail closed', async (t) => {
    const f = await fixture(t);
    await promisify(execFile)('git', ['init', f.directory]);
    await promisify(execFile)('git', [
        '-C',
        f.directory,
        'remote',
        'add',
        'origin',
        'https://user:secret@example.com/example/project.git?token=secret',
    ]);
    await f.backend.beginPlatformAuthorization('Desktop');
    f.approve();
    await f.backend.completePlatformAuthorization();
    const { project } = await f.backend.addProject({ cwd: f.directory });
    const state = await f.backend.startChat({
        projectId: project.id,
        coaching: true,
    });
    assert.equal(state.thread.projectId, project.id);
    assert.equal(state.thread.coaching, true);
    assert.equal(
        f.calls.find(
            (call) =>
                call.body?.params?.name === 'resolve-repository-enrollment',
        ).body.params.arguments.remote_url,
        'https://example.com/example/project.git',
    );
    f.unenroll();
    await assert.rejects(
        f.backend.sendMessage('private work item'),
        /not enrolled/,
    );
    assert.ok(!JSON.stringify(f.calls).includes('private work item'));
    f.revoke();
    await assert.rejects(f.backend.checkPlatformAuthorization(), /revoked/);
    assert.equal(
        (await f.backend.getPlatformAuthorization()).status,
        'revoked',
    );
    assert.equal(f.storage.getCredentials(), undefined);
    f.offline();
    await assert.rejects(
        f.backend.beginPlatformAuthorization('Desktop'),
        /unavailable/,
    );
});

test('browser authorization transport rejects cross-origin requests and never returns the exchanged token', async (t) => {
    const { createBackendServer } = await import('../src/http.mjs');
    const { once } = await import('node:events');
    const f = await fixture(t);
    const server = createBackendServer(f.backend);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => {
        server.closeAllConnections();
        server.close();
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const headers = {
        'X-Junior-Mode-Client': 'web',
        'Content-Type': 'application/json',
        Origin: origin,
    };
    for (const path of ['begin', 'complete', 'check']) {
        const response = await fetch(`${origin}/api/authorization/${path}`, {
            method: 'POST',
            headers: { ...headers, Origin: 'https://other.test' },
            body: '{}',
        });
        assert.equal(response.status, 403);
    }
    await fetch(`${origin}/api/authorization/begin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Desktop' }),
    });
    f.approve();
    const response = await fetch(`${origin}/api/authorization/complete`, {
        method: 'POST',
        headers,
        body: '{}',
    });
    const state = await response.json();
    assert.equal(state.status, 'authorized');
    assert.ok(!JSON.stringify(state).includes(f.token));
});

test('failed secure storage does not activate in-memory credentials', async (t) => {
    const f = await fixture(t);
    const backend = await createBackend({
        ...f.options,
        credentialCodec: {
            decrypt: () => {
                throw new Error('unavailable');
            },
            encrypt: () => {
                throw new Error('Secure storage unavailable');
            },
        },
    });
    t.after(() => backend.dispose());
    await backend.beginPlatformAuthorization('Desktop');
    f.approve();
    await assert.rejects(
        backend.completePlatformAuthorization(),
        /Secure storage/,
    );
    await assert.rejects(backend.checkPlatformAuthorization(), /Authorize/);
    assert.equal(f.storage.getCredentials(), undefined);
});

test('renderer-facing Codex errors redact previous credentials after disconnect', async (t) => {
    const f = await fixture(t);
    await f.backend.beginPlatformAuthorization('Desktop');
    f.approve();
    await f.backend.completePlatformAuthorization();
    await f.backend.disconnectPlatform();
    await f.backend.startChat({ cwd: f.directory });
    await f.backend.sendMessage('ordinary chat');
    await assert.rejects(
        f.backend.interruptChat(),
        (error) => error.message === '[redacted]',
    );
});

test('desktop credential payloads remain encrypted in SQLite and decrypt on restart', async (t) => {
    const codec = {
        encrypt: (value) => Buffer.from(value).map((byte) => byte ^ 0xa5),
        decrypt: (value) =>
            Buffer.from(value)
                .map((byte) => byte ^ 0xa5)
                .toString(),
    };
    const f = await fixture(t, codec);
    await f.backend.beginPlatformAuthorization('Desktop');
    f.approve();
    await f.backend.completePlatformAuthorization();
    const encrypted = f.storage.getCredentials();
    assert.ok(!encrypted.toString().includes(f.token));
    assert.equal(JSON.parse(codec.decrypt(encrypted)).token, f.token);
    const restarted = await createBackend(f.options);
    t.after(() => restarted.dispose());
    assert.equal((await restarted.checkPlatformAuthorization()).learner, 'Lee');
});
