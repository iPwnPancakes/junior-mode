import { serverUrl } from '@junior-mode/backend/server-url';

export function rendererLocation(argv, env, packaged) {
    const argument = argv.find((value) => value.startsWith('--url='));
    const value = argument
        ? argument.slice('--url='.length)
        : env.JUNIOR_RENDERER_URL;

    if (value && !packaged) {
        return `${serverUrl(value)}/`;
    }

    return new URL('./renderer/index.html', import.meta.url).href;
}

export function isRendererUrl(value, renderer) {
    try {
        const url = new URL(value);
        const expected = new URL(renderer);
        url.hash = '';
        expected.hash = '';

        return url.href === expected.href;
    } catch {
        return false;
    }
}
