# Processo de Gestão de Manutenção - Sistema ATRUCK

Este documento descreve o fluxo operacional completo do sistema, desde a abertura da Ordem de Serviço (O.S.) até a geração do relatório final, detalhando como o tempo é contabilizado em cada etapa.

---

## 1. Abertura da O.S. (Check-in)
O processo começa quando o veículo chega à unidade.
- **Identificação**: São registradas as placas (Cavalo, SR1 e SR2/SR3 conforme o conjunto).
- **Triagem Inicial**: O motorista ou recepcionista seleciona as categorias de problemas (Estrutural, Elétrica, Borracharia, etc.).
- **Registro de Itens**: Descrição básica dos problemas relatados.
- **Data de Criação**: O sistema registra o momento exato da abertura, que servirá como base para o indicador de tempo em pátio.

## 2. Diagnóstico Técnico
Após a abertura, a O.S. fica disponível para os técnicos de diagnóstico.
- **Início do Diagnóstico**: O tempo começa a contar quando o técnico assume a O.S. no painel de diagnóstico.
- **Detalhamento Técnica**: Para cada item relatado, o técnico deve definir:
    - **Ação**: O que será feito (Ajustar, Trocar, Soldar, etc.).
    - **Item Específico**: Qual componente exato (ex: Pneu, Sinaleira).
    - **Tempo Estimado**: Quantos minutos são previstos para aquela tarefa.
- **Borracharia (Sistema Visual)**: No caso de pneus, o técnico usa o mapa visual do veículo para marcar a posição exata e a ação necessária.
- **Finalização do Diagnóstico**: Ao concluir, o sistema registra o **Fim do Diagnóstico**. Este horário é crucial, pois marca o **Início Automático da Manutenção**.

## 3. Execução da Manutenção
A O.S. entra na fila de manutenção com o status "Em Manutenção".
- **Contagem de Tempo**: O cronômetro de manutenção é baseado no tempo estimado pelo diagnóstico.
- **Início Real**: Considerado o momento em que a O.S. saiu do diagnóstico.
- **Gestão de Interrupções**:
    - **Aguardando Peça**: Se o técnico pausar para esperar uma peça, o tempo é "congelado" para não prejudicar a eficiência do técnico, mas continua contando no tempo total da O.S.
    - **Aguardando Aprovação**: Pausa o cronômetro enquanto aguarda autorização do cliente/empresa.
- **Execução de Itens**: O técnico marca cada item como "Concluído" individualmente.

## 4. Controle de Qualidade e Retrabalho
Quando todos os itens são finalizados, a O.S. vai para a "Verificação Final" (Qualidade).
- **Fim da Manutenção**: Ocorre no momento em que a O.S. é enviada para a qualidade.
- **Aprovação**: Se tudo estiver correto, a O.S. é finalizada.
- **Reprovação (Retrabalho)**: Se um item não estiver a contento:
    - O avaliador reprova o item e descreve o motivo.
    - A O.S. **volta para a Manutenção**.
    - **Contabilização de Tempo**: O tempo gasto anteriormente é preservado, e um novo ciclo de contagem começa para o item reprovado. No relatório, esse tempo extra aparece somado ao tempo total de execução.

## 5. Relatórios e Exportação XLS
O relatório final (XLS) consolida todos os dados para análise de performance.
- **Colunas Detalhadas**:
    - **Nº O.S.**: Identificador único.
    - **Placa**: Conjunto completo identificado.
    - **Data/Hora Início**: Momento em que a O.S. saiu do diagnóstico e entrou em manutenção.
    - **Data/Hora Fim**: Momento em que a manutenção foi concluída e enviada para a qualidade.
    - **Tempo Total**: Cálculo real (Fim - Início) formatado (ex: 2h 15min).
    - **Grupo/Ação/Objeto**: Detalhamento de cada serviço realizado por linha.

---
**Nota sobre Produtividade**: O sistema diferencia o "Tempo em Pátio" (Abertura até Finalização) do "Tempo de Chave" (Tempo efetivo de trabalho do técnico), permitindo identificar gargalos logísticos ou operacionais.