import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
    mkdtemp,
    mkdir,
    copyFile,
    writeFile,
    readFile,
    rm,
} from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

const exec = promisify(execFile);
const fixture = `
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['--input-type=module', '-e',
    "import {createServer} from 'node:http'; createServer((q,r)=>{r.statusCode=q.headers['x-junior-mode-client']==='web'?200:403;r.end('{}');}).listen(Number(process.env.BACKEND_PORT), '127.0.0.1');"
], { stdio: 'inherit' });
createServer((q,r)=>r.end('vite fixture')).listen(Number(process.env.WEB_PORT), '127.0.0.1');
console.log('Fixture started', child.pid);
`;

async function port() {
    const server = createServer();
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    const result = server.address().port;
    await new Promise((done) => server.close(done));
    return result;
}

async function setup(t) {
    const directory = await mkdtemp(join(tmpdir(), "junior-preview-"));
    const first = join(directory, "first");
    await mkdir(join(first, "apps/scripts"), { recursive: true });
    for (const file of ["preview.mjs", "dev-options.mjs"]) {
        await copyFile(
            new URL(`../../scripts/${file}`, import.meta.url),
            join(first, "apps/scripts", file),
        );
    }
    await writeFile(join(first, "apps/scripts/dev.mjs"), fixture);
    const git = (...args) => exec("git", ["-C", first, ...args]);
    await git("init");
    await git("add", ".");
    await git(
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.com",
        "commit",
        "-m",
        "Fixture",
    );
    const second = join(directory, "second");
    await git("worktree", "add", "-b", "second", second);
    const run = (root, ...args) =>
        exec(
            process.execPath,
            [join(root, "apps/scripts/preview.mjs"), ...args],
            { timeout: 45000 },
        );
    t.after(async () => {
        await run(first, "stop");
        await rm(directory, { recursive: true, force: true });
    });
    const web = await port();
    let backend = await port();
    while (backend === web) backend = await port();
    const options = [
        "--host",
        "127.0.0.1",
        "--web-port",
        String(web),
        "--backend-port",
        String(backend),
    ];
    return {
        first,
        second,
        run,
        web,
        backend,
        options,
        statePath: join(first, ".git/junior-preview/state.json"),
    };
}

test(
    "preview shares ownership across worktrees, switches, verifies tokens and stops both servers",
    { skip: process.platform === "win32" },
    async (t) => {
        const { first, second, run, web, backend, options, statePath } =
            await setup(t);
        assert.match((await run(first, "status")).stdout, /No managed preview/);
        assert.match(
            (await run(first, "use", ...options)).stdout,
            /Health: ready/,
        );
        const initial = JSON.parse(await readFile(statePath));
        assert.match((await run(second, "status")).stdout, new RegExp(first));
        assert.match(
            (await run(first, "use", ...options)).stdout,
            /already selected/,
        );
        assert.equal(JSON.parse(await readFile(statePath)).pid, initial.pid);
        assert.match((await run(first, "logs")).stdout, /Fixture started/);

        // A modified registry must never authorize stopping an unrelated service.
        await writeFile(
            statePath,
            JSON.stringify({ ...initial, token: "incorrect" }),
        );
        assert.match(
            (await run(first, "stop")).stdout,
            /No process was killed/,
        );
        assert.equal((await fetch(`http://127.0.0.1:${web}`)).status, 200);
        await writeFile(statePath, JSON.stringify(initial));

        assert.match((await run(second, "use")).stdout, /Branch: second/);
        const switched = JSON.parse(await readFile(statePath));
        assert.equal(switched.root, second);
        assert.notEqual(switched.pid, initial.pid);
        assert.equal(switched.webPort, web);
        assert.equal(switched.backendPort, backend);
        await run(first, "stop");
        for (const number of [web, backend]) {
            await assert.rejects(
                fetch(`http://127.0.0.1:${number}`, {
                    signal: AbortSignal.timeout(1000),
                }),
            );
        }
        assert.match(
            (await run(second, "status")).stdout,
            /No managed preview/,
        );
    },
);

test(
    "preview refuses unmanaged ports, recovers stale state and reports startup failures",
    { skip: process.platform === "win32" },
    async (t) => {
        const { first, run, web, options, statePath } = await setup(t);
        const occupied = createServer();
        await new Promise((done) => occupied.listen(web, "127.0.0.1", done));
        try {
            await assert.rejects(run(first, "use", ...options), /occupied/);
            assert.equal(occupied.listening, true);
        } finally {
            await new Promise((done) => occupied.close(done));
        }

        await writeFile(
            statePath,
            JSON.stringify({
                controlPort: await port(),
                token: "stale",
                pid: 9999999,
            }),
        );
        assert.match(
            (await run(first, "use", ...options)).stdout,
            /Health: ready/,
        );
        await run(first, "stop");
        await writeFile(
            join(first, "apps/scripts/dev.mjs"),
            'console.error("fixture startup failure"); process.exit(1);',
        );
        await assert.rejects(
            run(first, "use", ...options),
            /failed to become ready/,
        );
        assert.match(
            (await run(first, "logs")).stdout,
            /fixture startup failure/,
        );
    },
);
