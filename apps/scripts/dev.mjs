import process from 'node:process';
import concurrently from 'concurrently';
import { loadEnv } from 'vite';

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env };

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

console.log(`Junior Mode browser preview: http://localhost:${env.WEB_PORT}`);
console.log(
    `Forward port ${env.WEB_PORT} from your machine. Laravel runs separately.`,
);

const { result } = concurrently(
    [
        { name: 'backend', command: 'npm run dev:backend', env },
        { name: 'web', command: 'npm run dev:web', env },
    ],
    { prefix: 'name', killOthersOn: ['success', 'failure'], killTimeout: 3000 },
);

try {
    await result;
} catch {
    process.exitCode = 1;
}
