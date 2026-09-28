import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';

// Set by the root dev runner when Vite listens on every interface, so Laravel
// pages served on that name load hot-reloaded assets from the same host.
const publicHost = process.env.PLATFORM_PUBLIC_HOST;

export default defineConfig({
    server: publicHost
        ? {
              hmr: { host: publicHost },
              allowedHosts: [publicHost],
              cors: { origin: `http://${publicHost}:8000` },
          }
        : undefined,
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
});
