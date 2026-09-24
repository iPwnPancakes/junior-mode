export function serverUrl(value) {
    if (typeof value !== 'string') {
        throw new Error('Enter a server address.');
    }

    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) {
        throw new Error('Use an HTTP or HTTPS server address.');
    }

    if (
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== '/'
    ) {
        throw new Error(
            'Enter the server origin only, such as https://junior.example.com.',
        );
    }

    return url.origin;
}
