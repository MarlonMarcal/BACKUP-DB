import { app, Tray, Menu, nativeImage, BrowserWindow, ipcMain, dialog, Notification } from 'electron';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { fork } from "child_process";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let tray = null;
let confWindows = null;
let backupProcess = null;

const configPath = path.join(process.cwd(), "config.json");

if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
        configPath,
        JSON.stringify(
            {
                host: "localhost",
                port: 3050,
                database: "",
                user: "SYSDBA",
                password: "masterkey",
                gbakPath: "C:\\Program Files\\Firebird\\Firebird_3_0\\gbak.exe",
                backupPath: "C:\\BASE\\"
            },
            null,
            2
        )
    );
}



function showNotification(title, body) {
    new Notification({ title, body }).show();
}

app.whenReady().then(() => {
    let icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icone.png'));
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Config',
            click: () => {
                if (!confWindows) {
                    confWindows = new BrowserWindow({
                        width: 600,
                        height: 600,
                        autoHideMenuBar: true,
                        resizable: false,
                        maximizable: false,
                        minimizable: false,
                        title: "Configurações",
                        webPreferences: {
                            contextIsolation: false,
                            nodeIntegration: true,
                            preload: path.join(__dirname, 'preload.js')
                        }
                    });
                    confWindows.on('closed', () => {
                        confWindows = null;
                    });
                    confWindows.loadFile(path.join(__dirname, "src", "pages", "config.html"));
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

    backupProcess = fork(path.join(__dirname, 'dist', 'backup.js'));

    backupProcess.on("message", (msg) => {
        if (msg.type === "log") {

            if (msg.head === "error") {
                icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon_erro.png'));
            } if (msg.head === "sucess") {
                icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon_ok.png'));
            } else {
                icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon_reload.png'));
            }
            tray.setImage(icon);

            showNotification("Backup DB", msg.message);
        }
    });


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

// IPC Config
ipcMain.handle("get-config", () => {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
});

ipcMain.handle("save-config", (event, config) => {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
});

