import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, rm, open } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { devOptions } from "./dev-options.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const git = (...args) =>
    execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
const directory = join(
    git("rev-parse", "--path-format=absolute", "--git-common-dir"),
    "junior-preview",
);
const stateFile = join(directory, "state.json");
const logFile = join(directory, "preview.log");
const lock = join(directory, "lock");
const script = fileURLToPath(import.meta.url);

async function readState() {
    try {
        return JSON.parse(await readFile(stateFile, "utf8"));
    } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
    }
}

async function control(state, action = "status") {
    if (!state) return null;
    try {
        const response = await fetch(
            `http://127.0.0.1:${state.controlPort}/${action}`,
            {
                method: action === "stop" ? "POST" : "GET",
                headers: { authorization: `Bearer ${state.token}` },
                signal: AbortSignal.timeout(1500),
            },
        );
        if (!response.ok) return null;
        const result = await response.json();
        return result.token === state.token ? result : null;
    } catch {
        return null;
    }
}

async function healthy(config) {
    const host =
        config.host === "0.0.0.0"
            ? "127.0.0.1"
            : config.host === "::"
              ? "[::1]"
              : config.host.includes(":")
                ? `[${config.host}]`
                : config.host;
    try {
        const responses = await Promise.all([
            fetch(`http://${host}:${config.webPort}/@vite/client`, {
                signal: AbortSignal.timeout(1500),
            }),
            fetch(`http://127.0.0.1:${config.backendPort}/api/connection`, {
                headers: { "x-junior-mode-client": "web" },
                signal: AbortSignal.timeout(1500),
            }),
        ]);
        await Promise.all(responses.map((response) => response.body?.cancel()));
        return responses.every((response) => response.ok);
    } catch {
        return false;
    }
}

async function available(port, host) {
    const server = createTcpServer();
    await new Promise((resolvePromise, reject) => {
        server.once("error", () =>
            reject(
                new Error(
                    `Port ${port} is occupied. Its process is not managed by this preview instance; stop it from its original terminal before retrying.`,
                ),
            ),
        );
        server.listen(port, host, resolvePromise);
    });
    await new Promise((done) => server.close(done));
}

function show(state, health) {
    console.log(
        `Worktree: ${state.root}\nBranch: ${state.branch}\nURL: http://${state.host === "0.0.0.0" || state.host === "::" ? "YOUR_SERVER" : state.host}:${state.webPort}\nBackend: 127.0.0.1:${state.backendPort}\nSupervisor PID: ${state.pid}\nHealth: ${health}\nLogs: ${logFile}`,
    );
}

async function stop(state) {
    if (!(await control(state, "stop")))
        throw new Error(
            "Preview ownership could not be verified. No process was killed.",
        );
    for (let i = 0; i < 100; i++) {
        if (!(await control(state))) return;
        await delay(100);
    }
    throw new Error(
        "Preview did not stop within 10 seconds. Inspect preview logs.",
    );
}

async function supervise(config) {
    let child;
    let stopping = false;
    const token = randomUUID();
    const state = { ...config, token, pid: process.pid };
    const server = createServer(async (request, response) => {
        if (request.headers.authorization !== `Bearer ${token}`) {
            response.writeHead(403).end();
            return;
        }
        if (
            request.url !== "/status" &&
            !(request.url === "/stop" && request.method === "POST")
        ) {
            response.writeHead(404).end();
            return;
        }
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ ...state, stopping }));
        if (request.url === "/stop") void shutdown();
    });
    async function shutdown() {
        if (stopping) return;
        stopping = true;
        // Only this supervisor signals the process group it created.
        if (child?.pid) {
            try {
                process.kill(-child.pid, "SIGTERM");
            } catch (error) {
                if (error.code !== "ESRCH") throw error;
            }
            await delay(3500);
            try {
                process.kill(-child.pid, "SIGKILL");
            } catch (error) {
                if (error.code !== "ESRCH") throw error;
            }
        }
        if ((await readState())?.token === token)
            await rm(stateFile, { force: true });
        server.closeAllConnections();
        server.close(() => process.exit(0));
    }
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    state.controlPort = server.address().port;
    child = spawn(
        process.execPath,
        [
            join(config.root, "apps/scripts/dev.mjs"),
            "--client",
            "--host",
            config.host,
        ],
        {
            cwd: config.root,
            detached: true,
            stdio: ["ignore", "inherit", "inherit"],
            env: {
                ...process.env,
                WEB_PORT: String(config.webPort),
                BACKEND_PORT: String(config.backendPort),
            },
        },
    );
    child.on("error", (error) => {
        console.error(error);
        void shutdown();
    });
    child.on("exit", (code) => {
        console.log(`Dev runner exited (${code}).`);
        void shutdown();
    });
    process.on("SIGTERM", () => void shutdown());
    process.on("SIGINT", () => void shutdown());
    const temp = `${stateFile}.${token}`;
    await writeFile(temp, JSON.stringify(state), { mode: 0o600 });
    await rename(temp, stateFile);
}

