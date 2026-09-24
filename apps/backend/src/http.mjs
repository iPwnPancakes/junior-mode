import { createServer } from 'node:http';

export function createBackendServer(backend) {
    return createServer(async (request, response) => {
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');

        const send = (status, body) => {
            response.writeHead(status);
            response.end(JSON.stringify(body));
        };

        try {
            // Browsers can reach the local backend only through the same-origin
            // preview. A custom header also prevents cross-site form submissions.
            const origin = request.headers.origin;

            if (
                request.headers['x-junior-mode-client'] !== 'web' ||
                (origin && new URL(origin).host !== request.headers.host)
            ) {
                send(403, {
                    error: 'Request must come from the Junior Mode app.',
                });

                return;
            }

            const route = `${request.method} ${request.url}`;
            if (route === 'GET /api/codex/events') {
                response.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    Connection: 'keep-alive',
                    'X-Accel-Buffering': 'no',
                });
                let blocked = false;
                let latest;
                const writeState = (state) => {
                    if (blocked) {
                        // Coalesce snapshots while the socket drains. Keep at
                        // most one pending state, without losing final output.
                        latest = state;
                        return;
                    }
                    blocked = !response.write(
                        `data: ${JSON.stringify(state)}\n\n`,
                    );
                };
                const unsubscribe = backend.subscribeCodex(writeState);
                response.on('drain', () => {
                    blocked = false;
                    if (latest) {
                        const state = latest;
                        latest = undefined;
                        writeState(state);
                    }
                });
                const heartbeat = setInterval(() => {
                    if (!blocked) blocked = !response.write(': heartbeat\n\n');
                }, 15000);
                response.on('close', () => {
                    clearInterval(heartbeat);
                    unsubscribe();
                });
                return;
            }
            let body;
            if (
                request.method === 'PUT' ||
                (request.method === 'POST' &&
                    request.url !== '/api/connection/check')
            ) {
                if (
                    !request.headers['content-type']?.startsWith(
                        'application/json',
                    )
                ) {
                    send(415, { error: 'Expected a JSON request.' });
                    return;
                }
                const chunks = [];
                let size = 0;
                const maxSize = request.url.startsWith('/api/codex/')
                    ? 65536
                    : 16384;
                for await (const chunk of request) {
                    chunks.push(chunk);
                    size += chunk.length;
                    if (size > maxSize) {
                        send(413, { error: 'Request is too large.' });
                        return;
                    }
                }
                body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            }
            let result;
            switch (route) {
                case 'GET /api/connection':
                    result = await backend.getConnection();
                    break;
                case 'DELETE /api/connection':
                    result = await backend.disconnectPlatform();
                    break;
                case 'POST /api/connection/check':
                    result = await backend.checkPlatform();
                    break;
                case 'PUT /api/connection':
                    result = await backend.connectPlatform(body.url);
                    break;
                case 'GET /api/codex':
                    result = await backend.getCodexState();
                    break;
                case 'POST /api/codex/connect':
                    result = await backend.connectCodex();
                    break;
                case 'POST /api/codex/chats':
                    result = await backend.startChat(body);
                    break;
                case 'POST /api/codex/open':
                    result = await backend.openChat(body.id);
                    break;
                case 'POST /api/codex/message':
                    result = await backend.sendMessage(body.text);
                    break;
                case 'POST /api/codex/interrupt':
                    result = await backend.interruptChat();
                    break;
                case 'POST /api/codex/respond':
                    result = await backend.respondToCodex(body);
                    break;
                default:
                    send(404, { error: 'Unknown backend operation.' });
                    return;
            }

            send(200, result);
        } catch (error) {
            send(400, {
                error: error.message || 'The request could not be completed.',
            });
        }
    });
}
