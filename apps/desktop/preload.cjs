const { contextBridge, ipcRenderer } = require('electron');

// Expose capabilities, never ipcRenderer, arbitrary HTTP, or filesystem access.
contextBridge.exposeInMainWorld('juniorMode', {
    getConnection: () => ipcRenderer.invoke('junior-mode:getConnection'),
    connectPlatform: (url) =>
        ipcRenderer.invoke('junior-mode:connectPlatform', url),
    checkPlatform: () => ipcRenderer.invoke('junior-mode:checkPlatform'),
    disconnectPlatform: () =>
        ipcRenderer.invoke('junior-mode:disconnectPlatform'),
});
