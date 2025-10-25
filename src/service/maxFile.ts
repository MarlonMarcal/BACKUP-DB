import fs from "fs";
import path from "path";

/**
 * Garante que a pasta de backup contenha no máximo `maxFiles` arquivos .zip.
 * Se houver mais arquivos .zip que o limite, os mais antigos são excluídos.
 *
 * @param dir Caminho da pasta onde estão os backups
 * @param maxFiles Quantidade máxima de arquivos .zip que devem permanecer
 */
export async function manageBackupFolder(dir: string, maxFiles: string): Promise<void> {
    try {
        // Verifica se a pasta existe
        if (!fs.existsSync(dir)) {
            console.warn(`⚠️ Diretório "${dir}" não existe. Nenhuma ação executada.`);
            return;
        }

        // Lê todos os arquivos do diretório e filtra apenas os .zip
        const files = (await fs.promises.readdir(dir))
            .filter((file) => file.toLowerCase().endsWith(".zip"));

        if (files.length <= Number(maxFiles)) {
            return; // nada a remover
        }

        // Mapeia cada arquivo para seu caminho completo e data de modificação
        const fileStats = await Promise.all(
            files.map(async (file) => {
                const filePath = path.join(dir, file);
                const stats = await fs.promises.stat(filePath);
                return { file: filePath, mtime: stats.mtime };
            })
        );

        // Ordena do mais recente para o mais antigo
        fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

        // Seleciona os arquivos que devem ser excluídos
        const filesToDelete = fileStats.slice(Number(maxFiles));

        for (const oldFile of filesToDelete) {
            try {
                await fs.promises.unlink(oldFile.file);
                console.log(`🗑️ Backup antigo removido: ${path.basename(oldFile.file)}`);
            } catch (err) {
                console.error(`Erro ao excluir ${oldFile.file}:`, err);
            }
        }
    } catch (error) {
        console.error("Erro ao gerenciar backups:", error);
    }
}
