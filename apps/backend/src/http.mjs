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
            let result;

            if (route === 'GET /api/connection') {
                result = await backend.getConnection();
            } else if (route === 'DELETE /api/connection') {
                result = await backend.disconnectPlatform();
            } else if (route === 'POST /api/connection/check') {
                result = await backend.checkPlatform();
            } else if (route === 'PUT /api/connection') {
                if (
                    !request.headers['content-type']?.startsWith(
                        'application/json',
                    )
                ) {
                    send(415, { error: 'Expected a JSON request.' });

                    return;
                }

                let body = '';

                for await (const chunk of request) {
                    body += chunk;

                    if (Buffer.byteLength(body) > 16384) {
                        send(413, { error: 'Request is too large.' });

                        return;
                    }
                }

                result = await backend.connectPlatform(JSON.parse(body).url);
            } else {
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
