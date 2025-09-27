export interface Agendamento {
    dia: string;     // "0" a "6"
    hora: string;    // "HH:MM"
    todos: boolean;  // true = todos os dias
}

/**
 * Converte agendamentos em expressões cron do node-cron
 */
export function agendamentoParaCron(ag: Agendamento): string {
    const [hh, mm] = ag.hora.split(":");

    if (ag.todos) {
        // Exemplo: "00 02 * * *" -> todos os dias às 02:00
        return `${mm} ${hh} * * *`;
    } else {
        // Exemplo: "30 15 * * 3" -> toda quarta às 15:30
        return `${mm} ${hh} * * ${ag.dia}`;
    }
}

/**
 * Converte uma lista de agendamentos em cron
 */
export function gerarCrons(lista: Agendamento[]): string[] {
    return lista.map(agendamentoParaCron);
}
