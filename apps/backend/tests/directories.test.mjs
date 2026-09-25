import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, parse, sep } from 'node:path';
import { test } from 'node:test';
import { browseDirectories } from '../src/directories.mjs';
import { createBackendServer } from '../src/http.mjs';
import { createBackend } from '../src/index.mjs';

test('folder browsing completes paths, expands home, hides files and supports directory symlinks', async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'junior-folders-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    for (const name of ['Project 2', 'Project 10', '.hidden'])
        await mkdir(join(directory, name));
    await writeFile(join(directory, 'Project.txt'), 'not a folder');
    await symlink(
        join(directory, 'Project 2'),
        join(directory, 'Linked'),
        process.platform === 'win32' ? 'junction' : 'dir',
    );
    await symlink(
        join(directory, 'missing'),
        join(directory, 'Broken'),
        process.platform === 'win32' ? 'junction' : 'dir',
    );
    const result = await browseDirectories({ path: directory + sep });
    assert.equal(result.currentPath, directory);
    assert.equal(result.parentPath, dirname(directory));
    assert.deepEqual(
        result.entries.map((entry) => entry.name),
        ['Linked', 'Project 2', 'Project 10'],
    );
    const partial = await browseDirectories({ path: join(directory, 'pro') });
    assert.equal(partial.currentPath, null);
    assert.deepEqual(
        partial.entries.map((entry) => entry.name),
        ['Project 2', 'Project 10'],
    );
    assert.equal(
        (await browseDirectories({ path: join(directory, 'Linked') }))
            .currentPath,
        join(directory, 'Linked'),
    );
    assert.equal(
        (await browseDirectories({ path: directory, showHidden: true })).entries
            .length,
        4,
    );
    assert.equal(
        (await browseDirectories({ path: join(directory, '.h') })).entries[0]
            .name,
        '.hidden',
    );
    assert.equal(
        (await browseDirectories({ path: '~/' })).currentPath,
        homedir(),
    );
    assert.equal(
        (await browseDirectories({ path: '' })).currentPath,
        homedir(),
    );
    const root = parse(directory).root;
    assert.equal((await browseDirectories({ path: root })).parentPath, root);
    await assert.rejects(
        browseDirectories({ path: join(directory, 'Project.txt') }),
        /file/,
    );
    await assert.rejects(
        browseDirectories({ path: join(directory, 'missing/child') }),
        /Folder not found/,
    );
    for (const input of [
        { path: 'relative' },
        { path: '\0' },
        { path: 'x'.repeat(4097) },
        { path: 42 },
        null,
        { path: directory, showHidden: 'yes' },
    ]) {
        await assert.rejects(browseDirectories(input));
    }
});

test('folder listing caps results and reports truncation', async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'junior-folder-limit-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    await Promise.all(
        Array.from({ length: 105 }, (_, index) =>
            mkdir(join(directory, 'folder-' + index)),
        ),
    );
    const result = await browseDirectories({ path: directory });
    assert.equal(result.entries.length, 100);
    assert.equal(result.truncated, true);
});

test('browser directory browsing uses the guarded backend transport', async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'junior-folder-http-'));
    const backend = await createBackend({
        settingsPath: join(directory, 'connection.json'),
    });
    const server = createBackendServer(backend);
    await new Promise((done) => server.listen(0, '127.0.0.1', done));
    t.after(async () => {
        backend.dispose();
        server.closeAllConnections();
        await new Promise((done) => server.close(done));
        await rm(directory, { recursive: true, force: true });
    });
    const url = `http://127.0.0.1:${server.address().port}/api/directories`;
    const request = (headers) =>
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ path: directory }),
        });
    assert.equal((await request({})).status, 403);
    assert.equal(
        (
            await request({
                'X-Junior-Mode-Client': 'web',
                Origin: 'https://unrelated.example',
            })
        ).status,
        403,
    );
    const response = await request({ 'X-Junior-Mode-Client': 'web' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).currentPath, directory);
});
