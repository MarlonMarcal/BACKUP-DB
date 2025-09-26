

function fechar(){
    api.close();
}

/*function selecionarDiretorio(){

        console.log("clicou em selecionar diretorio");

        const dir = api.selectDirectory();
        if (dir) {
            document.getElementById("salvar").value = dir;
        }

    }*/


    document.getElementById("btn-selecionar").addEventListener("click", async () => {
    const dir = await api.selectDirectory();
    if (dir) {
        document.getElementById("salvar").value = dir;
    }
});

