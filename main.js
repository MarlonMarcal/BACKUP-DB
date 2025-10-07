import { app, Tray, Menu, nativeImage, BrowserWindow, ipcMain, dialog, Notification } from 'electron';
const { autoUpdater } = (await import('electron-updater')).default;
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { fork } from "child_process";
import fs from "fs";
import { cwd } from 'process';



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminho do package.json (funciona mesmo quando empacotado)
const packageJsonPath = path.join(app.getAppPath(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

autoUpdater.autoDownload = true;

autoUpdater.on('update-available', () => {
    console.log('Nova versão encontrada. Baixando...');
});

autoUpdater.on('update-downloaded', () => {
    const result = dialog.showMessageBoxSync({
        type: 'info',
        title: 'Atualização disponível',
        message: 'Uma nova versão foi baixada. Deseja reiniciar e instalar agora?',
        buttons: ['Sim', 'Depois']
    });

    if (result === 0) {
        autoUpdater.quitAndInstall();
    }
});

app.whenReady().then(() => {
    autoUpdater.checkForUpdatesAndNotify();
});



let tray = null;
let confWindows = null;
let backupProcess = null;

const configPath = path.join(cwd(), "config.json");

// Cria config.json se não existir
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
                gbakPath: path.resolve(process.cwd(), "utils", "gbak.exe"),
                backupPath: path.resolve(process.cwd(), "backups"),
            },
            null,
            2
        )
    );
}

function showNotification(title, body) {
    new Notification({ title, body }).show();
}

// 🔒 Garante instância única
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        // Se já existir, traz a janela de config para frente
        if (confWindows) {
            if (confWindows.isMinimized()) confWindows.restore();
            confWindows.focus();
        }
    });

    app.whenReady().then(() => {
        let icon = nativeImage.createFromPath(path.join(process.cwd(), 'assets', 'icone.png'));
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
                            icon: icon,
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
                label: 'Fazer Backup Agora',
                click: () => {
                    console.log("Iniciando backup imediato...");
                    backupProcess.send({ type: 'immediateBackup' });
                }
            },
            {
                label: 'Sobre',
                click: () => {
                    const { name, version, author, description } = packageJson;

                    dialog.showMessageBox({
                        type: 'info',
                        title: `Sobre o ${name}`,
                        message: `${name}\nVersão ${version}\n${description}\nDesenvolvido por ${author}`,
                        buttons: ['OK']
                    });
                }
            },
            {
                type: 'separator'
            },
            {
                label: 'Sair',
                click: () => {
                    app.quit();
                }
            }

        ]);

        tray.setToolTip('Backup DB');
        tray.setTitle('Backup DB');
        tray.setContextMenu(contextMenu);

        // ⚠️ Verifique se esse caminho existe no build final
        const isDev = !app.isPackaged;

        const backupPath = isDev
            ? path.join(__dirname, "dist", "backup.js") // dev, usando ts-node ou JS compilado na pasta src
            : path.join(__dirname, "dist", "backup.js");             // build final

        backupProcess = fork(backupPath);


        backupProcess.on("message", (msg) => {
            if (msg.type === "log") {
                if (msg.head === "error") {
                    icon = nativeImage.createFromPath(path.join(process.cwd(), 'assets', 'icon_erro.png'));
                } else if (msg.head === "sucess") {
                    icon = nativeImage.createFromPath(path.join(process.cwd(), 'assets', 'icon_ok.png'));
                } else {
                    icon = nativeImage.createFromPath(path.join(process.cwd(), 'assets', 'icon_erro.png'));
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

            if (result.canceled) {
                return null;
            } else {
                return result.filePaths[0];
            }
        });
    });

    // Impede o app de fechar quando todas as janelas forem fechadas
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
}
