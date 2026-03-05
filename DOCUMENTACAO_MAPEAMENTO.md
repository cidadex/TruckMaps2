# Documentação Técnica: Mapeamento e Fluxo de Manutenção - Sistema ATRUCK

## 1. Visão Geral
O sistema ATRUCK utiliza um mapeamento visual para diagnóstico e execução de manutenção. O fluxo percorre desde a abertura da OS até o laudo final, com rastreabilidade total de tempos e responsáveis.

### Fluxo de Trabalho (Organograma)
```mermaid
graph TD
    A[Abertura da O.S.] -->|Inicia Lead Time| B(Diagnóstico Técnico)
    B -->|Iniciar Diagnóstico| C{Identificar Problemas}
    C -->|Selecionar Serviço no Mapa| D[Registro no JSON]
    D -->|Liberar para Manutenção| E[Geração Automática de Itens]
    
    E --> F{Execução (Manutenção)}
    F -->|Iniciar Item| G[Timer Ativo]
    G -->|Solicitar Peça| H[Aguardando Peça (Timer Pausado)]
    G -->|Solicitar Aprovação| I[Aprovação (Timer Pausado)]
    H -->|Peça Entregue| G
    I -->|Aprovado| G
    
    G -->|Concluir Item| J[Fim do Timer do Item]
    J -->|Todos Itens Concluídos| K(Controle de Qualidade)
    
    K -->|Reprovado| L[Retrabalho (Volta para Manutenção)]
    L --> F
    K -->|Aprovado| M(Laudo Técnico Final)
    M -->|Assinar/Finalizar| N[O.S. Finalizada (Fim Lead Time)]
```

## 2. Configuração do Veículo (Bitrem vs Tritrem)
O sistema adapta os mapas e a quantidade de eixos conforme o tipo de conjunto selecionado na abertura da OS:
- **Bitrem:** Composto por 2 Semi-reboques (SR1 e SR2).
- **Tritrem:** Composto por 3 Semi-reboques (SR1, SR2 e SR3).
- **Estepe:** O SR1 possui um pneu estepe (spare tire) posicionado centralizado na frente da seção, com ID `sr1-estepe`. Presente em Bitrem e Tritrem.
- **5ª Roda:** Mapa visual de inspeção da quinta roda com pontos de inspeção entre os semi-reboques.
  - **Bitrem (3 pontos):** `qr-sr1-frente` (frente SR1), `qr-sr1-tras` (5ª roda atrás SR1), `qr-sr2-frente` (frente SR2).
  - **Tritrem (5 pontos):** `qr-sr1-frente`, `qr-sr1-tras`, `qr-sr2-frente`, `qr-sr2-tras`, `qr-sr3-frente`.
  - Componente: `TruckQuintaRodaMap` (`client/src/components/TruckQuintaRodaMap.tsx`).
  - Categoria de itens: `quinta_roda`. Componentes: Pino-rei, Kit 5ª Roda, 5ª Roda, Outros.
- **Impacto:** A escolha do conjunto altera dinamicamente os componentes `TruckWheelMap`, `MechanicMap` e `TruckQuintaRodaMap`, adicionando ou removendo eixos e pontos de inspeção.

## 3. Abertura da O.S. e Fluxo de Tempos
O ciclo de vida de uma OS é medido de ponta a ponta, com divisões claras para análise de performance:

### A. Tempo Total de Oficina (Lead Time)
- **Início:** No momento exato da criação da OS (botão "Abrir OS").
- **Fim:** No momento da finalização do Laudo Técnico.
- **Cálculo:** `Data Finalização - Data Criação`.

### B. Tempo de Diagnóstico
- **Início:** Quando o técnico clica em "Iniciar Diagnóstico".
- **Fim:** Ao clicar em "Liberar para Manutenção".
- Reflete a eficiência da equipe de recepção e identificação de falhas.

### C. Tempo de Execução (Manutenção Ativa)
- Soma dos tempos em que os itens estiveram com o timer rodando.
- **Aguardando Peça:** Quando um item precisa de peça, o timer desse item é pausado. O "Tempo de Peça" é contabilizado separadamente e não deve penalizar a produtividade do mecânico.
- **Enviado para Aprovação:** Pausa o cronômetro do item enquanto aguarda a decisão do gestor/cliente.

### D. Tempo de Retrabalho
- Ocorre quando um item é reprovado na Qualidade.
- O cronômetro é reiniciado para aquele item e o tempo adicional é somado ao campo `tempoRetrabalho` da OS para fins de custo de má qualidade.

## 4. Estrutura de Dados (JSON)
Os diagnósticos são salvos nos campos:
- `rodas`: Borracharia (Pneus e Rodas).
- `mecanica`: Componentes de chassi e suspensão.
**Formato:** `"ID-PONTO": "[STATUS] Descrição | Tempo: XXmin"`

## 5. Arquivos Chave para Alterações Futuras

### Frontend (client/src/)
- `pages/Corretiva.tsx`: **Arquivo Principal.** Contém toda a lógica de fluxos (Diagnóstico, Manutenção, Qualidade e Laudo). É onde as novas telas e modais devem ser inseridos.
- `components/TruckWheelMap.tsx`: Lógica visual dos eixos e pneus para Bitrem/Tritrem.
- `components/MechanicMap.tsx`: Lógica visual dos pontos mecânicos.
- `components/TruckQuintaRodaMap.tsx`: Lógica visual dos pontos de inspeção da 5ª roda.
- `lib/osApi.ts`: Definição das interfaces (`OS`, `OSItem`) e chamadas de API.
- `lib/data.ts`: Mock de dados e constantes de configuração.

### Backend (server/ & shared/)
- `shared/schema.ts`: **Definição do Banco de Dados.** Adicionar novos campos JSON aqui para novas categorias.
- `server/storage.ts`: Métodos de CRUD (getOS, updateOS, etc).
- `server/routes.ts`: Endpoints da API para manipulação dos itens e status da OS.

## 6. Lógica de Status Visual (Mapa de Manutenção)
- **Cinza:** Sem diagnóstico.
- **Verde:** OK.
- **Amarelo (Pacote):** Aguardando Peça (`aguardandoPeca: true`).
- **Laranja (Escudo):** Aguardando Aprovação (`aguardandoAprovacao: true`).
- **Vermelho:** Reprovado na Qualidade / Retrabalho.
- **Azul com Check:** Executado (`executado: true`).
