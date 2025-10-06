
import { exec } from "node:child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cron, { type ScheduledTask } from "node-cron";
import { gerarCrons } from "./cron-utils.js";

// Definindo __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebirdConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    gbakPath: string;
    backupPath: string;
    schedules?: { dia: string; hora: string; todos: boolean }[];
}

// ---------------- Funções utilitárias ----------------
function generateBackupFileName(basePath: string, dbName: string): string {
    const dataHoraAtual = new Date();

    const formatter = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    const parts = formatter.formatToParts(dataHoraAtual);
    const dateMap: Record<string, string> = {};
    parts.forEach(p => {
        if (p.type !== "literal") {
            dateMap[p.type] = p.value;
        }
    });

    const timestamp = `${dateMap.year}${dateMap.month}${dateMap.day}-${dateMap.hour}${dateMap.minute}${dateMap.second}`;
    return path.join(basePath, `${dbName}-${timestamp}.fbk`);
}

const configPath = path.join(process.cwd(), "config.json");

function loadConfig(): FirebirdConfig {
    try {
        const raw = fs.readFileSync(configPath, "utf-8");
        const parsed: Partial<FirebirdConfig> = JSON.parse(raw);

        const defaults: FirebirdConfig = {
            host: "localhost",
            port: 3050,
            database: "",
            user: "SYSDBA",
            password: "masterkey", 
            gbakPath: path.resolve(process.cwd(), "utils","gbak.exe"),  //"C:/Program Files/Firebird/Firebird_3_0/gbak.exe"
            backupPath: path.resolve(process.cwd(), "backups"),
            schedules: []
        };

        return { ...defaults, ...parsed };
    } catch (err) {
        throw new Error(`Erro ao carregar config.json: ${(err as Error).message}`);
    }
}

function sendLog(type: string, head: 'error' | 'info', message: string) {
    if (process.send) {
        process.send({ type, head, message });
    }
}

const logFile = path.join(process.cwd(), "backup.log");

function backupDatabase(cfg: FirebirdConfig, backupFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const command =
            `"${cfg.gbakPath}" -b -user ${cfg.user} -password ${cfg.password} ` +
            `"${cfg.host}/${cfg.port}:${cfg.database}" "${backupFile}"`;

        fs.appendFileSync(logFile, `\n[${new Date().toISOString()}] Executando comando: ${command}\n`);
        console.log("Executando:", command);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("Erro ao executar o backup:", error.message);
                fs.appendFileSync(logFile, `[${new Date().toISOString()}] Erro ao executar o backup: ${error.message}\n`);
                reject(error);
                sendLog("log", "error", `Erro ao executar o backup: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error("stderr:", stderr);
                fs.appendFileSync(logFile, `[${new Date().toISOString()}] stderr: ${stderr}\n`);
                sendLog("log", "error", `stderr: ${stderr}`);
            }
            console.log("stdout:", stdout);
            console.log("Backup concluido com sucesso!");
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] Backup concluído com sucesso.\n`);
            resolve();
        });
    });
}

function backupName(databasePath: string): string {
    if (databasePath.includes("/") || databasePath.includes("\\")) {
        databasePath = databasePath.split(/[/\\]/).pop() || databasePath;
    }
    if (databasePath.toUpperCase().endsWith(".FDB")) {
        databasePath = databasePath.slice(0, -4);
    }
    return databasePath;
}

// ---------------- Função para compactar ----------------
function compactBackup(backupFile: string): Promise<string> {

    const sevenZipPath = path.join(process.cwd(),"utils","7za.exe"); // Caminho para o executável 7za

    return new Promise((resolve, reject) => {
        const outputZip = backupFile.replace(/\.fbk$/i, ".zip");
        const command = `"${sevenZipPath}" a -tzip "${outputZip}" "${backupFile}" -y`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("Erro ao compactar:", stderr);
                sendLog("log", "error", `Erro ao compactar: ${stderr}`);
                fs.appendFileSync(logFile, `[${new Date().toISOString()}] Erro ao compactar: ${stderr}\n`);
                reject(error);
            } else {
                console.log("Backup compactado em:", outputZip);
                fs.appendFileSync(logFile, `[${new Date().toISOString()}] Backup compactado em: ${outputZip}\n`);
                resolve(outputZip);
                // Remove o arquivo .fbk original após compactação
                fs.unlinkSync(backupFile);
            }
        });
    });
}

// ---------------- Controle de Configuração Dinâmica ----------------
let config: FirebirdConfig = loadConfig();
let tasks: ScheduledTask[] = [];

function startSchedules() {
    tasks.forEach(t => t.stop());
    tasks = [];

    if (config.schedules && config.schedules.length > 0) {
        const crons = gerarCrons(config.schedules);
        console.log("Recriando CRONs:", crons);
        fs.appendFileSync(logFile, `\n[${new Date().toISOString()}] Recriando CRONs: ${crons.join(", ")}\n`);

        crons.forEach((expressao) => {
            const task = cron.schedule(expressao, async () => {
                const dbName = backupName(config.database);
                const backupFile = generateBackupFileName(config.backupPath, dbName);

                console.log("Iniciando backup agendado as", new Date().toLocaleString());
                fs.appendFileSync(logFile, `[${new Date().toISOString()}] Iniciando backup agendado às ${new Date().toLocaleString()}\n`);

                await backupDatabase(config, backupFile)
                    .then(() => compactBackup(backupFile))
                    .then(() => console.log("Backup e compactacao finalizados."))
                    .catch((err) => console.error("Falha no processo:", err));
            });

            tasks.push(task);
        });
    }
}

// Primeira inicialização
startSchedules();

// Observa mudanças no config.json
fs.watch(configPath, (eventType) => {
    if (eventType === "change") {
        try {
            console.log("Detectada alteracao no config.json, recarregando...");
            fs.appendFileSync(logFile, `\n[${new Date().toISOString()}] Detectada alteracao no config.json, recarregando...\n`);
            config = loadConfig();
            startSchedules();
        } catch (err) {
            console.error("Erro ao recarregar config:", err);
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] Erro ao recarregar config: ${(err as Error).message}\n`);
            sendLog("log", "error", `Erro ao recarregar config: ${(err as Error).message}`);
        }
    }
});
