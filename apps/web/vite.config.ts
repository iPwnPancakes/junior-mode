import { hostname } from 'node:os';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
    base: './',
    plugins: [
        react(),
        {
            name: 'junior-mode:csp',
            transformIndexHtml(html) {
                return command === 'serve'
                    ? html.replace(
                          "script-src 'self';",
                          "script-src 'self' 'unsafe-inline';",
                      )
                    : html.replace(
                          "connect-src 'self' ws: wss:;",
                          "connect-src 'none';",
                      );
            },
        },
    ],
    server: {
        host: process.env.DEV_HOST || '127.0.0.1',
        port: Number(process.env.WEB_PORT || 5174),
        strictPort: true,
        allowedHosts: [
            hostname(),
            ...(process.env.PREVIEW_HOST ? [process.env.PREVIEW_HOST] : []),
        ],
        proxy: {
            '/api': {
                target: `http://127.0.0.1:${process.env.BACKEND_PORT || 4318}`,
                changeOrigin: false,
            },
        },
    },
    build: { outDir: '../desktop/renderer', emptyOutDir: true },
}));
