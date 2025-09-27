let agendamentos = []; // [{ dia: "1", hora: "02:00", todos: false }, ...]

document.getElementById('btn-add-horario').addEventListener('click', () => {
    const dia = document.getElementById('dia').value;
    const hora = document.getElementById('hora').value;
    const todos = document.getElementById('todos-dias').checked;

    if (!hora) {
        alert("Informe o horário!");
        return;
    }

    const novo = { dia, hora, todos };
    agendamentos.push(novo);
    renderHorarios();
});

function renderHorarios() {
    const tbody = document.querySelector("#tabela-horarios tbody");
    tbody.innerHTML = "";

    agendamentos.forEach((item, index) => {
        const tr = document.createElement("tr");

        const tdDia = document.createElement("td");
        tdDia.textContent = item.todos ? "Todos os dias" : traduzDia(item.dia);

        const tdHora = document.createElement("td");
        tdHora.textContent = item.hora;

        const tdAcoes = document.createElement("td");
        const btn = document.createElement("button");
        btn.textContent = "Remover";
        btn.onclick = () => {
            agendamentos.splice(index, 1);
            renderHorarios();
        };
        tdAcoes.appendChild(btn);

        tr.appendChild(tdDia);
        tr.appendChild(tdHora);
        tr.appendChild(tdAcoes);
        tbody.appendChild(tr);
    });
}

function traduzDia(valor) {
    const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return dias[parseInt(valor)];
}
