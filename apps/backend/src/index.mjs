import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createCodexService } from './codex.mjs';
import { serverUrl } from './server-url.mjs';

const emptyState = () => ({
    platformUrl: null,
    status: 'not-configured',
    checkedAt: null,
    message: null,
});

export async function createBackend({
    settingsPath,
    fetchImpl = fetch,
    codexProcessFactory,
}) {
    const codex = await createCodexService({
        statePath: join(dirname(settingsPath), 'codex-chats.json'),
        processFactory: codexProcessFactory,
    });
    let state = emptyState();
    let pending = Promise.resolve();

    try {
        const saved = JSON.parse(await readFile(settingsPath, 'utf8'));
        state = {
            ...state,
            platformUrl: serverUrl(saved.platformUrl),
            status: 'unchecked',
        };
    } catch (error) {
        if (error.code !== 'ENOENT') {
            // A damaged settings file must not prevent the connection screen opening.
            state.message =
                'Saved connection could not be read. Connect again.';
        }
    }

    function serialize(operation) {
        const result = pending.then(operation);
        pending = result.catch(() => {});

        return result;
    }

    async function probe(platformUrl) {
        const result = {
            platformUrl,
            checkedAt: new Date().toISOString(),
            status: 'connected',
            message: null,
        };

        try {
            const response = await fetchImpl(`${platformUrl}/api/v1/health`, {
                headers: { Accept: 'application/json' },
                signal: AbortSignal.timeout(5000),
                redirect: 'error',
            });

            if (!response.ok) {
                throw new Error(
                    `The learning platform returned HTTP ${response.status}.`,
                );
            }

            const health = await response.json();

            if (
                health.service !== 'junior-mode' ||
                health.api_version !== 1 ||
                health.status !== 'ok'
            ) {
                throw new Error(
                    'This server is not a compatible Junior Mode learning platform.',
                );
            }
        } catch (error) {
            result.status = 'unavailable';
            result.message =
                error instanceof TypeError || error.name === 'TimeoutError'
                    ? 'Could not reach the learning platform. Check the address and that the server is running.'
                    : error instanceof SyntaxError
                      ? 'This address did not return a Junior Mode platform response.'
                      : error.message;
        }

        return result;
    }

    return {
        ...codex,
        getConnection: () => serialize(() => ({ ...state })),
        connectPlatform: (value) =>
            serialize(async () => {
                const url = serverUrl(value);
                const next = await probe(url);

                if (next.status === 'connected') {
                    await mkdir(dirname(settingsPath), { recursive: true });
                    await writeFile(
                        `${settingsPath}.tmp`,
                        JSON.stringify({ platformUrl: url }),
                        { mode: 0o600 },
                    );
                    await rename(`${settingsPath}.tmp`, settingsPath);
                }

                state = next;

                return { ...state };
            }),
        checkPlatform: () =>
            serialize(async () => {
                if (!state.platformUrl) {
                    throw new Error('Connect to a learning platform first.');
                }

                state = await probe(state.platformUrl);

                return { ...state };
            }),
        disconnectPlatform: () =>
            serialize(async () => {
                await rm(settingsPath, { force: true });
                state = emptyState();

                return { ...state };
            }),
    };
}
