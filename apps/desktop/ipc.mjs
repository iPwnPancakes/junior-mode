export function registerBackendIpc(ipcMain, backend, isTrustedSender) {
    const methods = [
        'getConnection',
        'connectPlatform',
        'checkPlatform',
        'disconnectPlatform',
    ];

    for (const method of methods) {
        ipcMain.handle(`junior-mode:${method}`, (event, ...args) => {
            if (!isTrustedSender(event)) {
                throw new Error('Untrusted app frame.');
            }

            return backend[method](...args);
        });
    }
}
