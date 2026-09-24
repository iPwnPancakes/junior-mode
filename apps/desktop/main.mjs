import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createBackend } from '@junior-mode/backend';
import {
    app,
    BrowserWindow,
    dialog,
    ipcMain,
    Menu,
    safeStorage,
    shell,
} from 'electron';
import { registerBackendIpc } from './ipc.mjs';
import { rendererLocation, isRendererUrl } from './renderer-url.mjs';

const renderer = rendererLocation(process.argv, process.env, app.isPackaged);
const preload = fileURLToPath(new URL('./preload.cjs', import.meta.url));
let window;

async function createWindow() {
    window = new BrowserWindow({
        title: 'Junior Mode',
        width: 1120,
        height: 850,
        minWidth: 480,
        minHeight: 600,
        backgroundColor: '#f6f7f3',
        webPreferences: {
            preload,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
    });

    const contents = window.webContents;
    contents.session.setPermissionRequestHandler(
        (_contents, _permission, callback) => callback(false),
    );
    contents.session.setPermissionCheckHandler(() => false);
    contents.on('will-attach-webview', (event) => event.preventDefault());
    contents.on('will-navigate', (event, url) => {
        if (!isRendererUrl(url, renderer)) {
            event.preventDefault();
        }
    });
    contents.on('will-redirect', (event, url) => {
        if (!isRendererUrl(url, renderer)) {
            event.preventDefault();
        }
    });
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));

    try {
        await window.loadURL(renderer);
    } catch {
        dialog.showErrorBox(
            'Could not open Junior Mode',
            'For development, start the web preview and check your --url address or SSH tunnel. For the bundled app, run pnpm build:client from the repository root first.',
        );
        app.quit();
    }
}

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
    }
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.whenReady()
    .then(async () => {
        const backend = await createBackend({
            settingsPath: join(app.getPath('userData'), 'connection.json'),
            marketplaceRoot: app.isPackaged
                ? join(process.resourcesPath, 'coaching-marketplace')
                : fileURLToPath(new URL('../../', import.meta.url)),
            openExternal: (url) => shell.openExternal(url),
            credentialCodec: {
                encrypt(value) {
                    if (
                        !safeStorage.isEncryptionAvailable() ||
                        (process.platform === 'linux' &&
                            safeStorage.getSelectedStorageBackend() ===
                                'basic_text')
                    )
                        throw new Error(
                            'Secure credential storage is unavailable. Enable your operating system keyring and try again.',
                        );
                    return safeStorage.encryptString(value);
                },
                decrypt: (value) => safeStorage.decryptString(value),
            },
        });
        app.on('before-quit', () => backend.dispose());
        backend.subscribeCodex((state) => {
            if (
                window &&
                !window.isDestroyed() &&
                isRendererUrl(window.webContents.getURL(), renderer)
            ) {
                window.webContents.send('junior-mode:codex-state', state);
            }
        });
        registerBackendIpc(ipcMain, backend, (event) =>
            Boolean(
                window &&
                !window.isDestroyed() &&
                event.sender === window.webContents &&
                event.senderFrame === window.webContents.mainFrame &&
                isRendererUrl(event.senderFrame.url, renderer),
            ),
        );

        Menu.setApplicationMenu(
            Menu.buildFromTemplate([
                ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
                { role: 'fileMenu' },
                { role: 'editMenu' },
                { role: 'viewMenu' },
                { role: 'windowMenu' },
            ]),
        );

        await createWindow();
    })
    .catch((error) => {
        dialog.showErrorBox('Could not start Junior Mode', error.message);
        app.quit();
    });
