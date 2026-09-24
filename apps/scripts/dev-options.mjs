import { isIP } from 'node:net';
import { parseArgs } from 'node:util';

export function devOptions(args, env = {}) {
    const { values } = parseArgs({
        args,
        options: {
            host: { type: 'string' },
            client: { type: 'boolean' },
            platform: { type: 'boolean' },
        },
    });
    const host = values.host ?? (env.DEV_HOST || '127.0.0.1');
    // This value is used in subprocess arguments. Accept only a literal IP or
    // hostname, never shell syntax, a URL, or an option masquerading as a host.
    if (
        !isIP(host) &&
        !/^[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(host)
    ) {
        throw new Error('--host must be an IP address or hostname.');
    }
    if (values.client && values.platform) {
        throw new Error('Choose --client or --platform, not both.');
    }
    return { host, client: !values.platform, platform: !values.client };
}
