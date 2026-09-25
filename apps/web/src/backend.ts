import type { BackendApi, CodexState } from '@junior-mode/backend';

declare global {
    interface Window {
        juniorMode?: BackendApi;
    }
}

async function request<T>(
    method: string,
    path: string,
    body?: object,
): Promise<T> {
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
    browseDirectories: (input) => request('POST', '/api/directories', input),
    getCoachingPlugin: () => request('GET', '/api/coaching-plugin'),
    installCoachingPlugin: () =>
        request('POST', '/api/coaching-plugin/install', {}),
    getCodexState: () => request('GET', '/api/codex'),
    connectCodex: () => request('POST', '/api/codex/connect', {}),
    addProject: (input) => request('POST', '/api/codex/projects', input),
    startChat: (input) => request('POST', '/api/codex/chats', input),
    openChat: (id) => request('POST', '/api/codex/open', { id }),
    sendMessage: (text) => request('POST', '/api/codex/message', { text }),
    interruptChat: () => request('POST', '/api/codex/interrupt', {}),
    respondToCodex: (answer) => request('POST', '/api/codex/respond', answer),
    subscribeCodex: (listener, onError) => {
        const controller = new AbortController();
        async function stream() {
            while (!controller.signal.aborted) {
                try {
                    const response = await fetch('/api/codex/events', {
                        headers: { 'X-Junior-Mode-Client': 'web' },
                        signal: controller.signal,
                    });
                    if (!response.ok || !response.body)
                        throw new Error('Chat event stream is unavailable.');
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    try {
                        while (true) {
                            const { value, done } = await reader.read();
                            if (done)
                                throw new Error(
                                    'Chat connection lost. Reconnecting…',
                                );
                            buffer += decoder.decode(value, { stream: true });
                            let end;
                            while ((end = buffer.indexOf('\n\n')) !== -1) {
                                const event = buffer.slice(0, end);
                                buffer = buffer.slice(end + 2);
                                if (event.startsWith('data: '))
                                    listener(
                                        JSON.parse(
                                            event.slice(6),
                                        ) as CodexState,
                                    );
                            }
                        }
                    } finally {
                        await reader.cancel().catch(() => {});
                    }
                } catch (error) {
                    if (controller.signal.aborted) return;
                    onError?.(
                        error instanceof Error
                            ? error.message
                            : 'Chat connection lost.',
                    );
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                }
            }
        }
        void stream();
        return () => controller.abort();
    },
    openPlatformAuthorization: async () => {
        const state = await browserBackend.getPlatformAuthorization();
        if (state.authorizationUrl)
            window.open(
                state.authorizationUrl,
                '_blank',
                'noopener,noreferrer',
            );
    },
    getPlatformAuthorization: () => request('GET', '/api/authorization'),
    beginPlatformAuthorization: (name) =>
        request('POST', '/api/authorization/begin', { name }),
    completePlatformAuthorization: () =>
        request('POST', '/api/authorization/complete', {}),
    checkPlatformAuthorization: () =>
        request('POST', '/api/authorization/check', {}),
    getConnection: () => request('GET', '/api/connection'),
    connectPlatform: (url) => request('PUT', '/api/connection', { url }),
    checkPlatform: () => request('POST', '/api/connection/check'),
    disconnectPlatform: () => request('DELETE', '/api/connection'),
};

export const backend: BackendApi = window.juniorMode ?? browserBackend;
export const isDesktop = Boolean(window.juniorMode);
