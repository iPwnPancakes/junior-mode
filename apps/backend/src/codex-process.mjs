import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline';

export function codexEnvironment(env = {}) {
    return {
        ...process.env,
        ...env,
        PATH: [
            process.env.PATH,
            join(homedir(), '.local', 'bin'),
            '/opt/homebrew/bin',
            '/usr/local/bin',
        ]
            .filter(Boolean)
            .join(delimiter),
    };
}

// Keep Codex's protocol behind our own capabilities. Never expose arbitrary RPC
// or executable arguments to the renderer.
export function createCodexProcess({
    onNotification,
    onRequest,
    onExit,
    executable = process.env.JUNIOR_CODEX_PATH || 'codex',
    args = ['app-server'],
    env = {},
    config = {},
}) {
    const child = spawn(
        executable,
        [
            ...args,
            ...Object.entries(config).flatMap(([key, value]) => [
                '-c',
                `${key}=${JSON.stringify(value)}`,
            ]),
        ],
        {
            cwd: homedir(),
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: codexEnvironment(env),
        },
    );
    const pending = new Map();
    let sequence = 0;
    let ended = false;
    let stopping = false;
    const lines = createInterface({ input: child.stdout });
    // Drain diagnostics without forwarding potentially sensitive local output.
    child.stderr.resume();

    function fail(error) {
        if (ended) return;
        ended = true;
        for (const entry of pending.values()) {
            clearTimeout(entry.timer);
            entry.reject(error);
        }
        pending.clear();
        lines.close();
        if (!stopping) onExit(error);
    }
    child.on('error', (error) =>
        fail(
            new Error(
                error.code === 'ENOENT'
                    ? 'Codex was not found. Install Codex CLI on this machine, or set JUNIOR_CODEX_PATH to its executable.'
                    : `Could not start Codex: ${error.message}`,
            ),
        ),
    );
    child.on('exit', (code, signal) =>
        fail(
            new Error(
                `Codex stopped (${signal || code}). Reconnect to continue.`,
            ),
        ),
    );
    child.stdin.on('error', fail);

    function write(message) {
        if (ended || stopping)
            throw new Error('Codex is not running. Reconnect to continue.');
        child.stdin.write(`${JSON.stringify(message)}\n`);
    }
    lines.on('line', (line) => {
        try {
            const message = JSON.parse(line);
            if (message.method) {
                if (message.id !== undefined) onRequest(message);
                else onNotification(message);
            } else {
                const entry = pending.get(message.id);
                if (!entry) return;
                pending.delete(message.id);
                clearTimeout(entry.timer);
                if (message.error)
                    entry.reject(
                        new Error(
                            message.error.message ||
                                'Codex rejected the request.',
                        ),
                    );
                else entry.resolve(message.result);
            }
        } catch (error) {
            fail(new Error(`Codex protocol error: ${error.message}`));
            child.kill();
        }
    });

    return {
        request(method, params = {}) {
            return new Promise((resolve, reject) => {
                const id = ++sequence;
                const timer = setTimeout(() => {
                    pending.delete(id);
                    reject(
                        new Error(
                            `Codex timed out during ${method}. Reconnect before retrying.`,
                        ),
                    );
                    // A timed-out mutation may have succeeded. End the process
                    // rather than let a retry start an unseen duplicate turn.
                    fail(
                        new Error(
                            'Codex stopped responding. Reconnect to continue.',
                        ),
                    );
                    child.kill();
                }, 30000);
                pending.set(id, { resolve, reject, timer });
                try {
                    write({ id, method, params });
                } catch (error) {
                    pending.delete(id);
                    clearTimeout(timer);
                    reject(error);
                }
            });
        },
        notify: (method, params = {}) => write({ method, params }),
        respond: (id, result) => write({ id, result }),
        reject: (id, message) =>
            write({ id, error: { code: -32601, message } }),
        dispose() {
            if (stopping) return;
            stopping = true;
            child.stdin.end();
            child.kill('SIGTERM');
            const timer = setTimeout(() => child.kill('SIGKILL'), 2000);
            timer.unref();
            child.once('close', () => clearTimeout(timer));
            fail(new Error('Codex was closed.'));
        },
    };
}
