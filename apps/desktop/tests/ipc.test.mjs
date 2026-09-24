import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createBackend } from '@junior-mode/backend';
import { registerBackendIpc } from '../ipc.mjs';
import { isRendererUrl, rendererLocation } from '../renderer-url.mjs';

test('IPC calls backend capabilities and rejects untrusted frames before side effects', async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'junior-ipc-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const requests = [];
    const backend = await createBackend({
        settingsPath: join(directory, 'connection.json'),
        fetchImpl: async (url) => {
            requests.push(url);

            return Response.json({
                service: 'junior-mode',
                api_version: 1,
                status: 'ok',
            });
        },
    });
    const handlers = new Map();
    const trustedFrame = {};
    registerBackendIpc(
        { handle: (name, handler) => handlers.set(name, handler) },
        backend,
        (event) => event === trustedFrame,
    );

    assert.throws(
        () =>
            handlers.get('junior-mode:connectPlatform')(
                {},
                'https://platform.example',
            ),
        /Untrusted/,
    );
    for (const method of [
        'getCodexState',
        'connectCodex',
        'startChat',
        'openChat',
        'sendMessage',
        'interruptChat',
        'respondToCodex',
    ]) {
        assert.throws(
            () => handlers.get(`junior-mode:${method}`)({}, {}),
            /Untrusted/,
        );
    }
    assert.equal((await backend.getCodexState()).status, 'disconnected');
    assert.deepEqual(requests, []);
    const connected = await handlers.get('junior-mode:connectPlatform')(
        trustedFrame,
        'https://platform.example',
    );
    assert.equal(connected.status, 'connected');
    assert.deepEqual(requests, ['https://platform.example/api/v1/health']);
    assert.equal(
        (await handlers.get('junior-mode:getConnection')(trustedFrame))
            .platformUrl,
        'https://platform.example',
    );
    assert.equal(
        (await handlers.get('junior-mode:disconnectPlatform')(trustedFrame))
            .status,
        'not-configured',
    );
    assert.equal(handlers.has('junior-mode:fetch'), false);
});

test('packaged desktop always uses bundled UI and ignores remote dev overrides', () => {
    const bundled = rendererLocation([], {}, true);
    assert.match(bundled, /\/renderer\/index.html$/);
    assert.equal(
        rendererLocation(
            ['--url=https://evil.example'],
            { JUNIOR_RENDERER_URL: 'https://evil.example' },
            true,
        ),
        bundled,
    );
    assert.equal(
        rendererLocation(['--url=http://localhost:5173'], {}, false),
        'http://localhost:5173/',
    );
});

test('only the configured renderer document may use IPC or navigate', () => {
    const renderer = 'http://localhost:5173/';
    assert.equal(isRendererUrl(`${renderer}#section`, renderer), true);

    for (const url of [
        'http://localhost:5173/other',
        'http://localhost:8000/',
        'http://localhost.evil.test:5173/',
        'http://user@localhost:5173/',
        'file:///tmp/other.html',
    ]) {
        assert.equal(isRendererUrl(url, renderer), false);
    }
});
