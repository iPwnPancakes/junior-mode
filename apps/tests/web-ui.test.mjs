import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

let vite;
let browser;
let url;
before(async () => {
    vite = await createServer({
        root: fileURLToPath(new URL('../web/', import.meta.url)),
        configFile: fileURLToPath(
            new URL('../web/vite.config.ts', import.meta.url),
        ),
        logLevel: 'silent',
        server: { host: '127.0.0.1', port: 0, strictPort: false, open: false },
    });
    await vite.listen();
    url = `http://127.0.0.1:${vite.httpServer.address().port}`;
    browser = await chromium.launch();
});
after(async () => {
    await browser?.close();
    await vite?.close();
});

async function fixture(t, history = false) {
    const page = await browser.newPage({
        viewport: { width: 1120, height: 700 },
    });
    t.after(() => page.close());
    const errors = [];
    const calls = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const state = {
        instanceId: 'ui-test',
        host: 'fixture',
        revision: 0,
        status: 'ready',
        account: 'Learner',
        thread: null,
        projects: [],
        threads: [],
        requests: [],
        error: null,
    };
    if (history)
        state.threads = [
            {
                projectId: 'project-1',
                id: 'chat-1',
                title: 'Explain the repo',
                cwd: '/projects/one',
                updatedAt: '2026-09-25T10:00:00Z',
            },
            {
                projectId: 'project-2',
                id: 'chat-2',
                title: 'Build a feature',
                cwd: '/projects/two',
                updatedAt: '2026-09-25T11:00:00Z',
            },
        ];
    if (history)
        state.projects = [
            { id: 'project-1', name: 'one', cwd: '/projects/one' },
            { id: 'project-2', name: 'two', cwd: '/projects/two' },
        ];
    // Keep the event stream open like the real backend; a fulfilled finite
    // response would simulate a disconnect and correctly disable the composer.
    await page.addInitScript((snapshot) => {
        const originalFetch = globalThis.fetch.bind(globalThis);
        globalThis.fetch = (input, init) => {
            if (input === '/api/codex/events') {
                const stream = new ReadableStream({
                    start(controller) {
                        controller.enqueue(
                            new TextEncoder().encode(
                                `data: ${JSON.stringify(snapshot)}\n\n`,
                            ),
                        );
                        init?.signal?.addEventListener(
                            'abort',
                            () => controller.close(),
                            { once: true },
                        );
                    },
                });
                return Promise.resolve(
                    new Response(stream, {
                        headers: { 'Content-Type': 'text/event-stream' },
                    }),
                );
            }
            return originalFetch(input, init);
        };
    }, state);
    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        const body = request.method() === 'GET' ? null : request.postDataJSON();
        calls.push({ path, body });
        if (path === '/api/codex/events') {
            return route.fulfill({
                contentType: 'text/event-stream',
                body: `data: ${JSON.stringify(state)}\n\n`,
            });
        }
        if (path === '/api/directories') {
            const directory = body.path.startsWith('~')
                ? '/projects'
                : body.path.replace(/\/$/, '') || '/projects';
            const partial = directory === '/projects/Pro';
            const missing = directory === '/projects/New repository';
            const home = directory === '/projects' || partial;
            const entries = home
                ? Array.from({ length: 24 }, (_, index) => {
                      const name = `Project ${String(index).padStart(2, '0')}`;
                      return { name, path: '/projects/' + name };
                  })
                : [];
            if (home && body.showHidden)
                entries.unshift({
                    name: '.private',
                    path: '/projects/.private',
                });
            return route.fulfill({
                json: {
                    directory: partial || missing ? '/projects' : directory,
                    currentPath: partial || missing ? null : directory,
                    parentPath: '/',
                    home: '/projects',
                    separator: '/',
                    entries,
                    truncated: false,
                },
            });
        }
        if (path === '/api/codex/projects') {
            if (!state.projects.some((project) => project.cwd === body.cwd)) {
                state.projects.push({
                    id: 'project-added',
                    name: body.cwd.split('/').pop(),
                    cwd: body.cwd,
                });
                state.revision++;
            }
            return route.fulfill({
                json: {
                    state,
                    project: state.projects.find(
                        (project) => project.cwd === body.cwd,
                    ),
                },
            });
        }
        if (path === '/api/codex/open') {
            state.revision++;
            state.thread = {
                ...state.threads.find((thread) => thread.id === body.id),
                status: 'idle',
                turnId: null,
                items: [
                    {
                        id: 'message-1',
                        type: 'agentMessage',
                        text: 'What would you like to build?',
                        status: 'completed',
                    },
                ],
            };
            return route.fulfill({ json: state });
        }
        if (path === '/api/codex/message') {
            state.revision++;
            state.thread.items.push({
                id: 'message-2',
                type: 'userMessage',
                text: body.text,
                status: 'completed',
            });
            return route.fulfill({ json: state });
        }
        if (path === '/api/codex/chats')
            return route.fulfill({
                status: 400,
                json: { error: 'Coaching setup required.' },
            });
        if (path === '/api/connection')
            return route.fulfill({
                json: {
                    platformUrl: body?.url || null,
                    status: body ? 'connected' : 'not-configured',
                    checkedAt: null,
                    message: null,
                },
            });
        if (path === '/api/coaching-plugin')
            return route.fulfill({ json: { installed: false, version: '1' } });
        if (path === '/api/coaching-plugin/install')
            return route.fulfill({ json: { installed: true, version: '1' } });
        if (
            path === '/api/authorization' ||
            path === '/api/authorization/begin'
        )
            return route.fulfill({
                json: {
                    status: body ? 'authorized' : 'signed-out',
                    learner: 'Learner',
                    client: body?.name || null,
                },
            });
        return route.fulfill({ json: state });
    });
    await page.goto(url);
    return { page, calls, errors };
}

