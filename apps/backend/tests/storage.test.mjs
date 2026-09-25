import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { applicationDataDirectory, openStorage } from '../src/storage.mjs';

async function fixture(t) {
    const directory = await mkdtemp(join(tmpdir(), 'junior-sqlite-'));
    const stores = [];
    t.after(async () => {
        stores.forEach((store) => store.close());
        await rm(directory, { recursive: true, force: true });
    });
    const databasePath = join(directory, 'data', 'junior-mode.sqlite');
    return {
        directory,
        databasePath,
        async open() {
            const store = await openStorage({
                databasePath,
                legacyDirectory: directory,
            });
            stores.push(store);
            return store;
        },
    };
}

test('uses OS-standard data locations and explicit overrides', () => {
    assert.equal(
        applicationDataDirectory({
            platform: 'linux',
            home: '/home/learner',
            env: {},
        }),
        '/home/learner/.local/share/junior-mode/browser',
    );
    assert.equal(
        applicationDataDirectory({
            platform: 'linux',
            home: '/home/learner',
            env: { XDG_DATA_HOME: '/data' },
        }),
        '/data/junior-mode/browser',
    );
    assert.equal(
        applicationDataDirectory({
            platform: 'linux',
            home: '/home/learner',
            env: { XDG_DATA_HOME: 'relative' },
        }),
        '/home/learner/.local/share/junior-mode/browser',
    );
    assert.equal(
        applicationDataDirectory({
            platform: 'darwin',
            home: '/Users/learner',
            env: {},
        }),
        '/Users/learner/Library/Application Support/Junior Mode/browser',
    );
    assert.equal(
        applicationDataDirectory({
            platform: 'win32',
            home: 'C:\\Users\\learner',
            env: { LOCALAPPDATA: 'C:\\Users\\learner\\AppData\\Local' },
        }),
        'C:\\Users\\learner\\AppData\\Local\\Junior Mode\\browser',
    );
    assert.equal(
        applicationDataDirectory({ env: { JUNIOR_DATA_DIR: '/custom' } }),
        '/custom',
    );
    assert.throws(
        () =>
            applicationDataDirectory({ env: { JUNIOR_DATA_DIR: 'relative' } }),
        /absolute/,
    );
});

test('imports settings, project relationships, plugin state, and encrypted credential bytes once', async (t) => {
    const f = await fixture(t);
    const index = {
        version: 2,
        projects: [{ id: 'p', name: 'Project', cwd: f.directory }],
        threads: [
            {
                id: 'c',
                projectId: 'p',
                cwd: f.directory,
                title: 'Saved chat',
                updatedAt: '2026-09-25T12:00:00Z',
                coaching: true,
            },
        ],
    };
    const encrypted = Buffer.from([0, 255, 31, 90, 1]);
    await writeFile(
        join(f.directory, 'connection.json'),
        JSON.stringify({ platformUrl: 'https://platform.example' }),
    );
    await writeFile(
        join(f.directory, 'coaching-plugin.json'),
        JSON.stringify({ path: '/plugin/cache' }),
    );
    await writeFile(join(f.directory, 'platform-credentials.json'), encrypted);
    await writeFile(
        join(f.directory, 'codex-chats.json'),
        JSON.stringify(index),
    );
    const storage = await f.open();
    assert.deepEqual(storage.getSetting('connection'), {
        platformUrl: 'https://platform.example',
    });
    assert.deepEqual(storage.getSetting('coaching-plugin'), {
        path: '/plugin/cache',
    });
    assert.deepEqual(storage.getCredentials(), encrypted);
    assert.deepEqual(storage.loadChats(), {
        projects: index.projects,
        threads: index.threads,
    });
    assert.equal((await stat(f.databasePath)).mode & 0o777, 0o600);
    assert.equal(
        (await readFile(f.databasePath)).subarray(0, 16).toString(),
        'SQLite format 3\0',
    );
    const db = new DatabaseSync(f.databasePath);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
    assert.equal(
        db
            .prepare(
                'SELECT COUNT(*) AS count FROM chats JOIN projects ON chats.project_id=projects.id',
            )
            .get().count,
        1,
    );
    db.close();
    storage.clearCredentials();
    storage.removeSetting('connection');
    storage.saveChats({ projects: [], threads: [] });
    storage.close();
    const reopened = await f.open();
    assert.equal(reopened.getCredentials(), undefined);
    assert.equal(reopened.getSetting('connection'), undefined);
    assert.deepEqual(reopened.loadChats(), { projects: [], threads: [] });
    assert.deepEqual(
        await readFile(join(f.directory, 'platform-credentials.json')),
        encrypted,
    );
    assert.deepEqual(
        JSON.parse(
            await readFile(join(f.directory, 'codex-chats.json'), 'utf8'),
        ),
        index,
    );
});

test('chat writes roll back atomically when a project association is invalid', async (t) => {
    const f = await fixture(t);
    const storage = await f.open();
    const saved = {
        projects: [{ id: 'p', name: 'Original', cwd: f.directory }],
        threads: [],
    };
    storage.saveChats(saved);
    assert.throws(
        () =>
            storage.saveChats({
                projects: [],
                threads: [
                    {
                        id: 'c',
                        projectId: 'missing',
                        cwd: f.directory,
                        title: 'Invalid',
                        updatedAt: 'now',
                    },
                ],
            }),
        /FOREIGN KEY/,
    );
    assert.deepEqual(storage.loadChats(), saved);
    storage.close();
    assert.deepEqual((await f.open()).loadChats(), saved);
});

test('a failed legacy import is retryable and never partially commits or edits originals', async (t) => {
    const f = await fixture(t);
    const path = join(f.directory, 'codex-chats.json');
    await writeFile(
        join(f.directory, 'connection.json'),
        JSON.stringify({ platformUrl: 'https://example.test' }),
    );
    await writeFile(
        path,
        JSON.stringify({
            version: 2,
            projects: [],
            threads: [
                {
                    id: 'c',
                    cwd: f.directory,
                    projectId: 'missing',
                    title: 'Chat',
                    updatedAt: 'now',
                },
            ],
        }),
    );
    await assert.rejects(f.open(), /FOREIGN KEY/);
    const db = new DatabaseSync(f.databasePath);
    assert.equal(db.prepare('SELECT count(*) AS n FROM settings').get().n, 0);
    db.close();
    await writeFile(path, '[]');
    assert.deepEqual((await f.open()).getSetting('connection'), {
        platformUrl: 'https://example.test',
    });
    assert.equal(await readFile(path, 'utf8'), '[]');
});
