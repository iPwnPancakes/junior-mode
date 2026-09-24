export function registerBackendIpc(ipcMain, backend, isTrustedSender) {
    const methods = [
        'getCodexState',
        'connectCodex',
        'startChat',
        'openChat',
        'sendMessage',
        'interruptChat',
        'respondToCodex',
        'openPlatformAuthorization',
        'getPlatformAuthorization',
        'beginPlatformAuthorization',
        'completePlatformAuthorization',
        'checkPlatformAuthorization',
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