test('folder command picker supports keyboard, stable hover, hidden folders, dismissal and coaching startup', async (t) => {
    const { page, calls, errors } = await fixture(t);
    const trigger = page
        .locator('.chat-sidebar')
        .getByRole('button', { name: 'Add project', exact: true });
    await trigger.click();
    const input = page.getByRole('combobox', {
        name: 'Project folder path',
        exact: true,
    });
    await input.fill('/projects/Pro');
    await page.getByRole('option', { name: 'Project 00' }).waitFor();
    await page.waitForFunction(
        () =>
            globalThis.document
                .querySelector('[data-slot=dialog-content]')
                ?.getBoundingClientRect().height > 100,
    );
    const popup = await page
        .locator('[data-slot=dialog-content]')
        .boundingBox();
    assert.ok(
        popup.y >= 0 && popup.y + popup.height <= 701,
        'Popup must fit in the viewport',
    );
    const scroll = await page
        .locator('.chat-setup')
        .evaluate((el) => el.scrollTop);
    for (const name of ['Project 01', 'Project 02', 'Project 01']) {
        const row = page.getByRole('option', { name });
        await row.hover();
        assert.equal(await row.getAttribute('aria-selected'), 'true');
        assert.equal(
            await row.evaluate((el) => globalThis.getComputedStyle(el).filter),
            'none',
        );
    }
    assert.equal(
        await page.locator('.chat-setup').evaluate((el) => el.scrollTop),
        scroll,
    );
    for (let i = 0; i < 12; i++) await input.press('ArrowDown');
    assert.equal(
        await page
            .getByRole('option', { name: 'Project 13' })
            .getAttribute('aria-selected'),
        'true',
    );
    assert.ok(
        await page.locator('[cmdk-list]').evaluate((el) => el.scrollTop > 0),
    );
    await input.press('Tab');
    await page.getByText('No matching folders.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByRole('option', { name: 'Project 00' }).waitFor();
    await page.getByRole('checkbox', { name: 'Show hidden' }).check();
    await page.getByRole('option', { name: '.private' }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await trigger.click();
    await page.getByRole('option', { name: 'Project 00' }).waitFor();
    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Add project', exact: true })
        .click();
    await page
        .getByText('A new coaching chat in projects.', { exact: true })
        .waitFor();
    assert.equal(
        calls.find((call) => call.path === '/api/codex/projects').body.cwd,
        '/projects',
    );
    await page
        .locator('.chat-setup')
        .getByRole('button', { name: 'New chat', exact: true })
        .click();
    await page
        .getByRole('alert')
        .filter({ hasText: 'Coaching setup required.' })
        .waitFor();
    assert.deepEqual(
        calls
            .filter((call) => call.path === '/api/codex/chats')
            .map((call) => call.body),
        [{ projectId: 'project-added', coaching: true }],
    );
    assert.deepEqual(errors, []);
});

test('platform tabs, forms and authorization actions remain usable with shadcn controls', async (t) => {
    const { page, calls, errors } = await fixture(t);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Learning platform' }).click();
    await page.getByLabel('Platform address').fill('https://platform.example');
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    await page
        .getByRole('status')
        .filter({ hasText: /^Connected$/ })
        .waitFor();
    await page.getByLabel('Client name').fill('My desktop');
    await page
        .getByRole('button', { name: 'Authorize client', exact: true })
        .click();
    await page
        .getByRole('status')
        .filter({ hasText: 'Authorized as Learner (My desktop)' })
        .waitFor();
    await page
        .getByRole('button', { name: 'Install coaching plugin', exact: true })
        .click();
    await page
        .getByRole('button', { name: 'Reinstall coaching plugin', exact: true })
        .waitFor();
    assert.deepEqual(
        calls.find((call) => call.path === '/api/authorization/begin').body,
        { name: 'My desktop' },
    );
    await page
        .getByRole('button', { name: 'Back to chats', exact: true })
        .click();
    await page
        .getByRole('heading', { name: 'Start with a project', exact: true })
        .waitFor();
    assert.deepEqual(errors, []);
});

test('chat search, history selection and composer submit work with shadcn buttons and fields', async (t) => {
    const { page, calls, errors } = await fixture(t, true);
    await page.getByLabel('Search chats').fill('Build');
    await page
        .locator('.chat-link')
        .filter({ hasText: 'Build a feature' })
        .waitFor();
    assert.equal(await page.locator('.chat-link').count(), 1);
    await page.locator('.chat-link').click();
    await page
        .getByText('What would you like to build?', { exact: true })
        .waitFor();
    const composer = page.getByLabel('Message Codex');
    await composer.fill('Help me understand this code.');
    await page
        .getByRole('button', { name: 'Send message', exact: true })
        .click();
    await page
        .getByText('Help me understand this code.', { exact: true })
        .waitFor();
    assert.equal(await composer.inputValue(), '');
    assert.deepEqual(
        calls.find((call) => call.path === '/api/codex/message').body,
        { text: 'Help me understand this code.' },
    );
    assert.deepEqual(errors, []);
});

test('sidebar settings preserves chat drafts and supports back and Escape', async (t) => {
    const { page, calls, errors } = await fixture(t, true);
    assert.equal(
        await page.getByRole('button', { name: /Connect Codex/i }).count(),
        0,
    );
    await page.locator('.chat-link').first().click();
    await page.getByLabel('Message Codex').fill('Keep this draft');
    assert.equal(
        await page.getByRole('tab', { name: 'Settings', exact: true }).count(),
        0,
    );
    const settingsButton = page
        .locator('.sidebar-footer')
        .getByRole('button', { name: 'Settings', exact: true });
    const sidebar = await page.locator('.chat-sidebar').boundingBox();
    const settingsBounds = await settingsButton.boundingBox();
    assert.ok(
        settingsBounds.y > sidebar.y + sidebar.height - 140,
        'Settings stays at the bottom of the sidebar',
    );

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page
        .getByRole('heading', { name: 'Providers', exact: true })
        .waitFor();
    await page.getByText('Preview server · fixture', { exact: true }).waitFor();
    await page.getByText('Learner', { exact: true }).waitFor();
    await page
        .getByRole('button', { name: 'Reconnect Codex', exact: true })
        .click();
    assert.equal(
        calls.filter((call) => call.path === '/api/codex/connect').length,
        1,
    );
    await page
        .getByRole('button', { name: 'Back to chats', exact: true })
        .click();
    assert.equal(
        await page.getByLabel('Message Codex').inputValue(),
        'Keep this draft',
    );
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.route('**/api/codex/connect', (route) =>
        route.fulfill({
            status: 500,
            json: { error: 'Codex executable was not found.' },
        }),
    );
    await page
        .getByRole('button', { name: 'Reconnect Codex', exact: true })
        .click();
    await page
        .getByRole('alert')
        .filter({ hasText: 'Codex executable was not found.' })
        .waitFor();
    assert.equal(
        await page
            .getByRole('button', { name: 'Reconnect Codex', exact: true })
            .isEnabled(),
        true,
    );
    await page.keyboard.press('Escape');
    await page.getByLabel('Message Codex').waitFor();
    assert.equal(
        await page.getByLabel('Message Codex').inputValue(),
        'Keep this draft',
    );
    assert.deepEqual(errors, []);
});

test('flat chat cards show project context and the toolbar keeps new chats scoped', async (t) => {
    const { page, calls, errors } = await fixture(t, true);
    assert.equal(await page.locator('.chat-link').count(), 2);
    await page
        .locator('.chat-link')
        .filter({ hasText: 'Explain the repo' })
        .getByText('one', { exact: true })
        .waitFor();
    await page.getByLabel('Search chats').fill('two');
    assert.equal(await page.locator('.chat-link').count(), 1);
    await page.getByLabel('Search chats').fill('');
    await page.getByRole('button', { name: 'Projects', exact: true }).click();
    await page
        .getByRole('option', { name: 'New chat in two', exact: true })
        .click();
    await page
        .locator('.chat-setup')
        .getByText('/projects/two', { exact: true })
        .waitFor();
    await page
        .locator('.chat-setup')
        .getByRole('button', { name: 'New chat', exact: true })
        .click();
    await page
        .getByRole('alert')
        .filter({ hasText: 'Coaching setup required.' })
        .waitFor();
    assert.deepEqual(
        calls.filter((call) => call.path === '/api/codex/chats').at(-1).body,
        { projectId: 'project-2', coaching: true },
    );
    await page
        .locator('.sidebar-toolbar')
        .getByRole('button', { name: 'New chat', exact: true })
        .click();
    await page
        .locator('.chat-setup')
        .getByText('/projects/two', { exact: true })
        .waitFor();
    await page.getByRole('button', { name: 'Projects', exact: true }).click();
    await page
        .getByRole('option', { name: 'New chat in one', exact: true })
        .click();
    await page
        .locator('.chat-setup')
        .getByText('/projects/one', { exact: true })
        .waitFor();
    await page
        .getByRole('button', { name: 'Collapse sidebar', exact: true })
        .click();
    await page
        .getByRole('button', { name: 'Expand sidebar', exact: true })
        .click();
    assert.equal(await page.locator('.chat-link').count(), 2);
    assert.deepEqual(errors, []);
});

test('project picker preserves the chat, restores focus, and retries explicit folder creation', async (t) => {
    const { page, calls, errors } = await fixture(t, true);
    await page.locator('.chat-link').first().click();
    await page.getByLabel('Message Codex').fill('Keep this draft');
    const trigger = page
        .locator('.chat-sidebar')
        .getByRole('button', { name: 'Add project', exact: true });
    await trigger.click();
    const input = page.getByRole('combobox', {
        name: 'Project folder path',
        exact: true,
    });
    await input.waitFor();
    assert.equal(
        await input.evaluate((el) => el === globalThis.document.activeElement),
        true,
    );
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.waitForFunction(() =>
        globalThis.document.activeElement?.hasAttribute('data-project-create'),
    );
    assert.equal(
        await page.getByLabel('Message Codex').inputValue(),
        'Keep this draft',
    );
    await trigger.click();
    await input.fill('/projects/New repository');
    const submit = page.getByRole('button', {
        name: 'Create & add project',
        exact: true,
    });
    await submit.waitFor();
    let fail = true;
    await page.route('**/api/codex/projects', (route) => {
        if (fail) {
            fail = false;
            return route.fulfill({
                status: 400,
                json: { error: 'Permission denied.' },
            });
        }
        return route.fallback();
    });
    await submit.click();
    await page
        .getByRole('dialog')
        .getByRole('alert')
        .filter({ hasText: 'Permission denied.' })
        .waitFor();
    await input.press('Control+Enter');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page
        .getByText('A new coaching chat in New repository.', { exact: true })
        .waitFor();
    assert.deepEqual(
        calls.filter((call) => call.path === '/api/codex/projects').at(-1).body,
        { cwd: '/projects/New repository', create: true },
    );
    assert.deepEqual(errors, []);
});
