import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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
            env: {
                ...process.env,
                JUNIOR_RENDERER_URL: '',
                JUNIOR_CODEX_PATH: join(directory, 'missing-codex'),
            },
            timeout: 15000,
        });
        const page = await application.firstWindow();
        const errors = [];
        const rendererRequests = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('request', (request) => rendererRequests.push(request.url()));
        await page.getByRole('tab', { name: 'Settings', exact: true }).click();
        await page
            .getByRole('tab', { name: 'Learning platform', exact: true })
            .click();
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
        await page.getByRole('tab', { name: 'Settings', exact: true }).click();
        await page
            .getByRole('tab', { name: 'Learning platform', exact: true })
            .click();
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

test(
    'desktop chat streams Codex, handles approvals, stops turns and restores history',
    { timeout: 45000, skip: process.platform === 'win32' },
    async (t) => {
        const directory = await mkdtemp(
            join(tmpdir(), 'junior-codex-electron-'),
        );
        const executable = join(directory, 'codex-fixture');
        const fixture = new URL(
            '../backend/tests/fixtures/codex-server.mjs',
            import.meta.url,
        ).href;
        await writeFile(
            executable,
            `#!/usr/bin/env node\nimport(${JSON.stringify(fixture)});\n`,
            { mode: 0o700 },
        );
        const packaged = process.env.ELECTRON_TEST_EXECUTABLE;
        let application;
        t.after(async () => {
            if (application) await application.close();
            await rm(directory, { recursive: true, force: true });
        });
        async function launch() {
            application = await electron.launch({
                executablePath: packaged
                    ? resolve(packaged)
                    : require('electron'),
                args: [
                    ...(packaged ? [] : [resolve('desktop')]),
                    `--user-data-dir=${join(directory, 'user-data')}`,
                ],
                env: {
                    ...process.env,
                    JUNIOR_RENDERER_URL: '',
                    JUNIOR_CODEX_PATH: executable,
                    JUNIOR_CODEX_FIXTURE_STATE: join(directory, 'codex.json'),
                },
            });
            return application.firstWindow();
        }
        let page = await launch();
        // Startup connects without a renderer button or a chat request.
        await page.waitForFunction(async () => {
            const state = await globalThis.window.juniorMode.getCodexState();
            return state.status === 'ready' && Boolean(state.account);
        });

        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const repository = join(directory, 'Project Alpha');
        await mkdir(repository);
        const repositoryTrigger = page.getByRole('combobox', {
            name: 'Repository',
            exact: true,
        });
        await repositoryTrigger.click();
        const picker = page.getByRole('combobox', {
            name: 'Folder path',
            exact: true,
        });
        await picker.fill(join(directory, 'Pro'));
        await page.getByRole('option', { name: 'Project Alpha' }).waitFor();
        await picker.press('Enter');
        await page.getByText('No matching folders.', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Use this folder' }).click();
        assert.equal(await repositoryTrigger.innerText(), repository);
        await page
            .locator('.chat-setup')
            .getByRole('button', { name: 'New chat', exact: true })
            .click();
        // App-created chats always request coaching, even without an opt-in.
        await page
            .getByRole('alert')
            .filter({ hasText: 'Install or update the coaching plugin' })
            .waitFor();
        assert.equal(
            (
                await page.evaluate(() =>
                    globalThis.window.juniorMode.getCodexState(),
                )
            ).threads.length,
            0,
        );
        assert.equal(
            await page
                .getByLabel('Enable coaching for this enrolled repository')
                .count(),
            0,
        );
        // Seed a legacy plain thread to test transport without a live platform.
        await page.evaluate(
            (cwd) =>
                globalThis.window.juniorMode.startChat({
                    cwd,
                    coaching: false,
                }),
            repository,
        );
        await page
            .locator('.chat-link')
            .filter({ hasText: 'New chat' })
            .click();
        await page.getByLabel('Message Codex').fill('approve');
        await page.getByRole('button', { name: 'Send message' }).click();
        await page.getByRole('button', { name: 'Allow once' }).click();
        await page.getByText('Decision: accept', { exact: true }).waitFor();
        await page.getByLabel('Message Codex').fill('question');
        await page.getByRole('button', { name: 'Send message' }).click();
        await page.getByLabel('Which approach?').fill('Small');
        await page.getByRole('button', { name: 'Send answer' }).click();
        await page.getByText('Answer: Small', { exact: true }).waitFor();
        await page.getByLabel('Message Codex').fill('wait');
        await page.getByRole('button', { name: 'Send message' }).click();
        await page.getByRole('button', { name: 'Stop', exact: true }).click();
        await page.getByText('Stopped', { exact: true }).waitFor();
        await application.close();
        page = await launch();
        await page.locator('.chat-link').filter({ hasText: 'approve' }).click();
        await page.getByText('Decision: accept', { exact: true }).waitFor();
        await page.getByText('Stopped', { exact: true }).waitFor();
        assert.deepEqual(errors, []);
    },
);
