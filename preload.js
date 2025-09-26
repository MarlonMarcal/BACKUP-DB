const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    close: () => ipcRenderer.send('close-config-window'),
    selectDirectory: () => ipcRenderer.invoke("select-directory")
})