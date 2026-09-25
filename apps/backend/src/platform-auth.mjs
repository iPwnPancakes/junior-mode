import { Buffer } from 'node:buffer';
import { serverUrl } from './server-url.mjs';

export async function createPlatformAuthorization({
    storage,
    getUrl,
    fetchImpl,
    credentialCodec,
}) {
    let credentials;
    const secrets = new Set();
    const validCredentials = (value) =>
        value &&
        typeof value.url === 'string' &&
        serverUrl(value.url) === value.url &&
        /^jm_[A-Za-z0-9]{64}$/.test(value.token);
    let pending;
    let state = {
        status: 'signed-out',
        learner: null,
        client: null,
        authorizationUrl: null,
        userCode: null,
    };
    try {
        const data = storage.getCredentials();
        if (!data) throw new Error('No saved credentials');
        credentials = JSON.parse(
            credentialCodec ? credentialCodec.decrypt(data) : data.toString(),
        );
        if (!validCredentials(credentials)) {
            credentials = undefined;
            throw new Error('Invalid credentials');
        }
        secrets.add(credentials.token);
        state.status = 'unchecked';
    } catch {
        // Missing or unreadable credentials require authorization again.
        credentials = undefined;
    }
    const snapshot = () => structuredClone(state);
    async function request(route, body, authenticated = false) {
        if (!getUrl()) throw new Error('Connect to a learning platform first.');
        if (authenticated && (!credentials || credentials.url !== getUrl()))
            throw new Error('Authorize this learning platform first.');
        let response;
        try {
            response = await fetchImpl(`${getUrl()}${route}`, {
                method: 'POST',
                redirect: 'error',
                signal: AbortSignal.timeout(10000),
                headers: {
                    Accept: 'application/json, text/event-stream',
                    'Content-Type': 'application/json',
                    ...(authenticated
                        ? { Authorization: `Bearer ${credentials.token}` }
                        : {}),
                },
                body: JSON.stringify(body),
            });
        } catch {
            state.status = 'unavailable';
            throw new Error(
                'The learning platform is unavailable. Try again before coaching.',
            );
        }
        if (response.status === 401 || response.status === 403) {
            state.status = 'revoked';
            credentials = undefined;
            storage.clearCredentials();
            throw new Error(
                'Platform authorization was revoked or expired. Authorize again.',
            );
        }
        if (!response.ok)
            throw new Error(
                `The platform could not complete authorization (HTTP ${response.status}).`,
            );
        const raw = await response.text();
        try {
            return JSON.parse(
                raw.startsWith('event:') || raw.startsWith('data:')
                    ? raw
                          .split('\n')
                          .filter((line) => line.startsWith('data:'))
                          .map((line) => line.slice(5).trim())
                          .join('\n')
                    : raw,
            );
        } catch {
            throw new Error('The platform returned an invalid response.');
        }
    }
    async function tool(name, args = {}) {
        const data = await request(
            '/mcp',
            {
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/call',
                params: { name, arguments: args },
            },
            true,
        );
        if (data.error || data.result?.isError)
            throw new Error(
                'The platform could not authorize this coaching operation.',
            );
        const result = data.result?.structuredContent;
        if (!result)
            throw new Error(
                'The platform returned an invalid coaching response.',
            );
        return result;
    }
    return {
        snapshot,
        redact: (value) => {
            for (const secret of secrets)
                value = value.replaceAll(secret, '[redacted]');
            return value;
        },
        processOptions() {
            if (!credentials || credentials.url !== getUrl()) return {};
            return {
                env: {
                    JUNIOR_MODE_TOKEN: credentials.token,
                    JUNIOR_MODE_URL: credentials.url,
                },
                config: {
                    'mcp_servers.junior-mode.url': `${credentials.url}/mcp`,
                    'mcp_servers.junior-mode.bearer_token_env_var':
                        'JUNIOR_MODE_TOKEN',
                    'mcp_servers.junior-mode.enabled': false,
                },
            };
        },
        async clear() {
            credentials = undefined;
            pending = undefined;
            state = {
                status: 'signed-out',
                learner: null,
                client: null,
                authorizationUrl: null,
                userCode: null,
            };
            storage.clearCredentials();
        },
        async begin(name) {
            if (typeof name !== 'string' || !name.trim() || name.length > 100)
                throw new Error('Enter a client name of 1–100 characters.');
            const data = await request('/mcp/client-authorizations', {
                name: name.trim(),
            });
            if (
                typeof data.device_code !== 'string' ||
                !data.device_code ||
                !Number.isFinite(data.expires_in) ||
                data.expires_in <= 0
            )
                throw new Error(
                    'The platform returned invalid authorization details.',
                );
            secrets.add(data.device_code);
            const url = new URL(data.authorization_url);
            if (
                url.origin !== new URL(getUrl()).origin ||
                url.search ||
                url.hash ||
                url.username ||
                url.password ||
                !/^\/codex\/authorize\/[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/.test(
                    url.pathname,
                )
            )
                throw new Error(
                    'The platform returned an invalid approval URL.',
                );
            pending = {
                code: data.device_code,
                expires: Date.now() + Math.min(data.expires_in, 600) * 1000,
            };
            state = {
                ...state,
                status: 'pending',
                authorizationUrl: url.href,
                userCode: data.user_code,
            };
            return snapshot();
        },
        async complete() {
            if (!pending || Date.now() >= pending.expires)
                throw new Error('Start a new authorization request.');
            const data = await request('/mcp/client-authorizations/token', {
                device_code: pending.code,
            });
            if (data.status === 'authorization_pending') return snapshot();
            if (
                typeof data.access_token !== 'string' ||
                !/^jm_[A-Za-z0-9]{64}$/.test(data.access_token)
            )
                throw new Error('The platform returned invalid credentials.');
            const nextCredentials = { url: getUrl(), token: data.access_token };
            secrets.add(data.access_token);
            const value = JSON.stringify(nextCredentials);
            storage.setCredentials(
                credentialCodec
                    ? credentialCodec.encrypt(value)
                    : Buffer.from(value),
            );
            credentials = nextCredentials;
            pending = undefined;
            return this.check();
        },
        async check() {
            const identity = await tool('identify-client');
            state = {
                status: 'authorized',
                learner: identity.learner.name,
                client: identity.client.name,
                authorizationUrl: null,
                userCode: null,
            };
            return snapshot();
        },
        tool,
    };
}
