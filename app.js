/**
 * App Controller: Lógica de Interface, Filtros, Modais, Toasts e Sincronização
 */

class FinApp {
  constructor() {
    this.store = window.finDataStore;
    this.charts = window.finChartsManager;

    // Estado da Interface
    const now = new Date();
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth(); // 0 a 11
    this.filterType = 'all'; // 'all' | 'income' | 'expense'
    this.filterCategory = 'all';
    this.searchQuery = '';
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.editingTransactionId = null;

    // Extrato Bancário
    this.parsedStatementTransactions = [];

    // Expansão Vertical e Detalhamento de Categoria
    this.expandedCategoryId = null;
    this.categoryDetailSearch = {};
    this.categoryDetailTypeFilter = {};
    this.categoryTabMode = 'expenses'; // 'expenses' | 'incomes' | 'all'

    // Dark Mode
    this.isDarkMode = false;
  }

  init() {
    this.setupTheme();
    this.populateMonthSelector();
    this.setupEventListeners();
    this.populateCategorySelectOptions();
    this.refresh();
  }

  // --- GERENCIAMENTO DE TEMA (DARK / LIGHT) ---
  setupTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.isDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
    this.applyTheme(this.isDarkMode);
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem(STORAGE_KEYS.THEME, this.isDarkMode ? 'dark' : 'light');
    this.applyTheme(this.isDarkMode);
    this.refreshChartsOnly();
    this.showToast(`Modo ${this.isDarkMode ? 'Escuro' : 'Claro'} ativado`, 'info');
  }

  applyTheme(isDark) {
    const root = document.documentElement;
    const themeIcon = document.getElementById('theme-toggle-icon');
    const themeText = document.getElementById('theme-toggle-text');

    if (isDark) {
      root.classList.add('dark');
      if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
      if (themeText) themeText.textContent = 'Modo Claro';
    } else {
      root.classList.remove('dark');
      if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
      if (themeText) themeText.textContent = 'Modo Escuro';
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- SELETOR DE MÊS / ANO ---
  populateMonthSelector() {
    const select = document.getElementById('select-period');
    if (!select) return;

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    select.innerHTML = '';

    // Opção "Todos os períodos"
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'Histórico Completo';
    select.appendChild(allOpt);

    // Gera os últimos 12 meses
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const opt = document.createElement('option');
      opt.value = `${d.getFullYear()}-${d.getMonth()}`;
      opt.textContent = `${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
      if (i === 0) {
        opt.selected = true;
      }
      select.appendChild(opt);
    }
  }

  // --- POPULAR SELECTS DE CATEGORIA ---
  populateCategorySelectOptions() {
    const filterSelect = document.getElementById('filter-category');
    const modalSelect = document.getElementById('tx-category');

    const expenses = this.store.categories.expenses;
    const incomes = this.store.categories.incomes;

    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">Todas as categorias</option>';
      const optGroupExp = document.createElement('optgroup');
      optGroupExp.label = 'Despesas';
      expenses.forEach(c => {
        optGroupExp.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
      const optGroupInc = document.createElement('optgroup');
      optGroupInc.label = 'Receitas';
      incomes.forEach(c => {
        optGroupInc.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
      filterSelect.appendChild(optGroupExp);
      filterSelect.appendChild(optGroupInc);
    }

    this.updateModalCategoryOptions('expense');
  }

  updateModalCategoryOptions(type) {
    const modalSelect = document.getElementById('tx-category');
    if (!modalSelect) return;

    const list = type === 'income' ? this.store.categories.incomes : this.store.categories.expenses;
    modalSelect.innerHTML = list.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  // --- ATUALIZAR INTERFACE COMPLETA ---
  refresh() {
    const filtered = this.getFilteredTransactions();

    this.updateKPICards(filtered);
    this.updateCharts();
    this.renderTransactionsTable(filtered);
    this.renderBudgetsSection();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  refreshChartsOnly() {
    this.updateCharts();
  }

  // Filtra transações pelo período, tipo, categoria e busca
  getFilteredTransactions() {
    const periodValue = document.getElementById('select-period')?.value || 'all';

    return this.store.transactions.filter(t => {
      // Filtro de Período
      if (periodValue !== 'all') {
        const [yearStr, monthStr] = periodValue.split('-');
        const tDate = new Date(t.date + 'T00:00:00');
        if (tDate.getFullYear() !== parseInt(yearStr) || tDate.getMonth() !== parseInt(monthStr)) {
          return false;
        }
      }

      // Filtro de Tipo
      if (this.filterType !== 'all' && t.type !== this.filterType) {
        return false;
      }

      // Filtro de Categoria
      if (this.filterCategory !== 'all' && t.categoryId !== this.filterCategory) {
        return false;
      }

      // Busca por texto
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const cat = this.store.getCategory(t.categoryId);
        const matchDesc = t.description.toLowerCase().includes(query);
        const matchCat = cat.name.toLowerCase().includes(query);
        const matchNotes = (t.notes || '').toLowerCase().includes(query);
        if (!matchDesc && !matchCat && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }

  // --- CÁLCULO E RENDERIZAÇÃO DOS KPIS ---
  updateKPICards(periodTransactions) {
    // 1. Saldo Geral Acumulado (Todas as transações do sistema)
    let totalAllIncomes = 0;
    let totalAllExpenses = 0;
    this.store.transactions.forEach(t => {
      if (t.status === 'completed') {
        if (t.type === 'income') totalAllIncomes += t.amount;
        else totalAllExpenses += t.amount;
      }
    });
    const totalBalance = totalAllIncomes - totalAllExpenses;

    // 2. Métricas do Período Selecionado
    let periodIncome = 0;
    let periodExpense = 0;
    periodTransactions.forEach(t => {
      if (t.type === 'income') periodIncome += t.amount;
      else periodExpense += t.amount;
    });

    const periodSavings = periodIncome - periodExpense;
    const savingsRate = periodIncome > 0 ? (periodSavings / periodIncome) * 100 : 0;

    // Atualiza elementos no DOM
    const elBalance = document.getElementById('kpi-total-balance');
    const elIncome = document.getElementById('kpi-period-income');
    const elExpense = document.getElementById('kpi-period-expense');
    const elSavings = document.getElementById('kpi-period-savings');
    const elSavingsRate = document.getElementById('kpi-savings-rate');

    if (elBalance) elBalance.textContent = Formatters.currency(totalBalance);
    if (elIncome) elIncome.textContent = Formatters.currency(periodIncome);
    if (elExpense) elExpense.textContent = Formatters.currency(periodExpense);
    if (elSavings) {
      elSavings.textContent = Formatters.currency(periodSavings);
      elSavings.className = `text-2xl font-bold tracking-tight ${periodSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;
    }
    if (elSavingsRate) {
      elSavingsRate.textContent = `${savingsRate.toFixed(1)}% economizado`;
      elSavingsRate.className = `text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${savingsRate >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'}`;
    }
  }

  // --- PREPARAÇÃO DE DADOS E ATUALIZAÇÃO DOS GRÁFICOS ---
  updateCharts() {
    // 1. Dados dos últimos 6 meses para comparação
    const monthlyData = this.computeLast6MonthsData();
    this.charts.renderMonthlyComparison('chart-monthly-comparison', monthlyData, this.isDarkMode);
    this.charts.renderNetBalanceLine('chart-net-balance', monthlyData, this.isDarkMode);

    // 2. Dados de categorias de despesas no período selecionado
    const categoryData = this.computePeriodCategoryExpenses();
    this.charts.renderCategoryDoughnut('chart-categories-doughnut', categoryData, this.isDarkMode);
    this.renderCategoryBreakdownList(categoryData);
  }

  computeLast6MonthsData() {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const result = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const label = `${monthNames[m]}/${String(y).slice(-2)}`;

      let income = 0;
      let expense = 0;

      this.store.transactions.forEach(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        if (tDate.getFullYear() === y && tDate.getMonth() === m) {
          if (t.type === 'income') income += t.amount;
          else expense += t.amount;
        }
      });

      result.push({
        year: y,
        month: m,
        monthLabel: label,
        totalIncome: income,
        totalExpense: expense,
        netBalance: income - expense
      });
    }

    return result;
  }

  computePeriodCategoryExpenses() {
    const periodValue = document.getElementById('select-period')?.value || 'all';
    const categoryTotals = {};

    this.store.transactions.forEach(t => {
      if (t.type !== 'expense') return;

      if (periodValue !== 'all') {
        const [yearStr, monthStr] = periodValue.split('-');
        const tDate = new Date(t.date + 'T00:00:00');
        if (tDate.getFullYear() !== parseInt(yearStr) || tDate.getMonth() !== parseInt(monthStr)) {
          return;
        }
      }

      categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
    });

    return Object.entries(categoryTotals)
      .map(([catId, total]) => {
        const cat = this.store.getCategory(catId);
        return {
          id: catId,
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          total: total
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  renderCategoryBreakdownList(categoryData) {
    const container = document.getElementById('category-breakdown-list');
    if (!container) return;

    if (categoryData.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
          Nenhuma despesa registrada neste período.
        </div>
      `;
      return;
    }

    const totalExpense = categoryData.reduce((acc, c) => acc + c.total, 0);

    container.innerHTML = categoryData.slice(0, 7).map(cat => {
      const pct = totalExpense > 0 ? ((cat.total / totalExpense) * 100).toFixed(1) : 0;
      return `
        <div onclick="window.finApp.openCategoryDetail('${cat.id}')" title="Clique para abrir detalhes de ${cat.name}" class="group flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 cursor-pointer transition-all border border-transparent hover:border-emerald-100 dark:hover:border-slate-700">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform shadow-sm" style="background-color: ${cat.color}">
              <i data-lucide="${cat.icon}" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">${cat.name}</p>
                <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all"></i>
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <div class="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div class="h-full rounded-full" style="width: ${pct}%; background-color: ${cat.color}"></div>
                </div>
                <span class="text-xs text-slate-500 dark:text-slate-400">${pct}%</span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-slate-800 dark:text-slate-100">${Formatters.currency(cat.total)}</p>
            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 group-hover:underline font-semibold">Ver detalhes ↓</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- SEÇÃO DE CATEGORIAS, ORÇAMENTOS E LIMITES ---
  setCategoryTabMode(mode) {
    this.categoryTabMode = mode;
    const btnExp = document.getElementById('btn-cat-tab-expenses');
    const btnInc = document.getElementById('btn-cat-tab-incomes');
    const btnAll = document.getElementById('btn-cat-tab-all');

    const activeClasses = 'bg-indigo-600 text-white shadow-sm';
    const inactiveClasses = 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';

    if (btnExp) btnExp.className = `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'expenses' ? activeClasses : inactiveClasses}`;
    if (btnInc) btnInc.className = `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'incomes' ? activeClasses : inactiveClasses}`;
    if (btnAll) btnAll.className = `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'all' ? activeClasses : inactiveClasses}`;

    this.renderBudgetsSection();
    if (window.lucide) window.lucide.createIcons();
  }

  renderBudgetsSection() {
    const container = document.getElementById('budgets-grid');
    if (!container) return;

    const periodValue = document.getElementById('select-period')?.value || 'all';
    const periodSelect = document.getElementById('select-period');
    const periodText = periodSelect && periodSelect.options[periodSelect.selectedIndex] 
      ? periodSelect.options[periodSelect.selectedIndex].text 
      : 'Período Atual';

    const spentByCategory = {};
    const incomeByCategory = {};

    this.store.transactions.forEach(t => {
      if (periodValue !== 'all') {
        const [yearStr, monthStr] = periodValue.split('-');
        const tDate = new Date(t.date + 'T00:00:00');
        if (tDate.getFullYear() !== parseInt(yearStr) || tDate.getMonth() !== parseInt(monthStr)) {
          return;
        }
      }

      if (t.type === 'expense') {
        spentByCategory[t.categoryId] = (spentByCategory[t.categoryId] || 0) + t.amount;
      } else if (t.type === 'income') {
        incomeByCategory[t.categoryId] = (incomeByCategory[t.categoryId] || 0) + t.amount;
      }
    });

    let displayCategories = [];
    if (this.categoryTabMode === 'incomes') {
      displayCategories = this.store.categories.incomes.map(c => ({ ...c, isIncomeType: true }));
    } else if (this.categoryTabMode === 'all') {
      displayCategories = [
        ...this.store.categories.expenses.map(c => ({ ...c, isIncomeType: false })),
        ...this.store.categories.incomes.map(c => ({ ...c, isIncomeType: true }))
      ];
    } else {
      displayCategories = this.store.categories.expenses.map(c => ({ ...c, isIncomeType: false }));
    }

    const methodNames = {
      pix: 'Pix',
      credito: 'Crédito',
      debito: 'Débito',
      dinheiro: 'Dinheiro',
      transferencia: 'TED / DOC',
      boleto: 'Boleto'
    };

    container.innerHTML = displayCategories.map(cat => {
      const budget = this.store.getBudget(cat.id);
      const spent = spentByCategory[cat.id] || 0;
      const income = incomeByCategory[cat.id] || 0;
      const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : (spent > 0 ? 100 : 0);
      const isOver = spent > budget && budget > 0;

      let barColor = 'bg-emerald-500';
      if (pct > 90 || isOver) barColor = 'bg-rose-500';
      else if (pct > 70) barColor = 'bg-amber-500';

      const isIncomeCategory = cat.isIncomeType;
      const isExpanded = this.expandedCategoryId === cat.id;

      if (!isExpanded) {
        // --- CARD COMPACTO (RECOLHIDO) ---
        return `
          <div id="cat-card-${cat.id}" onclick="window.finApp.toggleCategoryExpansion('${cat.id}')" title="Clique para abrir detalhes verticais de ${cat.name}" class="category-card-transition p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-emerald-400 dark:hover:border-emerald-500 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform" style="background-color: ${cat.color}">
                    <i data-lucide="${cat.icon}" class="w-4 h-4"></i>
                  </div>
                  <div>
                    <h4 class="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">${cat.name}</h4>
                    <span class="text-[10px] text-slate-400 font-medium">${isIncomeCategory ? 'Receita' : (budget > 0 ? 'Orçamento Definido' : 'Sem Limite')}</span>
                  </div>
                </div>
                ${!isIncomeCategory ? `
                  <button onclick="event.stopPropagation(); window.finApp.openBudgetEditModal('${cat.id}')" title="Alterar Limite de Gastos" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                  </button>
                ` : `
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                `}
              </div>

              ${!isIncomeCategory ? `
                <div class="flex justify-between items-baseline mb-1.5 text-xs">
                  <span class="text-slate-500 dark:text-slate-400">Gasto: <strong class="text-slate-800 dark:text-slate-100">${Formatters.currency(spent)}</strong></span>
                  <span class="text-slate-500 dark:text-slate-400">Limite: <strong class="text-slate-800 dark:text-slate-100">${Formatters.currency(budget)}</strong></span>
                </div>

                <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                  <div class="${barColor} h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>

                <div class="flex justify-between items-center text-xs">
                  <span class="${isOver ? 'text-rose-600 font-bold dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}">
                    ${isOver ? `Estourou por ${Formatters.currency(spent - budget)}` : `${(budget - spent > 0 && budget > 0) ? 'Resta ' + Formatters.currency(budget - spent) : (budget === 0 ? 'Sem limite' : 'No limite')}`}
                  </span>
                  <span class="font-semibold text-slate-600 dark:text-slate-400">${budget > 0 ? pct.toFixed(0) + '%' : ''}</span>
                </div>
              ` : `
                <div class="py-1">
                  <span class="text-[11px] text-slate-400 uppercase font-semibold">Total Recebido no Mês</span>
                  <p class="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">${Formatters.currency(income)}</p>
                </div>
              `}
            </div>

            <!-- Rodapé do Card com indicação de clique -->
            <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold group-hover:underline">
              <span>Ver descrição & lançamentos</span>
              <i data-lucide="chevron-down" class="w-4 h-4 group-hover:translate-y-0.5 transition-transform"></i>
            </div>
          </div>
        `;
      }

      // --- CARD EXPANDIDO VERTICALMENTE (DETALHAMENTO COMPLETO COM ANIMAÇÃO) ---
      const catTransactions = this.store.transactions.filter(t => {
        if (t.categoryId !== cat.id) return false;
        if (periodValue !== 'all') {
          const [yearStr, monthStr] = periodValue.split('-');
          const tDate = new Date(t.date + 'T00:00:00');
          if (tDate.getFullYear() !== parseInt(yearStr) || tDate.getMonth() !== parseInt(monthStr)) {
            return false;
          }
        }
        return true;
      });

      const catExpenses = catTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const catIncomes = catTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const catNet = catIncomes - catExpenses;
      const catExpenseCount = catTransactions.filter(t => t.type === 'expense').length;
      const catIncomeCount = catTransactions.filter(t => t.type === 'income').length;

      const searchQuery = (this.categoryDetailSearch[cat.id] || '').trim().toLowerCase();
      const filterType = this.categoryDetailTypeFilter[cat.id] || 'all';

      let filteredCatTxs = catTransactions.filter(t => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (searchQuery) {
          const descMatch = (t.description || '').toLowerCase().includes(searchQuery);
          const notesMatch = (t.notes || '').toLowerCase().includes(searchQuery);
          const methodMatch = (t.paymentMethod || '').toLowerCase().includes(searchQuery);
          if (!descMatch && !notesMatch && !methodMatch) return false;
        }
        return true;
      });

      filteredCatTxs.sort((a, b) => new Date(b.date) - new Date(a.date));

      return `
        <div id="cat-card-${cat.id}" class="category-card-transition col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-850 border-2 border-emerald-500 dark:border-emerald-500 shadow-xl transition-all duration-300">
          <!-- Top Bar da Categoria Expandida -->
          <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0" style="background-color: ${cat.color}">
                <i data-lucide="${cat.icon}" class="w-6 h-6"></i>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-xl font-bold text-slate-900 dark:text-white">${cat.name}</h3>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Detalhamento Aberto
                  </span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ${periodText} • Extrato completo de todos os gastos e entradas
                </p>
              </div>
            </div>

            <!-- Botões de Ação do Topo -->
            <div class="flex items-center gap-2 ml-auto">
              ${!isIncomeCategory ? `
                <button onclick="window.finApp.openBudgetEditModal('${cat.id}')" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors">
                  <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Editar Limite
                </button>
              ` : ''}
              <button onclick="window.finApp.toggleCategoryExpansion('${cat.id}')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 transition-colors shadow-sm">
                <i data-lucide="chevron-up" class="w-4 h-4"></i> Recolher Detalhes
              </button>
            </div>
          </div>

          <!-- CONTEÚDO EXPANDIDO COM ANIMAÇÃO VERTICAL (SLIDE DOWN) -->
          <div class="animate-slide-down space-y-5 pt-4">
            <!-- 4 Cards de Resumo da Categoria -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <!-- Total Gastos -->
              <div class="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                <span class="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Total Gasto (Saídas)</span>
                <span class="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 block">${Formatters.currency(catExpenses)}</span>
                <span class="text-[11px] text-slate-400 dark:text-slate-500">${catExpenseCount} ${catExpenseCount === 1 ? 'despesa' : 'despesas'}</span>
              </div>

              <!-- Total Entradas -->
              <div class="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Total Entradas</span>
                <span class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">${Formatters.currency(catIncomes)}</span>
                <span class="text-[11px] text-slate-400 dark:text-slate-500">${catIncomeCount} ${catIncomeCount === 1 ? 'recebimento' : 'recebimentos'}</span>
              </div>

              <!-- Balanço Líquido -->
              <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Balanço Líquido</span>
                <span class="text-xl font-extrabold mt-1 block ${catNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                  ${catNet >= 0 ? '+' : ''}${Formatters.currency(catNet)}
                </span>
                <span class="text-[11px] text-slate-400 dark:text-slate-500">Entradas menos Gastos</span>
              </div>

              <!-- Orçamento / Meta -->
              <div class="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                <span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Limite Mensal</span>
                <span class="text-xl font-extrabold text-indigo-900 dark:text-indigo-200 mt-1 block">${Formatters.currency(budget)}</span>
                <span class="text-[11px] font-semibold ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}">
                  ${budget > 0 ? (isOver ? `Estourou por ${Formatters.currency(catExpenses - budget)}` : `${pct.toFixed(0)}% consumido`) : 'Sem teto definido'}
                </span>
              </div>
            </div>

            <!-- Barra de Progresso do Orçamento (se aplicável) -->
            ${budget > 0 ? `
              <div class="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div class="flex justify-between text-xs font-semibold mb-1.5">
                  <span class="text-slate-600 dark:text-slate-300">Consumo do Limite Planejado:</span>
                  <span class="font-bold ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}">
                    ${pct.toFixed(1)}% (${Formatters.currency(catExpenses)} de ${Formatters.currency(budget)})
                  </span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : (pct > 75 ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: ${Math.min(pct, 100)}%"></div>
                </div>
              </div>
            ` : ''}

            <!-- Barra de Filtros Interna da Categoria -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-sm text-slate-800 dark:text-slate-200">Lançamentos em ${cat.name}</h4>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  ${filteredCatTxs.length} ${filteredCatTxs.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              <div class="flex items-center gap-2">
                <!-- Campo de Busca Interna -->
                <div class="relative min-w-[180px]">
                  <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                  <input type="text" id="cat-search-${cat.id}" value="${searchQuery}" placeholder="Buscar em ${cat.name}..." oninput="window.finApp.setCategorySearch('${cat.id}', this.value)" class="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                </div>

                <!-- Filtro por Tipo -->
                <div class="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
                  <button onclick="window.finApp.setCategoryFilterType('${cat.id}', 'all')" class="px-2.5 py-1 rounded-lg transition-colors ${filterType === 'all' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}">Todos</button>
                  <button onclick="window.finApp.setCategoryFilterType('${cat.id}', 'expense')" class="px-2.5 py-1 rounded-lg transition-colors ${filterType === 'expense' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}">Gastos</button>
                  <button onclick="window.finApp.setCategoryFilterType('${cat.id}', 'income')" class="px-2.5 py-1 rounded-lg transition-colors ${filterType === 'income' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}">Entradas</button>
                </div>
              </div>
            </div>

            <!-- Tabela de Lançamentos -->
            <div class="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
              ${filteredCatTxs.length > 0 ? `
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 z-10">
                    <tr>
                      <th class="py-2 px-3">Data</th>
                      <th class="py-2 px-3">Descrição Detalhada</th>
                      <th class="py-2 px-3 hidden sm:table-cell">Pagamento</th>
                      <th class="py-2 px-3">Status</th>
                      <th class="py-2 px-3 text-center">Tipo</th>
                      <th class="py-2 px-3 text-right">Valor</th>
                      <th class="py-2 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    ${filteredCatTxs.map(t => {
                      const isIncome = t.type === 'income';
                      const isCompleted = t.status === 'completed';
                      return `
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td class="py-2 px-3 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                            ${Formatters.date(t.date)}
                          </td>
                          <td class="py-2 px-3">
                            <p class="font-bold text-slate-900 dark:text-white">${t.description}</p>
                            ${t.notes ? `<p class="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">${t.notes}</p>` : ''}
                          </td>
                          <td class="py-2 px-3 hidden sm:table-cell whitespace-nowrap">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                              ${methodNames[t.paymentMethod] || t.paymentMethod}
                            </span>
                          </td>
                          <td class="py-2 px-3 whitespace-nowrap">
                            <button onclick="window.finApp.toggleTransactionStatus('${t.id}')" title="Clique para alterar status" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-transform active:scale-95 ${isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50'}">
                              <span class="w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
                              ${isCompleted ? 'Concluído' : 'Pendente'}
                            </button>
                          </td>
                          <td class="py-2 px-3 text-center whitespace-nowrap">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isIncome ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'}">
                              ${isIncome ? '+ Entrada' : '- Gasto'}
                            </span>
                          </td>
                          <td class="py-2 px-3 text-right font-bold whitespace-nowrap ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                            ${isIncome ? '+' : '-'} ${Formatters.currency(t.amount)}
                          </td>
                          <td class="py-2 px-3 text-right whitespace-nowrap">
                            <div class="flex items-center justify-end gap-1">
                              <button onclick="window.finApp.openEditModal('${t.id}')" title="Editar lançamento" class="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                              </button>
                              <button onclick="window.finApp.confirmDeleteTransaction('${t.id}')" title="Excluir lançamento" class="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              ` : `
                <div class="text-center py-8 bg-white dark:bg-slate-900">
                  <i data-lucide="receipt" class="w-7 h-7 text-slate-400 mx-auto mb-2"></i>
                  <p class="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum lançamento encontrado nesta categoria.</p>
                  <p class="text-[11px] text-slate-400 mt-0.5">Nenhum gasto ou entrada para os filtros aplicados neste período.</p>
                </div>
              `}
            </div>

            <!-- Barra de Rodapé da Categoria -->
            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <button onclick="window.finApp.exportCategoryCSV('${cat.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all">
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                Exportar CSV de ${cat.name}
              </button>

              <div class="flex items-center gap-2 ml-auto">
                <button onclick="window.finApp.quickAddTransactionToCategory('${cat.id}')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-all">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  + Novo Lançamento em ${cat.name}
                </button>
                <button onclick="window.finApp.toggleCategoryExpansion('${cat.id}')" class="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  Recolher ▲
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- TABELA DE TRANSAÇÕES ---
  renderTransactionsTable(transactions) {
    const tbody = document.getElementById('transactions-table-body');
    const emptyState = document.getElementById('transactions-empty-state');
    const counterBadge = document.getElementById('transactions-count-badge');

    if (counterBadge) {
      counterBadge.textContent = `${transactions.length} registros`;
    }

    if (!tbody) return;

    if (transactions.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      this.renderPagination(0);
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    // Paginação
    const totalPages = Math.ceil(transactions.length / this.itemsPerPage);
    if (this.currentPage > totalPages) this.currentPage = totalPages || 1;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const paginatedItems = transactions.slice(startIndex, startIndex + this.itemsPerPage);

    tbody.innerHTML = paginatedItems.map(t => {
      const cat = this.store.getCategory(t.categoryId);
      const isIncome = t.type === 'income';
      const isCompleted = t.status === 'completed';

      const methodNames = {
        pix: 'Pix',
        credito: 'Crédito',
        debito: 'Débito',
        dinheiro: 'Dinheiro',
        transferencia: 'TED / DOC',
        boleto: 'Boleto'
      };

      return `
        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-colors">
          <!-- Data -->
          <td class="py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            ${Formatters.date(t.date)}
          </td>

          <!-- Descrição e Categoria -->
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <div onclick="event.stopPropagation(); window.finApp.openCategoryDetailModal('${t.categoryId}')" title="Ver detalhes da categoria ${cat.name}" class="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 cursor-pointer hover:scale-110 shadow-sm transition-transform" style="background-color: ${cat.color}">
                <i data-lucide="${cat.icon}" class="w-4 h-4"></i>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">${t.description}</p>
                <p onclick="event.stopPropagation(); window.finApp.openCategoryDetailModal('${t.categoryId}')" title="Ver detalhes da categoria ${cat.name}" class="text-xs text-slate-400 dark:text-slate-500 truncate cursor-pointer hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">${cat.name} ${t.notes ? '• ' + t.notes : ''}</p>
              </div>
            </div>
          </td>

          <!-- Método de Pagamento -->
          <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap hidden sm:table-cell">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              ${methodNames[t.paymentMethod] || t.paymentMethod}
            </span>
          </td>

          <!-- Status -->
          <td class="py-3 px-4 whitespace-nowrap">
            <button onclick="window.finApp.toggleTransactionStatus('${t.id}')" title="Clique para alterar status" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-transform active:scale-95 ${isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50'}">
              <span class="w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
              ${isCompleted ? 'Concluído' : 'Pendente'}
            </button>
          </td>

          <!-- Valor -->
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <span class="text-sm font-bold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}">
              ${isIncome ? '+' : '-'} ${Formatters.currency(t.amount)}
            </span>
          </td>

          <!-- Ações -->
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <div class="flex items-center justify-end gap-1">
              <button onclick="window.finApp.openEditModal('${t.id}')" title="Editar" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
              </button>
              <button onclick="window.finApp.confirmDeleteTransaction('${t.id}')" title="Excluir" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.renderPagination(totalPages);
  }

  renderPagination(totalPages) {
    const container = document.getElementById('pagination-container');
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="flex items-center justify-between w-full pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <span>Página <strong>${this.currentPage}</strong> de <strong>${totalPages}</strong></span>
        <div class="flex items-center gap-1.5">
          <button onclick="window.finApp.changePage(${this.currentPage - 1})" ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-100 dark:hover:bg-slate-800"'} class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-medium transition-colors">
            Anterior
          </button>
          <button onclick="window.finApp.changePage(${this.currentPage + 1})" ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-100 dark:hover:bg-slate-800"'} class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-medium transition-colors">
            Próxima
          </button>
        </div>
      </div>
    `;
  }

  changePage(newPage) {
    this.currentPage = newPage;
    this.renderTransactionsTable(this.getFilteredTransactions());
    if (window.lucide) window.lucide.createIcons();
  }

  // --- MODAIS E OPERAÇÕES CRUD ---
  openAddModal(type = 'expense') {
    this.editingTransactionId = null;
    document.getElementById('modal-transaction-title').textContent = 'Nova Transação';
    document.getElementById('tx-form').reset();

    // Seta data de hoje
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('tx-date').value = today;

    this.setModalType(type);
    this.openModal('modal-transaction');
  }

  openEditModal(id) {
    const tx = this.store.getTransactionById(id);
    if (!tx) return;

    this.editingTransactionId = id;
    document.getElementById('modal-transaction-title').textContent = 'Editar Transação';

    this.setModalType(tx.type);
    document.getElementById('tx-description').value = tx.description;
    document.getElementById('tx-amount').value = tx.amount;
    document.getElementById('tx-category').value = tx.categoryId;
    document.getElementById('tx-date').value = tx.date;
    document.getElementById('tx-payment').value = tx.paymentMethod;
    document.getElementById('tx-status').value = tx.status;
    document.getElementById('tx-notes').value = tx.notes || '';

    this.openModal('modal-transaction');
  }

  setModalType(type) {
    const btnExpense = document.getElementById('btn-type-expense');
    const btnIncome = document.getElementById('btn-type-income');
    const inputType = document.getElementById('tx-type');

    inputType.value = type;

    if (type === 'income') {
      btnIncome.className = 'flex-1 py-2 px-3 text-sm font-semibold rounded-lg bg-emerald-600 text-white shadow-sm transition-all';
      btnExpense.className = 'flex-1 py-2 px-3 text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all';
    } else {
      btnExpense.className = 'flex-1 py-2 px-3 text-sm font-semibold rounded-lg bg-rose-600 text-white shadow-sm transition-all';
      btnIncome.className = 'flex-1 py-2 px-3 text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all';
    }

    this.updateModalCategoryOptions(type);
  }

  handleTransactionSubmit(e) {
    e.preventDefault();

    const type = document.getElementById('tx-type').value;
    const description = document.getElementById('tx-description').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const categoryId = document.getElementById('tx-category').value;
    const date = document.getElementById('tx-date').value;
    const paymentMethod = document.getElementById('tx-payment').value;
    const status = document.getElementById('tx-status').value;
    const notes = document.getElementById('tx-notes').value;

    if (!description || isNaN(amount) || amount <= 0 || !date) {
      this.showToast('Por favor, preencha todos os campos obrigatórios com valores válidos.', 'error');
      return;
    }

    const payload = {
      type,
      description,
      amount,
      categoryId,
      date,
      paymentMethod,
      status,
      notes
    };

    if (this.editingTransactionId) {
      this.store.updateTransaction(this.editingTransactionId, payload);
      this.showToast('Transação atualizada com sucesso!', 'success');
    } else {
      this.store.addTransaction(payload);
      this.showToast('Nova transação cadastrada!', 'success');
    }

    this.closeModal('modal-transaction');
    this.refresh();
  }

  confirmDeleteTransaction(id) {
    const tx = this.store.getTransactionById(id);
    if (!tx) return;

    if (confirm(`Tem certeza que deseja excluir a transação "${tx.description}" (${Formatters.currency(tx.amount)})?`)) {
      this.store.deleteTransaction(id);
      this.showToast('Transação removida.', 'info');
      this.refresh();
    }
  }

  toggleTransactionStatus(id) {
    const tx = this.store.getTransactionById(id);
    if (!tx) return;

    const newStatus = tx.status === 'completed' ? 'pending' : 'completed';
    this.store.updateTransaction(id, { status: newStatus });
    this.showToast(`Status alterado para ${newStatus === 'completed' ? 'Concluído' : 'Pendente'}.`, 'success');
    this.refresh();
  }

  // Modal de edição de orçamento
  openBudgetEditModal(categoryId) {
    const cat = this.store.getCategory(categoryId);
    const currentBudget = this.store.getBudget(categoryId);

    const modal = document.getElementById('modal-budget');
    document.getElementById('budget-cat-name').textContent = cat.name;
    document.getElementById('budget-cat-id').value = categoryId;
    document.getElementById('budget-amount').value = currentBudget;

    this.openModal('modal-budget');
  }

  handleBudgetSubmit(e) {
    e.preventDefault();
    const catId = document.getElementById('budget-cat-id').value;
    const amount = parseFloat(document.getElementById('budget-amount').value) || 0;

    this.store.setBudget(catId, amount);
    this.showToast('Limite de orçamento salvo!', 'success');
    this.closeModal('modal-budget');
    this.renderBudgetsSection();
    if (window.lucide) window.lucide.createIcons();
  }

  // --- DETALHAMENTO & EXPANSÃO VERTICAL DE CATEGORIA ---
  toggleCategoryExpansion(categoryId) {
    if (this.expandedCategoryId === categoryId) {
      this.expandedCategoryId = null;
    } else {
      this.expandedCategoryId = categoryId;
      setTimeout(() => {
        const el = document.getElementById(`cat-card-${categoryId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }
    this.renderBudgetsSection();
    if (window.lucide) window.lucide.createIcons();
  }

  openCategoryDetail(categoryId) {
    const isIncome = this.store.categories.incomes.some(c => c.id === categoryId);
    if (isIncome && this.categoryTabMode === 'expenses') {
      this.setCategoryTabMode('incomes');
    } else if (!isIncome && this.categoryTabMode === 'incomes') {
      this.setCategoryTabMode('expenses');
    }
    this.expandedCategoryId = categoryId;
    this.renderBudgetsSection();
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => {
      const el = document.getElementById(`cat-card-${categoryId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  }

  openCategoryDetailModal(categoryId) {
    this.openCategoryDetail(categoryId);
  }

  setCategorySearch(categoryId, query) {
    this.categoryDetailSearch[categoryId] = query;
    this.renderBudgetsSection();
    if (window.lucide) window.lucide.createIcons();
    const input = document.getElementById(`cat-search-${categoryId}`);
    if (input) {
      input.focus();
      input.setSelectionRange(query.length, query.length);
    }
  }

  setCategoryFilterType(categoryId, type) {
    this.categoryDetailTypeFilter[categoryId] = type;
    this.renderBudgetsSection();
    if (window.lucide) window.lucide.createIcons();
  }

  quickAddTransactionToCategory(categoryId) {
    const isIncome = this.store.categories.incomes.some(c => c.id === categoryId);
    this.openAddModal(isIncome ? 'income' : 'expense');
    const sel = document.getElementById('tx-category');
    if (sel) sel.value = categoryId;
  }

  exportCategoryCSV(categoryId) {
    const cat = this.store.getCategory(categoryId);
    const periodValue = document.getElementById('select-period')?.value || 'all';

    const txs = this.store.transactions.filter(t => {
      if (t.categoryId !== categoryId) return false;
      if (periodValue !== 'all') {
        const [yearStr, monthStr] = periodValue.split('-');
        const tDate = new Date(t.date + 'T00:00:00');
        if (tDate.getFullYear() !== parseInt(yearStr) || tDate.getMonth() !== parseInt(monthStr)) {
          return false;
        }
      }
      return true;
    });

    if (txs.length === 0) {
      this.showToast('Nenhum lançamento nesta categoria para exportar.', 'warning');
      return;
    }

    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor (R$)', 'Forma de Pagamento', 'Status', 'Observações'];
    const rows = txs.map(t => {
      return [
        `"${t.date}"`,
        `"${t.type === 'income' ? 'Entrada' : 'Saída'}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${cat.name}"`,
        `"${t.amount.toFixed(2).replace('.', ',')}"`,
        `"${t.paymentMethod}"`,
        `"${t.status === 'completed' ? 'Concluído' : 'Pendente'}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = (cat.name || 'categoria').replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `extrato_${cleanName}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(`Extrato de ${cat.name} baixado com sucesso!`, 'success');
  }

  // --- CONTROLE DE MODAIS GENÉRICO ---
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('flex');
      document.body.classList.add('overflow-hidden');
    }
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    }
  }

  // --- SISTEMA DE TOAST NOTIFICATIONS ---
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      info: 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900',
      warning: 'bg-amber-500 text-white'
    };

    const icons = {
      success: 'check-circle',
      error: 'alert-triangle',
      info: 'info',
      warning: 'alert-circle'
    };

    const toast = document.createElement('div');
    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in ${colors[type] || colors.info}`;
    toast.innerHTML = `
      <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // --- EVENT LISTENERS ---
  setupEventListeners() {
    // Tema
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => this.toggleTheme());

    // Seletor de período
    document.getElementById('select-period')?.addEventListener('change', () => {
      this.currentPage = 1;
      this.refresh();
    });

    // Filtros de Tipo (Todas / Receitas / Despesas)
    document.querySelectorAll('.btn-filter-type').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-filter-type').forEach(b => {
          b.classList.remove('bg-indigo-600', 'text-white', 'dark:bg-indigo-600');
          b.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        });
        btn.classList.add('bg-indigo-600', 'text-white', 'dark:bg-indigo-600');
        btn.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');

        this.filterType = btn.getAttribute('data-type');
        this.currentPage = 1;
        this.refresh();
      });
    });

    // Filtro de Categoria
    document.getElementById('filter-category')?.addEventListener('change', (e) => {
      this.filterCategory = e.target.value;
      this.currentPage = 1;
      this.renderTransactionsTable(this.getFilteredTransactions());
      if (window.lucide) window.lucide.createIcons();
    });

    // Campo de Busca
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.currentPage = 1;
        this.renderTransactionsTable(this.getFilteredTransactions());
        if (window.lucide) window.lucide.createIcons();
      });
    }

    // Modal de Transação
    document.getElementById('btn-new-transaction')?.addEventListener('click', () => this.openAddModal('expense'));
    document.getElementById('btn-new-income-quick')?.addEventListener('click', () => this.openAddModal('income'));
    document.getElementById('btn-type-expense')?.addEventListener('click', () => this.setModalType('expense'));
    document.getElementById('btn-type-income')?.addEventListener('click', () => this.setModalType('income'));
    document.getElementById('tx-form')?.addEventListener('submit', (e) => this.handleTransactionSubmit(e));
    document.getElementById('btn-close-tx-modal')?.addEventListener('click', () => this.closeModal('modal-transaction'));

    // Modal de Orçamento
    document.getElementById('budget-form')?.addEventListener('submit', (e) => this.handleBudgetSubmit(e));
    document.getElementById('btn-close-budget-modal')?.addEventListener('click', () => this.closeModal('modal-budget'));

    // Abas da Seção de Categorias & Orçamentos
    document.getElementById('btn-cat-tab-expenses')?.addEventListener('click', () => this.setCategoryTabMode('expenses'));
    document.getElementById('btn-cat-tab-incomes')?.addEventListener('click', () => this.setCategoryTabMode('incomes'));
    document.getElementById('btn-cat-tab-all')?.addEventListener('click', () => this.setCategoryTabMode('all'));

    // Fechar modais ao clicar no backdrop ou apertar Esc
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        this.closeModal(e.target.id);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal('modal-transaction');
        this.closeModal('modal-budget');
        this.closeModal('modal-statement');
      }
    });

    // --- Extrato Bancário e Montagem Automática de Planilha ---
    document.getElementById('btn-open-statement-modal')?.addEventListener('click', () => this.openStatementModal());
    document.getElementById('btn-close-statement-modal')?.addEventListener('click', () => this.closeModal('modal-statement'));
    document.getElementById('tab-btn-file')?.addEventListener('click', () => this.switchStatementTab('file'));
    document.getElementById('tab-btn-paste')?.addEventListener('click', () => this.switchStatementTab('paste'));
    document.getElementById('btn-process-pasted-text')?.addEventListener('click', () => this.processPastedStatement());

    document.getElementById('btn-browse-statement-file')?.addEventListener('click', () => {
      document.getElementById('input-statement-file')?.click();
    });
    document.getElementById('input-statement-file')?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleStatementFile(e.target.files[0]);
        e.target.value = '';
      }
    });
    document.getElementById('btn-load-demo-statement')?.addEventListener('click', () => this.loadDemoStatement());
    document.getElementById('btn-stmt-reset-file')?.addEventListener('click', () => this.openStatementModal());
    document.getElementById('btn-stmt-select-all')?.addEventListener('click', () => this.toggleSelectAllStatement(true));
    document.getElementById('btn-stmt-deselect-all')?.addEventListener('click', () => this.toggleSelectAllStatement(false));
    document.getElementById('stmt-master-checkbox')?.addEventListener('change', (e) => this.toggleSelectAllStatement(e.target.checked));
    document.getElementById('btn-stmt-confirm-import')?.addEventListener('click', () => this.confirmImportStatement());
    document.getElementById('btn-stmt-download-csv')?.addEventListener('click', () => this.exportStatementSpreadsheetCSV());

    // Drag and Drop para Extrato
    const dropzone = document.getElementById('statement-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-emerald-500', 'bg-emerald-50/60', 'dark:bg-emerald-950/40');
      });
      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-emerald-500', 'bg-emerald-50/60', 'dark:bg-emerald-950/40');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-emerald-500', 'bg-emerald-50/60', 'dark:bg-emerald-950/40');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleStatementFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Exportações e Importações
    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      this.store.exportJSON();
      this.showToast('Backup JSON exportado com sucesso!', 'success');
    });

    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      this.store.exportCSV();
      this.showToast('Planilha CSV gerada com sucesso!', 'success');
    });

    const fileInput = document.getElementById('input-import-file');
    document.getElementById('btn-import-json')?.addEventListener('click', () => fileInput?.click());
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const res = this.store.importJSON(event.target.result);
          if (res.success) {
            this.showToast(`Importação concluída! ${res.count} transações carregadas.`, 'success');
            this.refresh();
          } else {
            this.showToast('Erro ao importar arquivo: formato inválido.', 'error');
          }
        };
        reader.readAsText(file);
        fileInput.value = '';
      });
    }

    // Carregar dados de teste / Limpar
    document.getElementById('btn-reset-demo')?.addEventListener('click', () => {
      if (confirm('Deseja carregar dados de demonstração com histórico dos últimos 3 meses? Seus dados atuais serão substituídos.')) {
        this.store.resetToSampleData();
        this.showToast('Dados de demonstração carregados!', 'success');
        this.refresh();
      }
    });

    document.getElementById('btn-clear-data')?.addEventListener('click', () => {
      if (confirm('Atenção: Tem certeza que deseja apagar TODAS as transações? Essa ação não pode ser desfeita.')) {
        this.store.clearAll();
        this.showToast('Todos os registros foram apagados.', 'info');
        this.refresh();
      }
    });
  }

  // --- GERENCIAMENTO DE EXTRATO BANCÁRIO & PLANILHA AUTOMÁTICA ---
  openStatementModal() {
    this.parsedStatementTransactions = [];
    const uploadZone = document.getElementById('statement-upload-zone');
    const previewZone = document.getElementById('statement-preview-zone');
    const btnReset = document.getElementById('btn-stmt-reset-file');
    const btnDownload = document.getElementById('btn-stmt-download-csv');
    const btnConfirm = document.getElementById('btn-stmt-confirm-import');
    const textarea = document.getElementById('textarea-pasted-statement');

    if (uploadZone) uploadZone.classList.remove('hidden');
    if (previewZone) previewZone.classList.add('hidden');
    if (btnReset) btnReset.classList.add('hidden');
    if (btnDownload) btnDownload.classList.add('hidden');
    if (btnConfirm) btnConfirm.classList.add('hidden');
    if (textarea) textarea.value = '';

    this.switchStatementTab('file');
    this.openModal('modal-statement');
    if (window.lucide) window.lucide.createIcons();
  }

  switchStatementTab(tab) {
    const btnFile = document.getElementById('tab-btn-file');
    const btnPaste = document.getElementById('tab-btn-paste');
    const panelFile = document.getElementById('panel-upload-file');
    const panelPaste = document.getElementById('panel-paste-text');

    if (tab === 'file') {
      if (panelFile) panelFile.classList.remove('hidden');
      if (panelPaste) panelPaste.classList.add('hidden');
      if (btnFile) {
        btnFile.className = 'px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 transition-all';
      }
      if (btnPaste) {
        btnPaste.className = 'px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all';
      }
    } else {
      if (panelFile) panelFile.classList.add('hidden');
      if (panelPaste) panelPaste.classList.remove('hidden');
      if (btnPaste) {
        btnPaste.className = 'px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 transition-all';
      }
      if (btnFile) {
        btnFile.className = 'px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all';
      }
      const textarea = document.getElementById('textarea-pasted-statement');
      if (textarea) textarea.focus();
    }
    if (window.lucide) window.lucide.createIcons();
  }

  processPastedStatement() {
    const textarea = document.getElementById('textarea-pasted-statement');
    const text = (textarea?.value || '').trim();

    if (!text) {
      this.showToast('Por favor, cole o texto do extrato bancário na caixa de texto.', 'warning');
      return;
    }

    try {
      const transactions = window.statementParser.parseCSV(text);
      if (transactions.length === 0) {
        this.showToast('Nenhuma transação foi identificada no texto colado. Verifique se as linhas contêm datas e valores.', 'warning');
        return;
      }

      this.parsedStatementTransactions = transactions;
      this.renderStatementSpreadsheet(transactions);
      this.showToast(`Extrato processado com sucesso! ${transactions.length} lançamentos encontrados.`, 'success');
    } catch (err) {
      console.error('Erro ao processar extrato colado:', err);
      this.showToast('Erro ao processar o texto do extrato.', 'error');
    }
  }

  handleStatementFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const fileName = file.name.toLowerCase();
      let transactions = [];

      try {
        if (fileName.endsWith('.ofx') || content.includes('<OFX>') || content.includes('<STMTTRN>')) {
          transactions = window.statementParser.parseOFX(content);
        } else {
          transactions = window.statementParser.parseCSV(content);
        }

        if (transactions.length === 0) {
          this.showToast('Nenhuma transação foi identificada no arquivo fornecido.', 'warning');
          return;
        }

        this.parsedStatementTransactions = transactions;
        this.renderStatementSpreadsheet(transactions);
        this.showToast(`Extrato processado! ${transactions.length} lançamentos encontrados.`, 'success');
      } catch (err) {
        console.error('Erro ao processar extrato:', err);
        this.showToast('Erro ao ler arquivo de extrato: formato incompatível.', 'error');
      }
    };

    reader.readAsText(file);
  }

  loadDemoStatement() {
    const transactions = window.statementParser.generateDemoStatement();
    this.parsedStatementTransactions = transactions;
    this.renderStatementSpreadsheet(transactions);
    this.showToast(`Extrato de exemplo carregado com ${transactions.length} lançamentos!`, 'success');
  }

  renderStatementSpreadsheet(transactions) {
    const uploadZone = document.getElementById('statement-upload-zone');
    const previewZone = document.getElementById('statement-preview-zone');
    const tbody = document.getElementById('stmt-table-body');
    const btnReset = document.getElementById('btn-stmt-reset-file');
    const btnDownload = document.getElementById('btn-stmt-download-csv');
    const btnConfirm = document.getElementById('btn-stmt-confirm-import');
    const btnConfirmText = document.getElementById('btn-stmt-confirm-text');

    if (uploadZone) uploadZone.classList.add('hidden');
    if (previewZone) previewZone.classList.remove('hidden');
    if (btnReset) btnReset.classList.remove('hidden');
    if (btnDownload) btnDownload.classList.remove('hidden');
    if (btnConfirm) btnConfirm.classList.remove('hidden');

    this.recalculateStatementKPIs();

    if (btnConfirmText) {
      btnConfirmText.textContent = `Importar ${transactions.length} Transações`;
    }

    const allExpenses = this.store.categories.expenses;
    const allIncomes = this.store.categories.incomes;

    tbody.innerHTML = transactions.map((t, index) => {
      const isIncome = t.type === 'income';
      const availableCategories = isIncome ? allIncomes : allExpenses;

      const categoryOptions = availableCategories.map(cat => {
        return `<option value="${cat.id}" ${cat.id === t.categoryId ? 'selected' : ''}>${cat.name}</option>`;
      }).join('');

      return `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors" data-stmt-index="${index}">
          <td class="py-2.5 px-3 text-center">
            <input type="checkbox" class="stmt-row-checkbox rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" checked data-index="${index}">
          </td>
          <td class="py-2.5 px-3 whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
            ${Formatters.date(t.date)}
          </td>
          <td class="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
            <div class="truncate max-w-xs" title="${t.description}">${t.description}</div>
          </td>
          <td class="py-2.5 px-3">
            <select class="stmt-category-select text-xs py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500" data-index="${index}">
              ${categoryOptions}
            </select>
          </td>
          <td class="py-2.5 px-3 text-center whitespace-nowrap">
            <button type="button" class="stmt-type-toggle inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-all transform active:scale-95 ${isIncome ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60'}" data-index="${index}" title="Clique para alternar entre Receita e Despesa">
              <span class="w-1.5 h-1.5 rounded-full ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
              <span>${isIncome ? 'Receita' : 'Despesa'}</span>
            </button>
          </td>
          <td class="py-2.5 px-3 text-right whitespace-nowrap font-bold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}">
            ${isIncome ? '+' : '-'} ${Formatters.currency(t.amount)}
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.stmt-category-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        if (this.parsedStatementTransactions[idx]) {
          this.parsedStatementTransactions[idx].categoryId = e.target.value;
        }
      });
    });

    document.querySelectorAll('.stmt-type-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.stmt-type-toggle');
        const idx = parseInt(targetBtn.getAttribute('data-index'));
        this.toggleStatementRowType(idx);
      });
    });

    document.querySelectorAll('.stmt-row-checkbox').forEach(cb => {
      cb.addEventListener('change', () => this.updateStatementImportButtonCount());
    });

    if (window.lucide) window.lucide.createIcons();
  }

  toggleStatementRowType(index) {
    const item = this.parsedStatementTransactions[index];
    if (!item) return;

    item.type = item.type === 'income' ? 'expense' : 'income';
    item.categoryId = window.statementParser.autoCategorize(item.description, item.type);

    this.renderStatementSpreadsheet(this.parsedStatementTransactions);
    this.showToast(`Transação alterada para ${item.type === 'income' ? 'Receita' : 'Despesa'}.`, 'info');
  }

  recalculateStatementKPIs() {
    let totalIncome = 0;
    let totalExpense = 0;

    this.parsedStatementTransactions.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    const netBalance = totalIncome - totalExpense;

    const elCount = document.getElementById('stmt-kpi-count');
    const elIncome = document.getElementById('stmt-kpi-income');
    const elExpense = document.getElementById('stmt-kpi-expense');
    const elNet = document.getElementById('stmt-kpi-net');

    if (elCount) elCount.textContent = this.parsedStatementTransactions.length;
    if (elIncome) elIncome.textContent = Formatters.currency(totalIncome);
    if (elExpense) elExpense.textContent = Formatters.currency(totalExpense);
    if (elNet) {
      elNet.textContent = Formatters.currency(netBalance);
      elNet.className = `text-lg font-bold ${netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;
    }
  }

  toggleSelectAllStatement(checked) {
    document.querySelectorAll('.stmt-row-checkbox').forEach(cb => {
      cb.checked = checked;
    });
    const master = document.getElementById('stmt-master-checkbox');
    if (master) master.checked = checked;
    this.updateStatementImportButtonCount();
  }

  updateStatementImportButtonCount() {
    const checkedBoxes = document.querySelectorAll('.stmt-row-checkbox:checked');
    const btnText = document.getElementById('btn-stmt-confirm-text');
    if (btnText) {
      btnText.textContent = `Importar ${checkedBoxes.length} Transações`;
    }
  }

  confirmImportStatement() {
    const checkedBoxes = document.querySelectorAll('.stmt-row-checkbox:checked');
    if (checkedBoxes.length === 0) {
      this.showToast('Nenhuma transação selecionada para importação.', 'warning');
      return;
    }

    let importedCount = 0;
    checkedBoxes.forEach(cb => {
      const idx = parseInt(cb.getAttribute('data-index'));
      const item = this.parsedStatementTransactions[idx];
      if (item) {
        this.store.addTransaction({
          type: item.type,
          description: item.description,
          amount: item.amount,
          categoryId: item.categoryId,
          date: item.date,
          paymentMethod: item.paymentMethod,
          status: 'completed',
          notes: item.notes || 'Importado via Extrato'
        });
        importedCount++;
      }
    });

    this.closeModal('modal-statement');
    this.showToast(`${importedCount} transações importadas com sucesso para o painel!`, 'success');
    this.refresh();
  }

  exportStatementSpreadsheetCSV() {
    if (!this.parsedStatementTransactions || this.parsedStatementTransactions.length === 0) return;

    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor (R$)', 'Forma de Pagamento'];
    const rows = this.parsedStatementTransactions.map(t => {
      const cat = this.store.getCategory(t.categoryId);
      return [
        `"${t.date}"`,
        `"${t.type === 'income' ? 'Receita' : 'Despesa'}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${cat.name}"`,
        `"${t.amount.toFixed(2).replace('.', ',')}"`,
        `"${t.paymentMethod}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planilha_extrato_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Planilha CSV do extrato baixada com sucesso!', 'success');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.finApp = new FinApp();
  window.finApp.init();
});
