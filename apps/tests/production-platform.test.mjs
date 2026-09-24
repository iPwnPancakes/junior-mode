import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { promisify } from 'node:util';

// Isolated Composer production install; does not remove development dependencies.
test(
    'production Composer install boots the authenticated MCP route without Boost',
    {
        skip: process.env.JUNIOR_TEST_PRODUCTION_PLATFORM !== '1',
        timeout: 120000,
    },
    async (t) => {
        const directory = await mkdtemp(join(tmpdir(), 'junior-production-'));
        t.after(() => rm(directory, { recursive: true, force: true }));
        const source = fileURLToPath(
            new URL('../learning-platform', import.meta.url),
        );
        const target = join(directory, 'platform');
        await cp(source, target, {
            recursive: true,
            filter: (path) => {
                const parts = relative(source, path).split(sep);
                return (
                    !parts.some((part) =>
                        ['vendor', 'node_modules', '.env', 'storage'].includes(
                            part,
                        ),
                    ) &&
                    !(
                        parts[0] === 'bootstrap' &&
                        parts[1] === 'cache' &&
                        parts.length > 2
                    )
                );
            },
        });
        for (const path of [
            'bootstrap/cache',
            'storage/framework/cache',
            'storage/framework/sessions',
            'storage/framework/views',
            'storage/logs',
        ])
            await mkdir(join(target, path), { recursive: true });
        const options = {
            cwd: target,
            env: { ...process.env, APP_ENV: 'production' },
            timeout: 90000,
            maxBuffer: 2 * 1024 * 1024,
        };
        await promisify(execFile)(
            'composer',
            ['install', '--no-dev', '--no-interaction', '--prefer-dist'],
            options,
        );
        const routes = await promisify(execFile)(
            'php',
            ['artisan', 'route:list', '--path=mcp', '--json'],
            options,
        );
        assert.ok(
            JSON.parse(routes.stdout).some((route) => route.uri === 'mcp'),
        );
        const check = await promisify(execFile)(
            'php',
            [
                '-r',
                'require "vendor/autoload.php"; $app = require "bootstrap/app.php"; $response = $app->handle(Illuminate\\Http\\Request::create("/mcp", "POST", [], [], [], ["HTTP_ACCEPT" => "application/json"])); echo $response->getStatusCode();',
            ],
            options,
        );
        assert.equal(check.stdout.trim(), '401');
    },
);
