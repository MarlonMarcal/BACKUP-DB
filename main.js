import {app, Tray, Menu, nativeImage, BrowserWindow, ipcMain, dialog} from 'electron';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let tray = null;
let confWindows = null;

app.whenReady().then(() => {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets','icon_erro.png'));
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Config',
            click: () => {
                if (!confWindows){
                    confWindows = new BrowserWindow({
                        width: 600,
                        height: 600,
                        autoHideMenuBar: true,
                        resizable: false,
                        maximizable: false,
                        minimizable: false,
                        title: "Configurações",
                        webPreferences: {
                            contextIsolation: true,
                            nodeIntegration: false,
                            preload: path.join(__dirname, 'preload.js')
                        }
                    });
                    confWindows.on('closed', () => {
                        confWindows = null;
                    });
                    confWindows.loadFile(path.join(__dirname,"src","pages","config.html")); 
                }
            }
        },
        {
            label: 'Sair',
            click: () => {
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Backup DB');
    tray.setContextMenu(contextMenu);

    ipcMain.on('close-config-window', () => {
        if (confWindows) {
            confWindows.close();
            confWindows = null;
        }
    });

    ipcMain.handle("select-directory", async () => {
        const result = await dialog.showOpenDialog(confWindows, {
            properties: ['openDirectory']
        });

        console.log(result);

        if (result.canceled) {
            return null;
        } else {
            return result.filePaths[0];
        }
        

        
    })

})

// Impede o app de fechar quando janelas forem fechadas
app.on("window-all-closed", (event) => {
    event.preventDefault();
});

