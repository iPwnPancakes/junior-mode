import process from 'node:process';
import { fileURLToPath } from 'node:url';
import concurrently from 'concurrently';
import { loadEnv } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const apps = fileURLToPath(new URL('../', import.meta.url));
const env = { ...loadEnv('development', apps, ''), ...process.env };
const client = !process.argv.includes('--platform');
const platform = !process.argv.includes('--client');

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
    console.log(`Junior Mode browser preview: http://localhost:${env.WEB_PORT}`);
    console.log(`Forward port ${env.WEB_PORT} from your machine.`);
    commands.push(
        { name: 'backend', command: 'pnpm run dev:backend', env, cwd: root },
        { name: 'web', command: 'pnpm run dev:web', env, cwd: root },
    );
}

if (platform) {
    const cwd = fileURLToPath(new URL('../learning-platform/', import.meta.url));
    console.log('Learning platform: http://localhost:8000');
    commands.push(
        {
            name: 'laravel',
            command: 'php artisan serve --host=127.0.0.1 --port=8000 --tries=1',
            cwd,
        },
        {
            name: 'platform-vite',
            command: 'pnpm run dev --host=127.0.0.1 --port=5173 --strictPort',
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