async function main() {
    const [command = "status", ...args] = process.argv.slice(2);
    if (command === "--supervise") {
        await supervise(JSON.parse(args[0]));
        return;
    }
    if (!["status", "use", "stop", "logs"].includes(command)) {
        throw new Error(
            "Usage: pnpm preview <status|use|stop|logs> [--host IP] [--web-port PORT] [--backend-port PORT]",
        );
    }
    const { values } = parseArgs({
        args,
        options: {
            host: { type: "string" },
            "web-port": { type: "string" },
            "backend-port": { type: "string" },
        },
    });
    await mkdir(directory, { recursive: true, mode: 0o700 });
    if (command === "logs") {
        try {
            const lines = (await readFile(logFile, "utf8"))
                .trimEnd()
                .split("\n");
            console.log(lines.slice(-100).join("\n"));
        } catch (error) {
            if (error.code === "ENOENT") console.log("No preview logs yet.");
            else throw error;
        }
        return;
    }
    if (command === "status") {
        const saved = await readState();
        const live = await control(saved);
        if (live)
            show(
                live,
                live.stopping
                    ? "stopping"
                    : (await healthy(live))
                      ? "ready"
                      : "unhealthy / starting",
            );
        else
            console.log(
                saved
                    ? "Saved preview is no longer responding. Run preview use to recover."
                    : "No managed preview. Existing manually started dev servers are not managed.",
            );
        return;
    }
    if (process.platform === "win32")
        throw new Error(
            "Preview management requires a Linux or macOS server. Use pnpm dev:client on Windows.",
        );
    try {
        await mkdir(lock);
    } catch (error) {
        if (error.code !== "EEXIST") throw error;
        throw new Error(
            `Another preview command holds ${lock}. If it crashed, remove that directory and retry.`,
        );
    }
    try {
        const saved = await readState();
        const live = await control(saved);
        if (command === "stop") {
            if (live) {
                await stop(live);
                console.log("Preview stopped.");
            } else
                console.log(
                    "No responding managed preview. No process was killed.",
                );
            return;
        }
        const config = {
            root: resolve(root),
            branch:
                git("branch", "--show-current") ||
                git("rev-parse", "--short", "HEAD"),
            host: devOptions(["--host", values.host || live?.host || "0.0.0.0"])
                .host,
            webPort: Number(values["web-port"] || live?.webPort || 5174),
            backendPort: Number(
                values["backend-port"] || live?.backendPort || 4318,
            ),
        };
        for (const port of [config.webPort, config.backendPort]) {
            if (!Number.isInteger(port) || port < 1 || port > 65535)
                throw new Error("Ports must be integers between 1 and 65535.");
        }
        if (config.webPort === config.backendPort)
            throw new Error("Web and backend ports must differ.");
        if (
            live &&
            !live.stopping &&
            ["root", "host", "webPort", "backendPort"].every(
                (key) => live[key] === config[key],
            ) &&
            (await healthy(live))
        ) {
            show(
                { ...live, branch: config.branch },
                "ready (already selected)",
            );
            return;
        }
        if (live) await stop(live);
        await available(config.webPort, config.host);
        await available(config.backendPort, "127.0.0.1");
        const log = await open(logFile, "w", 0o600);
        const supervisor = spawn(
            process.execPath,
            [script, "--supervise", JSON.stringify(config)],
            {
                cwd: root,
                detached: true,
                stdio: ["ignore", log.fd, log.fd],
            },
        );
        supervisor.unref();
        await log.close();
        let startupError;
        supervisor.on("error", (error) => {
            startupError = error;
        });
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
            if (startupError) throw startupError;
            const next = await readState();
            if (next?.pid === supervisor.pid) {
                const active = await control(next);
                if (active && !active.stopping && (await healthy(next))) {
                    show(next, "ready");
                    return;
                }
            }
            if (supervisor.exitCode !== null) break;
            await delay(250);
        }
        const failed = await readState();
        if (failed?.pid === supervisor.pid && (await control(failed)))
            await stop(failed);
        throw new Error(
            `Preview failed to become ready. Run pnpm preview logs (or read ${logFile}).`,
        );
    } finally {
        await rm(lock, { recursive: true, force: true });
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
