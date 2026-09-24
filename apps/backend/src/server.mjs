import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createBackendServer } from './http.mjs';
import { createBackend } from './index.mjs';

const port = Number(process.env.BACKEND_PORT || 4318);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('BACKEND_PORT must be a port between 1 and 65535.');
}

const backend = await createBackend({
    settingsPath:
        process.env.JUNIOR_SETTINGS_PATH ||
        fileURLToPath(new URL('../../.local/connection.json', import.meta.url)),
});
const server = createBackendServer(backend);
server.listen(port, '127.0.0.1', () => {
    console.log(`Local backend listening on 127.0.0.1:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        backend.dispose();
        server.close();
        server.closeAllConnections();
    });
}
