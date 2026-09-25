import { openStorage } from './storage.mjs';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { codexEnvironment } from './codex-process.mjs';

export const coachingPluginId = 'junior-mode@junior-mode-desktop';
export const coachingPluginKey = `plugins.${coachingPluginId}`;

export async function createCoachingPlugin({
    marketplaceRoot,
    statePath,
    storage: providedStorage,
    runCommand = promisify(execFile),
}) {
    const storage =
        providedStorage ??
        (await openStorage({
            databasePath: join(dirname(statePath), 'junior-mode.sqlite'),
            legacyPluginPath: statePath,
        }));
    let installed;
    const manifestPath = join(
        marketplaceRoot,
        'plugins/junior-mode/.codex-plugin/plugin.json',
    );
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (manifest.name !== 'junior-mode' || typeof manifest.version !== 'string')
        throw new Error(
            'The bundled coaching plugin is invalid. Reinstall Junior Mode.',
        );
    try {
        installed = storage.getSetting('coaching-plugin');
    } catch {
        /* Installation is explicit. */
    }
    async function check() {
        try {
            if (
                typeof installed?.path !== 'string' ||
                !isAbsolute(installed.path)
            )
                return false;
            const cached = JSON.parse(
                await readFile(
                    join(installed.path, '.codex-plugin/plugin.json'),
                    'utf8',
                ),
            );
            if (JSON.stringify(cached) !== JSON.stringify(manifest))
                return false;
            for (const relative of [
                'skills/junior-mode/SKILL.md',
                'skills/junior-mode/agents/openai.yaml',
                'skills/mentor-mode/SKILL.md',
                'skills/mentor-mode/agents/openai.yaml',
                '.mcp.json',
            ]) {
                const [bundled, cached] = await Promise.all([
                    readFile(
                        join(marketplaceRoot, 'plugins/junior-mode', relative),
                    ),
                    readFile(join(installed.path, relative)),
                ]);
                if (!bundled.equals(cached)) return false;
            }
            return true;
        } catch {
            return false;
        }
    }
    const config = {
        'marketplaces.junior-mode-desktop.source': marketplaceRoot,
        'marketplaces.junior-mode-desktop.source_type': 'local',
        [`${coachingPluginKey}.enabled`]: false,
        // The authenticated transport is managed by the backend. Do not expose a
        // second plugin-namespaced server, including in ordinary chats.
        [`${coachingPluginKey}.mcp_servers.junior-mode.enabled`]: false,
    };
    return {
        dispose() {
            if (!providedStorage) storage.close();
        },
        config,
        async state() {
            return { installed: await check(), version: manifest.version };
        },
        async skill() {
            if (!(await check()))
                throw new Error(
                    'Install or update the coaching plugin in Learning platform before enabling coaching.',
                );
            return {
                type: 'skill',
                name: 'junior-mode:junior-mode',
                path: join(installed.path, 'skills/junior-mode/SKILL.md'),
            };
        },
        async install() {
            let result;
            try {
                result = await runCommand(
                    process.env.JUNIOR_CODEX_PATH || 'codex',
                    [
                        ...Object.entries(config).flatMap(([key, value]) => [
                            '-c',
                            `${key}=${JSON.stringify(value)}`,
                        ]),
                        'plugin',
                        'add',
                        coachingPluginId,
                        '--json',
                    ],
                    {
                        env: codexEnvironment(),
                        timeout: 60000,
                        maxBuffer: 1024 * 1024,
                    },
                );
            } catch {
                throw new Error(
                    'Codex could not install the bundled coaching plugin. Check that Codex CLI 0.155.1 or later is installed and the plugin is permitted by your organization.',
                );
            }
            let response;
            try {
                response = JSON.parse(result.stdout);
            } catch {
                throw new Error(
                    'Codex returned an invalid plugin installation response.',
                );
            }
            if (
                response.pluginId !== coachingPluginId ||
                typeof response.installedPath !== 'string'
            )
                throw new Error(
                    'Codex did not install the expected coaching plugin.',
                );
            installed = { path: response.installedPath };
            if (!(await check())) {
                installed = undefined;
                throw new Error(
                    'The installed coaching plugin does not match the bundled version.',
                );
            }
            storage.setSetting('coaching-plugin', installed);
            return this.state();
        },
    };
}
