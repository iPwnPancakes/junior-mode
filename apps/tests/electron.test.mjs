import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { _electron as electron } from 'playwright';

const require = createRequire(
    new URL('../desktop/package.json', import.meta.url),
);

test(
    'the desktop renderer connects through IPC and the main process calls Laravel',
    { timeout: 45000 },
    async (t) => {
        const directory = await mkdtemp(join(tmpdir(), 'junior-electron-'));
        let application;
        const requests = [];
        const platform = createServer((request, response) => {
            requests.push(request.url);
            response.setHeader('Content-Type', 'application/json');
            response.end(
                JSON.stringify({
                    service: 'junior-mode',
                    api_version: 1,
                    status: 'ok',
                }),
            );
        });
        platform.listen(0, '127.0.0.1');
        await once(platform, 'listening');
        t.after(async () => {
            if (application) {
                await application.close();
            }

            platform.closeAllConnections();
            await new Promise((done) => platform.close(done));
            await rm(directory, { recursive: true, force: true });
        });
        const packaged = process.env.ELECTRON_TEST_EXECUTABLE;
        application = await electron.launch({
            executablePath: packaged ? resolve(packaged) : require('electron'),
            args: [
                ...(packaged ? [] : [resolve('desktop')]),
                `--user-data-dir=${directory}`,
            ],
            env: { ...process.env, JUNIOR_RENDERER_URL: '' },
            timeout: 15000,
        });
        const page = await application.firstWindow();
        const errors = [];
        const rendererRequests = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('request', (request) => rendererRequests.push(request.url()));
        const platformUrl = `http://127.0.0.1:${platform.address().port}`;
        await page.getByLabel('Platform address').fill(platformUrl);
        await page
            .getByRole('button', { name: 'Connect', exact: true })
            .click();
        await page
            .getByRole('status')
            .filter({ hasText: /^Connected$/ })
            .waitFor();
        assert.deepEqual(requests, ['/api/v1/health']);
        assert.equal(
            rendererRequests.some((url) => url.startsWith('http')),
            false,
        );
        assert.equal(
            await page.evaluate(() => typeof globalThis.window.require),
            'undefined',
        );
        assert.equal(
            await page.evaluate(
                () => typeof globalThis.window.juniorMode.connectPlatform,
            ),
            'function',
        );

        await page.reload();
        await page
            .getByRole('button', { name: 'Check connection', exact: true })
            .click();
        await page
            .getByRole('status')
            .filter({ hasText: /^Connected$/ })
            .waitFor();
        await page
            .getByRole('button', { name: 'Disconnect', exact: true })
            .click();
        await page
            .getByRole('status')
            .filter({ hasText: /^Not connected$/ })
            .waitFor();
        assert.deepEqual(errors, []);
    },
);
