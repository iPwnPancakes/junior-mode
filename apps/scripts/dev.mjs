import process from 'node:process';
import { fileURLToPath } from 'node:url';
import concurrently from 'concurrently';
import { loadEnv } from 'vite';
import { devOptions } from './dev-options.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const apps = fileURLToPath(new URL('../', import.meta.url));
const env = { ...loadEnv('development', apps, ''), ...process.env };
const { host, client, platform } = devOptions(process.argv.slice(2), env);
env.DEV_HOST = host;
const displayHost =
    host === '0.0.0.0' || host === '::'
        ? 'T3_IP'
        : host.includes(':')
          ? `[${host}]`
          : host;

for (const [name, fallback] of [
    ['WEB_PORT', 5174],
    ['BACKEND_PORT', 4318],
]) {
    const value = Number(env[name] || fallback);

    if (!Number.isInteger(value) || value < 1 || value > 65535) {
        throw new Error(`${name} must be a port between 1 and 65535.`);
    }

    env[name] = String(value);
}

if (env.WEB_PORT === env.BACKEND_PORT) {
    throw new Error('WEB_PORT and BACKEND_PORT must differ.');
}

const commands = [];

if (client) {
    console.log(
        `Junior Mode browser preview: http://${displayHost}:${env.WEB_PORT}`,
    );
    console.log(
        `Listening on ${host}. The Node backend stays on 127.0.0.1:${env.BACKEND_PORT}.`,
    );
    commands.push(
        { name: 'backend', command: 'pnpm run dev:backend', env, cwd: root },
        { name: 'web', command: 'pnpm run dev:web', env, cwd: root },
    );
}

if (platform) {
    const cwd = fileURLToPath(
        new URL('../learning-platform/', import.meta.url),
    );
    console.log(`Learning platform: http://${displayHost}:8000`);
    commands.push(
        {
            name: 'laravel',
            command: `php artisan serve --host=${host} --port=8000 --tries=1`,
            cwd,
        },
        {
            name: 'platform-vite',
            command: `pnpm run dev --host=${host} --port=5173 --strictPort`,
            cwd,
        },
        {
            name: 'queue',
            command: 'php artisan queue:listen --tries=1 --timeout=0',
            cwd,
        },
    );
}

const { result } = concurrently(commands, {
    prefix: 'name',
    killOthersOn: ['success', 'failure'],
    killTimeout: 3000,
});

try {
    await result;
} catch {
    process.exitCode = 1;
}
