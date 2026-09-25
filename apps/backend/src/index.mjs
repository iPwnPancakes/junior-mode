import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createCodexService } from './codex.mjs';
import { fileURLToPath } from 'node:url';
import { createCoachingPlugin, coachingPluginKey } from './coaching-plugin.mjs';
import { createPlatformAuthorization } from './platform-auth.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { browseDirectories } from './directories.mjs';
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
    credentialCodec,
    openExternal,
    marketplaceRoot = fileURLToPath(new URL('../../../', import.meta.url)),
    pluginCommand,
}) {
    let state = emptyState();
    const authorization = await createPlatformAuthorization({
        path: join(dirname(settingsPath), 'platform-credentials.json'),
        getUrl: () => state.platformUrl,
        fetchImpl,
        credentialCodec,
    });
    const plugin = await createCoachingPlugin({
        marketplaceRoot,
        statePath: join(dirname(settingsPath), 'coaching-plugin.json'),
        runCommand: pluginCommand,
    });
    const codex = await createCodexService({
        statePath: join(dirname(settingsPath), 'codex-chats.json'),
        processFactory: codexProcessFactory,
        processOptions: () => {
            const options = authorization.processOptions();
            return {
                ...options,
                config: { ...options.config, ...plugin.config },
            };
        },
        coachingSkill: () => plugin.skill(),
        coachingThreadConfig: (coaching) => ({
            [`${coachingPluginKey}.enabled`]: coaching,
        }),
        redact: (value) => authorization.redact(value),
        authorizeCoaching: async (cwd) => {
            try {
                await authorization.check();
            } catch (error) {
                codex.invalidateConnection();
                throw error;
            }
            let remote;
            try {
                remote = (
                    await promisify(execFile)(
                        'git',
                        ['-C', cwd, 'remote', 'get-url', 'origin'],
                        { timeout: 5000 },
                    )
                ).stdout.trim();
            } catch {
                throw new Error(
                    'Coaching requires an enrolled repository with an origin remote.',
                );
            }
            if (/^https?:\/\//i.test(remote)) {
                const url = new URL(remote);
                url.username = '';
                url.password = '';
                url.search = '';
                url.hash = '';
                remote = url.href;
            }
            const enrollment = await authorization.tool(
                'resolve-repository-enrollment',
                { contract_version: '1', remote_url: remote },
            );
            if (!enrollment.enrolled)
                throw new Error(
                    'This repository is not enrolled. Enroll it on the learning platform before coaching.',
                );
            return enrollment.repository.identity;
        },
    });
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
        browseDirectories,
        getCoachingPlugin: () => serialize(() => plugin.state()),
        installCoachingPlugin: () =>
            serialize(async () => {
                await codex.resetConnection();
                return plugin.install();
            }),
        openPlatformAuthorization: () =>
            serialize(async () => {
                const url = authorization.snapshot().authorizationUrl;
                if (!url || !openExternal)
                    throw new Error(
                        'Open the displayed approval address in your browser.',
                    );
                await openExternal(url);
            }),
        getPlatformAuthorization: () =>
            serialize(() => authorization.snapshot()),
        beginPlatformAuthorization: (name) =>
            serialize(() => authorization.begin(name)),
        completePlatformAuthorization: () =>
            serialize(async () => {
                await codex.resetConnection();
                return authorization.complete();
            }),
        checkPlatformAuthorization: () =>
            serialize(async () => {
                try {
                    return await authorization.check();
                } catch (error) {
                    codex.invalidateConnection();
                    throw error;
                }
            }),
        getConnection: () => serialize(() => ({ ...state })),
        connectPlatform: (value) =>
            serialize(async () => {
                const url = serverUrl(value);
                const next = await probe(url);
                if (next.status !== 'connected' && state.platformUrl)
                    return { ...next, platformUrl: state.platformUrl };

                if (next.status === 'connected') {
                    if (state.platformUrl !== url) {
                        await codex.resetConnection();
                        await authorization.clear();
                    }
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
                await codex.resetConnection();
                await authorization.clear();
                await rm(settingsPath, { force: true });
                state = emptyState();

                return { ...state };
            }),
    };
}
