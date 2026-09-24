const { contextBridge, ipcRenderer } = require('electron');

// Expose capabilities, never ipcRenderer, arbitrary HTTP, or filesystem access.
contextBridge.exposeInMainWorld('juniorMode', {
    getCodexState: () => ipcRenderer.invoke('junior-mode:getCodexState'),
    connectCodex: () => ipcRenderer.invoke('junior-mode:connectCodex'),
    startChat: (input) => ipcRenderer.invoke('junior-mode:startChat', input),
    openChat: (id) => ipcRenderer.invoke('junior-mode:openChat', id),
    sendMessage: (text) => ipcRenderer.invoke('junior-mode:sendMessage', text),
    interruptChat: () => ipcRenderer.invoke('junior-mode:interruptChat'),
    respondToCodex: (answer) =>
        ipcRenderer.invoke('junior-mode:respondToCodex', answer),
    subscribeCodex: (listener, onError) => {
        const handler = (_event, state) => listener(state);
        ipcRenderer.on('junior-mode:codex-state', handler);
        ipcRenderer
            .invoke('junior-mode:getCodexState')
            .then(listener)
            .catch((error) => onError?.(error.message));
        return () =>
            ipcRenderer.removeListener('junior-mode:codex-state', handler);
    },
    getConnection: () => ipcRenderer.invoke('junior-mode:getConnection'),
    connectPlatform: (url) =>
        ipcRenderer.invoke('junior-mode:connectPlatform', url),
    checkPlatform: () => ipcRenderer.invoke('junior-mode:checkPlatform'),
    disconnectPlatform: () =>
        ipcRenderer.invoke('junior-mode:disconnectPlatform'),
});
