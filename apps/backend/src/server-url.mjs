export function serverUrl(value) {
    if (typeof value !== 'string') {
        throw new Error('Enter a server address.');
    }

    const url = new URL(value);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
        throw new Error(
            'Use HTTPS, or HTTP on localhost through an SSH tunnel.',
        );
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
