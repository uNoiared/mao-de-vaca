# FinFlow Pro — Painel de Controle Financeiro Pessoal

Um painel financeiro completo, elegante e moderno projetado para controle total de finanças pessoais, despesas mensais, receitas, orçamentos e fluxo de caixa.

---

## Principais Funcionalidades

### 1. Resumos Financeiros em Tempo Real (KPIs)
- **Saldo Geral Acumulado:** Total de todas as receitas e despesas pagas.
- **Entradas no Período:** Total de receitas dentro do mês selecionado.
- **Despesas no Período:** Total de saídas e gastos do mês.
- **Economia do Mês & Taxa de Poupança:** Cálculo percentual e montante economizado no período.

### 2. Gráficos Interativos Dinâmicos (Chart.js)
- **Evolução Mensal (Entradas vs Despesas):** Gráfico de barras duplas comparando o histórico dos últimos 6 meses.
- **Gastos por Categoria (Rosca / Donut):** Distribuição percentual e visual das despesas por categoria com indicação de maiores gastos.
- **Tendência de Balanço Líquido:** Gráfico de linha com gradiente para acompanhar o fluxo de economia mês a mês.

### 3. Gestão e Controle de Metas de Gastos (Orçamentos)
- Teto de gastos personalizável para cada categoria (Moradia, Alimentação, Transporte, Saúde, Educação, Lazer, etc.).
- Barra de progresso com alertas visuais:
  - Verde: seguro (< 70%)
  - Amarelo: atenção (70% - 90%)
  - Vermelho: limite estourado (> 90% ou excedido)
- Modal para editar limites de orçamento com 1 clique.

### 4. Extrato Completo e Manipulação de Transações
- Cadastro de transações com descrição, valor (R$), categoria, data, forma de pagamento (Pix, Cartão de Crédito, Débito, Dinheiro, etc.) e notas.
- Edição e exclusão rápida.
- Alternância de status com 1 clique: **Concluído (Pago)** ou **Pendente**.
- Busca instantânea por texto na descrição ou categoria.
- Filtro por tipo: Todas, Receitas ou Despesas.
- Filtro por categorias específicas e paginação inteligente.

### 5. Anexar Extrato Bancário & Montagem Automática de Planilha
- **Suporte aos formatos OFX e CSV:** Aceita extratos emitidos pelos principais bancos brasileiros (Nubank, Itaú, Bradesco, Santander, Inter, Banco do Brasil, C6 Bank, Caixa, etc.).
- **Drag & Drop Instantâneo:** Arraste e solte o arquivo diretamente no painel.
- **Categorização Inteligente:** Reconhece automaticamente termos como *iFood, Uber, Supermercado, Aluguel, Salário, Farmácia, Netflix, Posto de Gasolina* e atribui a categoria e método de pagamento.
- **Planilha Interativa de Conciliação:** Veja todos os lançamentos em formato de planilha antes de importar, ajuste categorias pontualmente e marque/desmarque itens.
- **Resumo do Extrato em Tempo Real:** Lançamentos identificados, total de entradas, total de saídas e saldo líquido do extrato.
- **Exportação como Planilha Excel / CSV:** Permite baixar o extrato limpo e categorizado como arquivo CSV pronto para abrir no Excel ou Google Sheets.
- **Extrato Demonstrativo Integrado:** Botão para testar o recurso imediatamente com dados simulados de banco digital.

### 6. Modo Escuro e Modo Claro (Dark / Light Mode)
- Alternância fluida e persistente via botão no cabeçalho.
- Gráficos, cores de grade, textos e tooltips se adaptam dinamicamente ao tema sem precisar recarregar a página.

### 7. Salvamento Local e Segurança de Dados
- **Persistência Local (LocalStorage):** Seus dados são salvos automaticamente no navegador em tempo real.
- **Exportação JSON (Backup completo):** Baixe um arquivo `.json` com todas as suas transações e configurações.
- **Importação JSON (Restauração):** Restaure seus backups a qualquer momento ou transfira para outro computador.
- **Exportação CSV (Extrato para Excel/Planilhas):** Gere uma planilha com o extrato formatado para abrir no Excel ou Google Sheets.
- **Carregador de Dados de Exemplo:** Popula o painel com 3 meses de histórico realista para testes e visualização instantânea.

---

## Como Executar

### Opção 1: Abrir diretamente no navegador (Sem instalar nada)
Basta dar um duplo clique no arquivo [`index.html`](index.html) ou arrastá-lo para qualquer navegador moderno (Chrome, Edge, Firefox, Brave, Safari).

### Opção 2: Executar com o servidor local incluso (Node.js)
No terminal, dentro da pasta do projeto:
```bash
node server.js
```
Em seguida, acesse no navegador: [http://localhost:3000](http://localhost:3000)

---

## Estrutura do Projeto

```text
├── index.html         # Página principal com Tailwind CSS e layout responsivo
├── server.js          # Servidor HTTP ultraleve em Node.js (opcional)
├── css/
│   └── styles.css     # Estilos complementares, temas e animações
├── js/
│   ├── data.js        # Camada de dados, LocalStorage, backup/restauração e seed
│   ├── charts.js      # Gerenciamento dos gráficos Chart.js com suporte a Dark Mode
│   └── app.js         # Controlador da interface, filtros, tabela, modais e toasts
└── README.md          # Documentação do projeto
```
