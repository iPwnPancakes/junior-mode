import { openStorage } from '../src/storage.mjs';
import { dirname } from 'node:path';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createBackendServer } from '../src/http.mjs';
import { createBackend } from '../src/index.mjs';
import { serverUrl } from '../src/server-url.mjs';

async function fixture(t, handler) {
    const directory = await mkdtemp(join(tmpdir(), 'junior-backend-'));
    const settingsPath = join(directory, 'connection.json');
    const requests = [];
    const platform = createServer((request, response) => {
        requests.push(request.url);

        if (handler) {
            handler(request, response);
        } else {
            response.setHeader('Content-Type', 'application/json');
            response.end(
                JSON.stringify({
                    service: 'junior-mode',
                    api_version: 1,
                    status: 'ok',
                }),
            );
        }
    });
    platform.listen(0, '127.0.0.1');
    await once(platform, 'listening');
    t.after(async () => {
        platform.closeAllConnections();
        await new Promise((resolve) => platform.close(resolve));
        await rm(directory, { recursive: true, force: true });
    });

    return {
        backend: await createBackend({ settingsPath }),
        settingsPath,
        platformUrl: `http://127.0.0.1:${platform.address().port}`,
        requests,
    };
}

test('the backend checks Laravel over HTTP and persists only its platform origin', async (t) => {
    const { backend, settingsPath, platformUrl, requests } = await fixture(t);
    assert.equal((await backend.getConnection()).status, 'not-configured');
    const connection = await backend.connectPlatform(platformUrl);
    assert.equal(connection.status, 'connected');
    assert.ok(connection.checkedAt);
    assert.deepEqual(requests, ['/api/v1/health']);
    const storage = await openStorage({
        databasePath: join(dirname(settingsPath), 'junior-mode.sqlite'),
    });
    t.after(() => storage.close());
    assert.deepEqual(storage.getSetting('connection'), { platformUrl });
    await assert.rejects(readFile(settingsPath), { code: 'ENOENT' });

    const restarted = await createBackend({ settingsPath });
    assert.equal((await restarted.getConnection()).status, 'unchecked');
    assert.equal((await restarted.checkPlatform()).status, 'connected');
    await restarted.disconnectPlatform();
    assert.equal((await restarted.getConnection()).status, 'not-configured');
    assert.equal(
        (await (await createBackend({ settingsPath })).getConnection())
            .platformUrl,
        null,
    );
});

test('rejects unrelated or incompatible platforms without saving the address', async (t) => {
    const { backend, settingsPath, platformUrl } = await fixture(
        t,
        (_request, response) => {
            response.end(
                JSON.stringify({
                    service: 'other',
                    api_version: 1,
                    status: 'ok',
                }),
            );
        },
    );
    assert.equal(
        (await backend.connectPlatform(platformUrl)).status,
        'unavailable',
    );
    await assert.rejects(readFile(settingsPath), { code: 'ENOENT' });
});

test('does not follow platform redirects to arbitrary destinations', async (t) => {
    const { backend, platformUrl, requests } = await fixture(
        t,
        (_request, response) => {
            response.writeHead(302, { Location: '/unexpected' });
            response.end();
        },
    );
    assert.equal(
        (await backend.connectPlatform(platformUrl)).status,
        'unavailable',
    );
    assert.deepEqual(requests, ['/api/v1/health']);
});

test('browser transport invokes the same backend and rejects cross-origin writes', async (t) => {
    const { backend, platformUrl, requests } = await fixture(t);
    const server = createBackendServer(backend);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${server.address().port}`;
    t.after(async () => {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
    });
    const headers = {
        'X-Junior-Mode-Client': 'web',
        'Content-Type': 'application/json',
        Origin: origin,
    };
    const response = await fetch(`${origin}/api/connection`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ url: platformUrl }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'connected');
    assert.deepEqual(requests, ['/api/v1/health']);

    for (const blockedHeaders of [
        {},
        { ...headers, Origin: 'https://evil.example' },
    ]) {
        assert.equal(
            (
                await fetch(`${origin}/api/connection`, {
                    method: 'DELETE',
                    headers: blockedHeaders,
                })
            ).status,
            403,
        );
    }

    assert.equal((await backend.getConnection()).status, 'connected');
    const disconnected = await fetch(`${origin}/api/connection`, {
        method: 'DELETE',
        headers,
    });
    assert.equal((await disconnected.json()).status, 'not-configured');
    assert.equal(
        (
            await fetch(`${origin}/api/connection`, {
                method: 'PUT',
                headers,
                body: '{bad',
            })
        ).status,
        400,
    );
    assert.equal(
        (
            await fetch(`${origin}/api/connection`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ url: 'x'.repeat(17000) }),
            })
        ).status,
        413,
    );
    assert.equal(
        (await fetch(`${origin}/api/anything`, { headers })).status,
        404,
    );
});

test('accepts direct HTTP/HTTPS origins, but never credentials or executable URLs', () => {
    assert.equal(
        serverUrl('https://junior.example/'),
        'https://junior.example',
    );
    assert.equal(serverUrl('http://localhost:8000'), 'http://localhost:8000');
    assert.equal(serverUrl('http://[::1]:8000'), 'http://[::1]:8000');
    for (const origin of [
        'http://192.168.0.54:8000',
        'http://100.87.148.87:8000',
        'http://[fd7a:115c:a1e0::1]:8000',
        'http://t3.example:8000',
    ]) {
        assert.equal(serverUrl(origin), origin);
    }

    for (const value of [
        null,
        {},
        'invalid',
        'file:///tmp/app',
        'javascript:alert(1)',
        'https://user:secret@example.com',
        'https://example.com/path',
        'https://example.com/?token=secret',
        'https://example.com/#token',
    ]) {
        assert.throws(() => serverUrl(value));
    }
});
