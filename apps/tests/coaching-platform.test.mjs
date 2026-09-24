import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { createBackend } from '../backend/src/index.mjs';
import { createCodexProcess } from '../backend/src/codex-process.mjs';

// Opt-in integration: real installed Codex and Laravel, isolated temporary DB;
// no model turn, production data, or global Codex configuration changes.
test(
    'managed Codex reaches authenticated Laravel MCP for an enrolled repository',
    { skip: process.env.JUNIOR_TEST_REAL_CODEX !== '1' },
    async (t) => {
        const directory = await mkdtemp(
            join(tmpdir(), 'junior-real-coaching-'),
        );
        const codexHome = join(directory, 'codex-home');
        await mkdir(codexHome);
        const platform = fileURLToPath(
            new URL('../learning-platform', import.meta.url),
        );
        const port = 18000 + Math.floor(Math.random() * 10000);
        const url = `http://127.0.0.1:${port}`;
        const env = {
            ...process.env,
            APP_ENV: 'testing',
            APP_KEY: `base64:${Buffer.alloc(32, 'x').toString('base64')}`,
            DB_CONNECTION: 'sqlite',
            DB_DATABASE: join(directory, 'database.sqlite'),
            CACHE_STORE: 'array',
            SESSION_DRIVER: 'array',
            APP_URL: url,
        };
        await writeFile(env.DB_DATABASE, '');
        await promisify(execFile)(
            'php',
            [
                fileURLToPath(
                    new URL(
                        './fixtures/coaching-platform.php',
                        import.meta.url,
                    ),
                ),
            ],
            { cwd: platform, env },
        );
        const server = spawn(
            'php',
            [
                'artisan',
                'serve',
                '--host=127.0.0.1',
                `--port=${port}`,
                '--no-reload',
            ],
            { cwd: platform, env, stdio: 'ignore' },
        );
        let child;
        let backend;
        t.after(async () => {
            backend?.dispose();
            server.kill();
            await rm(directory, { recursive: true, force: true });
        });
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
            try {
                ready = (await fetch(`${url}/api/v1/health`)).ok;
            } catch {
                /* Wait for PHP. */
            }
            if (ready) break;
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        assert.ok(ready, 'Laravel started');
        await promisify(execFile)('git', ['init', directory]);
        await promisify(execFile)('git', [
            '-C',
            directory,
            'remote',
            'add',
            'origin',
            'https://github.com/example/project.git',
        ]);
        await writeFile(
            join(directory, 'connection.json'),
            JSON.stringify({ platformUrl: url }),
        );
        await writeFile(
            join(directory, 'platform-credentials.json'),
            JSON.stringify({ url, token: `jm_${'a'.repeat(64)}` }),
            { mode: 0o600 },
        );
        backend = await createBackend({
            settingsPath: join(directory, 'connection.json'),
            pluginCommand: (command, args, options) =>
                promisify(execFile)(command, args, {
                    ...options,
                    env: { ...options.env, CODEX_HOME: codexHome },
                }),
            codexProcessFactory: (handlers) =>
                (child = createCodexProcess({
                    ...handlers,
                    env: { ...handlers.env, CODEX_HOME: codexHome },
                    config: {
                        ...handlers.config,
                        model_provider: 'fixture',
                        'model_providers.fixture.name': 'Fixture',
                        'model_providers.fixture.base_url': `${url}/unused-model`,
                        'model_providers.fixture.wire_api': 'responses',
                        'model_providers.fixture.requires_openai_auth': false,
                    },
                })),
        });
        assert.equal(
            (await backend.checkPlatformAuthorization()).learner,
            'Integration Learner',
        );
        await backend.installCoachingPlugin();
        const state = await backend.startChat({
            cwd: directory,
            coaching: true,
        });
        const result = await child.request('mcpServer/tool/call', {
            threadId: state.thread.id,
            server: 'junior-mode',
            tool: 'identify-client',
            arguments: {},
        });
        assert.equal(result.isError, false);
        assert.equal(
            result.structuredContent.learner.name,
            'Integration Learner',
        );
        const enrollment = await child.request('mcpServer/tool/call', {
            threadId: state.thread.id,
            server: 'junior-mode',
            tool: 'resolve-repository-enrollment',
            arguments: {
                contract_version: '1',
                remote_url: 'https://github.com/example/project.git',
            },
        });
        assert.equal(enrollment.structuredContent.enrolled, true);
        const brief = await child.request('mcpServer/tool/call', {
            threadId: state.thread.id,
            server: 'junior-mode',
            tool: 'get-coaching-brief',
            arguments: {
                contract_version: '1',
                repository_identity:
                    enrollment.structuredContent.repository.identity,
                title: 'Understand a test',
                description: 'Practice explaining an assertion.',
                detected_technologies: [],
                likely_catalog_branches: [],
            },
        });
        assert.equal(brief.isError, false);
        assert.equal(brief.structuredContent.contract_version, '1');
    },
);
