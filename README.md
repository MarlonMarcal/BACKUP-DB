# BACKUP-DB

Este programa foi desenvolvido para agendar backups automáticos de bancos de dados Firebird SQL. Ele facilita a proteção dos dados, garantindo que cópias de segurança sejam realizadas periodicamente sem intervenção manual.

## Recursos

- **Agendamento de Backups**  
    Permite configurar horários específicos para execução automática dos backups.

- **Suporte ao Firebird SQL**  
    Compatível com bancos de dados Firebird, utilizando ferramentas nativas para backup.

- **Configuração Simples**  
    Interface intuitiva para definir parâmetros como caminho do banco, destino do backup e frequência.

- **Notificações**  
    Envia alertas sobre o status dos backups (sucesso, falha, etc.).

- **Histórico de Backups**  
    Mantém registro das operações realizadas, facilitando auditoria e restauração.

- **Backup Manual**  
    Possibilidade de iniciar backups sob demanda, além dos agendados.

- **Personalização**  
    Permite configurar opções avançadas, como compressão dos arquivos e retenção de backups antigos.

## Como Usar

1. **Configuração Inicial:**  
     Defina o caminho do banco de dados Firebird e o diretório de destino dos backups.

2. **Agendamento:**  
     Escolha os horários e frequência dos backups automáticos.

3. **Monitoramento:**  
     Acompanhe o status dos backups e consulte o histórico diretamente pela interface.

## Requisitos

- Firebird SQL instalado
- Node.js e ElectronJS
- Permissões de acesso ao banco de dados e ao diretório de backup

## Licença

Este projeto é distribuído sob a licença MIT.
