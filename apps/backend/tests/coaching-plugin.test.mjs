import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
    createCoachingPlugin,
    coachingPluginKey,
} from '../src/coaching-plugin.mjs';

async function fixture(t, command) {
    const directory = await mkdtemp(join(tmpdir(), 'junior-plugin-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const root = fileURLToPath(new URL('../../../', import.meta.url));
    const cache = join(directory, 'installed-plugin');
    await cp(join(root, 'plugins/junior-mode'), cache, { recursive: true });
    const calls = [];
    const plugin = await createCoachingPlugin({
        marketplaceRoot: root,
        statePath: join(directory, 'plugin.json'),
        runCommand:
            command ??
            (async (executable, args) => {
                calls.push({ executable, args });
                return {
                    stdout: JSON.stringify({
                        pluginId: 'junior-mode@junior-mode-desktop',
                        installedPath: cache,
                    }),
                };
            }),
    });
    t.after(() => plugin.dispose());
    return { plugin, cache, calls };
}

test('plugin install is explicit, scoped, versioned and checks the shipped skill before use', async (t) => {
    const { plugin, cache, calls } = await fixture(t);
    assert.equal((await plugin.state()).installed, false);
    await assert.rejects(plugin.skill(), /Install or update/);
    assert.equal(plugin.config[`${coachingPluginKey}.enabled`], false);
    assert.equal(
        plugin.config[`${coachingPluginKey}.mcp_servers.junior-mode.enabled`],
        false,
    );
    await plugin.install();
    assert.deepEqual(calls[0].args.slice(-4), [
        'plugin',
        'add',
        'junior-mode@junior-mode-desktop',
        '--json',
    ]);
    const skill = await plugin.skill();
    assert.equal(skill.name, 'junior-mode:junior-mode');
    assert.equal(skill.path, join(cache, 'skills/junior-mode/SKILL.md'));
    await writeFile(skill.path, 'Changed or damaged installed policy');
    assert.equal((await plugin.state()).installed, false);
    await assert.rejects(plugin.skill(), /Install or update/);
});

test('failed or mismatched CLI install never reports the plugin ready', async (t) => {
    for (const output of [
        'not JSON',
        JSON.stringify({ pluginId: 'unrelated@plugin', installedPath: '/tmp' }),
    ]) {
        const { plugin } = await fixture(t, async () => ({ stdout: output }));
        await assert.rejects(plugin.install());
        assert.equal((await plugin.state()).installed, false);
    }
    const { plugin, cache } = await fixture(t);
    await rm(join(cache, 'skills/junior-mode/SKILL.md'));
    await assert.rejects(plugin.install(), /does not match/);
    const manifest = JSON.parse(
        await readFile(join(cache, '.codex-plugin/plugin.json'), 'utf8'),
    );
    assert.equal(manifest.name, 'junior-mode');
});
