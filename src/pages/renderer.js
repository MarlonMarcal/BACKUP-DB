

function fechar() {
    api.close();
}


document.getElementById("btn-selecionar").addEventListener("click", async () => {
    const dir = await api.selectDirectory();
    if (dir) {
        document.getElementById("salvar").value = dir;
    }
});

