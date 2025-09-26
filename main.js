import {app, Tray, Menu, nativeImage, BrowserWindow, ipcMain} from 'electron';
import path from 'path';

let tray = null;

app.whenReady().then(() => {
    const icopn = nativeImage.createFromPath(path.join(__dirname, 'assets','icon.png'));
});
