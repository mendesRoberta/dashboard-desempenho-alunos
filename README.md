# Dashboard Interativo de Desempenho de Alunos

Aplicação front-end desenvolvida com **Next.js (App Router)**, **React**, **Tailwind CSS**, **Recharts** e **PapaParse** para análise interativa em tempo real de notas acadêmicas a partir de uma planilha pública do Google Sheets.

## Funcionalidades

- **Fonte de Dados Dinâmica (`"use client"`)**: Busca e parse em tempo real do CSV público via `PapaParse` dentro de `useEffect`, tratando valores decimais no padrão brasileiro (`7,2` → `7.2`).
- **Filtro Interativo por Turno**: Menu superior com seleção entre **Todos**, **Manhã**, **Tarde** e **Noite**.
- **Cards de KPI Reativos**:
  - **Média Geral** (dos alunos filtrados)
  - **Maior Média** (maior nota média no filtro ativo + ID do aluno)
  - **Total de Alunos Analisados** (contagem estrita do filtro ativo)
- **Análise de Turno (Gráfico de Barras)**: Comparativo contínuo e fixo da média geral entre **Manhã**, **Tarde** e **Noite** usando todos os dados.
- **Análise de Correlação (Gráfico de Dispersão Interativo)**: Seletores independentes de **Eixo X** e **Eixo Y** acima do gráfico com as opções **Programação**, **Banco de Dados** e **Inteligência Artificial**, cruzando dinamicamente as notas dos alunos filtrados por turno e atualizando o coeficiente de correlação de Pearson.
- **UX & Responsividade**: Estado visual `"Carregando dados da planilha..."`, tratamento de erros com botão de nova tentativa e layout responsivo em Tailwind CSS.

## Como executar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` no navegador.

