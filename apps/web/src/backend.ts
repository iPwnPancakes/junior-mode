import type { BackendApi, ConnectionState } from '@junior-mode/backend';

declare global {
    interface Window {
        juniorMode?: BackendApi;
    }
}

async function request(
    method: string,
    path: string,
    body?: object,
): Promise<ConnectionState> {
    const response = await fetch(path, {
        method,
        headers: {
            'X-Junior-Mode-Client': 'web',
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.error || 'The local backend could not complete the request.',
        );
    }

    return result;
}

const browserBackend: BackendApi = {
    getConnection: () => request('GET', '/api/connection'),
    connectPlatform: (url) => request('PUT', '/api/connection', { url }),
    checkPlatform: () => request('POST', '/api/connection/check'),
    disconnectPlatform: () => request('DELETE', '/api/connection'),
};

export const backend: BackendApi = window.juniorMode ?? browserBackend;
export const isDesktop = Boolean(window.juniorMode);
