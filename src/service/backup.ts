import { exec } from "node:child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { gerarCrons } from "./cron-utils.js";

// Definindo __dirname em módulos ES

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do banco
interface FirebirdConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    gbakPath: string; // Caminho do gbak.exe
    backupPath: string; // Arquivo de saída .fbk
    schedules?: { dia: string; hora: string; todos: boolean }[]; // Agendamentos
}

// Função para gerar nome do arquivo com data e hora
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

    // Ex: 26/09/2025 22:45:10
    const parts = formatter.formatToParts(dataHoraAtual);

    const dateMap: Record<string, string> = {};
    parts.forEach(p => {
        if (p.type !== "literal") {
            dateMap[p.type] = p.value;
        }
    });

    const timestamp = `${dateMap.year}${dateMap.month}${dateMap.day}-${dateMap.hour}${dateMap.minute}${dateMap.second}`;

    const fileName = `${dbName}-${timestamp}.fbk`;
    return path.join(basePath, fileName);
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
            gbakPath: "C:/Program Files/Firebird/Firebird_3_0/gbak.exe",
            backupPath: path.resolve(__dirname, "../backups/backup.fbk"),

        }

        const finalConfig: FirebirdConfig = { ...defaults, ...parsed };

        return finalConfig;
    } catch (err) {
        throw new Error(`Erro ao carregar config.json: ${(err as Error).message}`);
    }

}

const options = loadConfig();


const config: FirebirdConfig = {
    host: options.host,
    port: options.port,
    database: options.database,
    user: options.user,
    password: options.password,
    gbakPath: options.gbakPath,
    backupPath: options.backupPath,
    schedules: options.schedules ?? []
};

function sendLog(type: string, head: string, message: string) {

    if (process.send) {
        process.send({ type: type, head: head, message: message });
    }

}

const logFile = path.join(process.cwd(), "backup.log");

// Função para rodar o backup
function backupDatabase(cfg: FirebirdConfig, backupFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const command = `"${cfg.gbakPath}" -b -user ${cfg.user} -password ${cfg.password} ` +
            `"${cfg.host}/${cfg.port}:${cfg.database}" "${backupFile}"`;

        fs.appendFileSync(logFile, `\n[${new Date().toISOString()}] Executando comando: ${command}\n`);

        console.log("Executando:", command);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("Erro ao executar o backup:", error.message);
                reject(error);
                sendLog("log", "error", `Erro ao executar o backup: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error("stderr:", stderr);
                sendLog("log", "error", `stderr: ${stderr}`);
            }
            console.log("stdout:", stdout);
            console.log("Backup concluído com sucesso!");
            sendLog("log", "sucess", "Backup concluído com sucesso!");
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] Backup concluído com sucesso.\n`);
            resolve();
        });
    });
}


if (config.schedules && config.schedules.length > 0) {
    const crons = gerarCrons(config.schedules);
    console.log("Expressões CRON geradas:", crons);

    function backupName(databasePath: string): string {

        if (databasePath.includes("/") || databasePath.includes("\\")) {
            databasePath = databasePath.split(/[/\\]/).pop() || databasePath;
        }
        if (databasePath.toUpperCase().endsWith(".FDB")) {
            databasePath = databasePath.slice(0, -4);
        }
        return databasePath;
    }


    crons.forEach((expressao, idx) => {
        cron.schedule(expressao, async () => {

            const backupFile = generateBackupFileName(config.backupPath, backupName(config.database));

            console.log("Iniciando backup agendado às", new Date().toLocaleString());
            sendLog("log", "info", `Iniciando backup agendado às ${new Date().toLocaleString()}`);

            await backupDatabase(config, backupFile)
                .then(() => console.log("✅ Backup finalizado."))
                .catch((err) => console.error("❌ Falha no backup:", err));
        });
    });
}




