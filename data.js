/**
 * Data Layer: Gerenciamento de Estado, Persistência LocalStorage e Dados Iniciais
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'finflow_transactions_v1',
  CATEGORIES: 'finflow_categories_v1',
  BUDGETS: 'finflow_budgets_v1',
  THEME: 'finflow_theme_v1',
  SETTINGS: 'finflow_settings_v1'
};

// Categorias padrão do sistema com cores e ícones Lucide
const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'alimentacao', name: 'Comida & Alimentação', icon: 'utensils', color: '#f59e0b', defaultBudget: 1200 },
  { id: 'moradia', name: 'Gastos Fixos & Faturas', icon: 'home', color: '#6366f1', defaultBudget: 1800 },
  { id: 'transporte', name: 'Transporte & Combustível', icon: 'car', color: '#3b82f6', defaultBudget: 600 },
  { id: 'investimentos', name: 'Investimentos & Aplicações', icon: 'trending-up', color: '#8b5cf6', defaultBudget: 500 },
  { id: 'lazer', name: 'Lazer & Entretenimento', icon: 'gamepad-2', color: '#10b981', defaultBudget: 500 },
  { id: 'compras', name: 'Compras & Produtos', icon: 'shopping-bag', color: '#f43f5e', defaultBudget: 450 },
  { id: 'saude', name: 'Saúde & Farmácia', icon: 'heart-pulse', color: '#ec4899', defaultBudget: 400 },
  { id: 'educacao', name: 'Educação & Cursos', icon: 'graduation-cap', color: '#8b5cf6', defaultBudget: 350 },
  { id: 'assinaturas', name: 'Assinaturas & Serviços', icon: 'tv', color: '#06b6d4', defaultBudget: 200 },
  { id: 'transferencias_pix', name: 'Transferências & Pix Enviado', icon: 'send', color: '#0ea5e9', defaultBudget: 300 },
  { id: 'outros_gastos', name: 'Outros Gastos', icon: 'more-horizontal', color: '#64748b', defaultBudget: 300 }
];

const DEFAULT_INCOME_CATEGORIES = [
  { id: 'salario', name: 'Salário & Proventos', icon: 'briefcase', color: '#10b981' },
  { id: 'transferencias_recebidas', name: 'Pix & Transferências Recebidas', icon: 'arrow-down-left', color: '#059669' },
  { id: 'freelance', name: 'Freelance & Pagamentos (Paypal)', icon: 'laptop', color: '#3b82f6' },
  { id: 'investimentos', name: 'Rendimentos & Resgates (CDB)', icon: 'trending-up', color: '#8b5cf6' },
  { id: 'cashback', name: 'Cashback & Reembolsos', icon: 'sparkles', color: '#eab308' },
  { id: 'vendas', name: 'Vendas & Comissões', icon: 'badge-percent', color: '#f59e0b' },
  { id: 'outras_receitas', name: 'Outras Receitas', icon: 'wallet', color: '#14b8a6' }
];

// Métodos de pagamento aceitos
const PAYMENT_METHODS = [
  { id: 'pix', name: 'Pix' },
  { id: 'credito', name: 'Cartão de Crédito' },
  { id: 'debito', name: 'Cartão de Débito' },
  { id: 'dinheiro', name: 'Dinheiro' },
  { id: 'transferencia', name: 'Transferência (TED)' },
  { id: 'boleto', name: 'Boleto' }
];

class DataStore {
  constructor() {
    this.transactions = [];
    this.categories = {
      expenses: [...DEFAULT_EXPENSE_CATEGORIES],
      incomes: [...DEFAULT_INCOME_CATEGORIES]
    };
    this.budgets = {};
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const storedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const storedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      const storedBudgets = localStorage.getItem(STORAGE_KEYS.BUDGETS);

      if (storedTransactions) {
        this.transactions = JSON.parse(storedTransactions);
      } else {
        // Se estiver vazio na primeira vez, carrega dados de demonstração automaticamente
        this.transactions = this.generateSampleTransactions();
        this.saveTransactions();
      }

      if (storedCategories) {
        this.categories = JSON.parse(storedCategories);
        // Sincroniza garantindo que todas as categorias padrão existam
        DEFAULT_EXPENSE_CATEGORIES.forEach(dc => {
          const existing = this.categories.expenses.find(c => c.id === dc.id);
          if (!existing) {
            this.categories.expenses.push(dc);
          } else {
            existing.name = dc.name; // Atualiza nome legível
          }
        });
        DEFAULT_INCOME_CATEGORIES.forEach(dc => {
          const existing = this.categories.incomes.find(c => c.id === dc.id);
          if (!existing) {
            this.categories.incomes.push(dc);
          } else {
            existing.name = dc.name;
          }
        });
        this.saveCategories();
      } else {
        this.saveCategories();
      }

      if (storedBudgets) {
        this.budgets = JSON.parse(storedBudgets);
      } else {
        // Inicializa orçamentos com os valores padrão das categorias
        this.budgets = {};
        this.categories.expenses.forEach(cat => {
          this.budgets[cat.id] = cat.defaultBudget || 500;
        });
        this.saveBudgets();
      }
    } catch (e) {
      console.error('Erro ao carregar dados do LocalStorage:', e);
      this.transactions = this.generateSampleTransactions();
    }
  }

  saveTransactions() {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
  }

  saveCategories() {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
  }

  saveBudgets() {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(this.budgets));
  }

  // Gera dados simulados realistas dos últimos 3 meses
  generateSampleTransactions() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0 a 11

    const list = [];
    const formatDate = (year, month, day) => {
      const m = String(month + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      return `${year}-${m}-${d}`;
    };

    // Gera transações para os meses: atual (M), anterior (M-1) e retrasado (M-2)
    for (let offset = 2; offset >= 0; offset--) {
      let targetDate = new Date(currentYear, currentMonth - offset, 1);
      let year = targetDate.getFullYear();
      let month = targetDate.getMonth();

      // Receitas do mês
      list.push({
        id: `sample_inc_1_${year}_${month}`,
        type: 'income',
        description: 'Salário Mensal',
        amount: 6500.00,
        categoryId: 'salario',
        date: formatDate(year, month, 5),
        paymentMethod: 'transferencia',
        status: 'completed',
        notes: 'Depósito em conta corrente'
      });

      list.push({
        id: `sample_inc_2_${year}_${month}`,
        type: 'income',
        description: 'Projeto Freelance UX/Dev',
        amount: offset === 0 ? 1800.00 : (offset === 1 ? 2200.00 : 1400.00),
        categoryId: 'freelance',
        date: formatDate(year, month, 15),
        paymentMethod: 'pix',
        status: 'completed',
        notes: 'Consultoria e entrega de dashboard'
      });

      list.push({
        id: `sample_inc_3_${year}_${month}`,
        type: 'income',
        description: 'Dividendos FIIs & Ações',
        amount: 380.50 + (offset * 25),
        categoryId: 'investimentos',
        date: formatDate(year, month, 20),
        paymentMethod: 'transferencia',
        status: 'completed',
        notes: 'Rendimentos mensais de fundos imobiliários'
      });

      // Despesas Fixas e Variáveis
      list.push({
        id: `sample_exp_1_${year}_${month}`,
        type: 'expense',
        description: 'Aluguel & Condomínio',
        amount: 1750.00,
        categoryId: 'moradia',
        date: formatDate(year, month, 8),
        paymentMethod: 'boleto',
        status: 'completed',
        notes: 'Vencimento dia 10'
      });

      list.push({
        id: `sample_exp_2_${year}_${month}`,
        type: 'expense',
        description: 'Supermercado Principal',
        amount: 850.40 - (offset * 40),
        categoryId: 'alimentacao',
        date: formatDate(year, month, 10),
        paymentMethod: 'credito',
        status: 'completed',
        notes: 'Compras de mês'
      });

      list.push({
        id: `sample_exp_3_${year}_${month}`,
        type: 'expense',
        description: 'Energia Elétrica & Água',
        amount: 245.90 + (offset * 15),
        categoryId: 'moradia',
        date: formatDate(year, month, 12),
        paymentMethod: 'pix',
        status: 'completed',
        notes: 'Contas do mês'
      });

      list.push({
        id: `sample_exp_4_${year}_${month}`,
        type: 'expense',
        description: 'Abastecimento Carro',
        amount: 220.00,
        categoryId: 'transporte',
        date: formatDate(year, month, 14),
        paymentMethod: 'credito',
        status: 'completed',
        notes: 'Gasolina aditivada'
      });

      list.push({
        id: `sample_exp_5_${year}_${month}`,
        type: 'expense',
        description: 'Jantar Restaurante',
        amount: 195.00 + (offset * 20),
        categoryId: 'alimentacao',
        date: formatDate(year, month, 18),
        paymentMethod: 'pix',
        status: 'completed',
        notes: 'Comemoração em família'
      });

      list.push({
        id: `sample_exp_6_${year}_${month}`,
        type: 'expense',
        description: 'Plano de Saúde & Medicamentos',
        amount: 320.00,
        categoryId: 'saude',
        date: formatDate(year, month, 19),
        paymentMethod: 'debito',
        status: 'completed',
        notes: 'Mensalidade e farmácia'
      });

      list.push({
        id: `sample_exp_7_${year}_${month}`,
        type: 'expense',
        description: 'Netflix, Spotify & Prime',
        amount: 89.80,
        categoryId: 'assinaturas',
        date: formatDate(year, month, 22),
        paymentMethod: 'credito',
        status: 'completed',
        notes: 'Cobrança recorrente'
      });

      list.push({
        id: `sample_exp_8_${year}_${month}`,
        type: 'expense',
        description: 'Curso de Especialização Online',
        amount: 197.00,
        categoryId: 'educacao',
        date: formatDate(year, month, 24),
        paymentMethod: 'credito',
        status: 'completed',
        notes: 'Parcela 3/6'
      });

      list.push({
        id: `sample_exp_9_${year}_${month}`,
        type: 'expense',
        description: 'Cinema e Passeio no Parque',
        amount: 145.00 + (offset * 10),
        categoryId: 'lazer',
        date: formatDate(year, month, 27),
        paymentMethod: 'pix',
        status: 'completed',
        notes: 'Fim de semana'
      });
    }

    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Operações de Transação
  addTransaction(item) {
    const newItem = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      type: item.type, // 'income' | 'expense'
      description: item.description.trim(),
      amount: parseFloat(item.amount),
      categoryId: item.categoryId,
      date: item.date,
      paymentMethod: item.paymentMethod || 'pix',
      status: item.status || 'completed',
      notes: (item.notes || '').trim()
    };
    this.transactions.unshift(newItem);
    this.saveTransactions();
    return newItem;
  }

  updateTransaction(id, updatedFields) {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      this.transactions[index] = {
        ...this.transactions[index],
        ...updatedFields,
        amount: parseFloat(updatedFields.amount !== undefined ? updatedFields.amount : this.transactions[index].amount)
      };
      this.saveTransactions();
      return this.transactions[index];
    }
    return null;
  }

  deleteTransaction(id) {
    const initialLen = this.transactions.length;
    this.transactions = this.transactions.filter(t => t.id !== id);
    if (this.transactions.length !== initialLen) {
      this.saveTransactions();
      return true;
    }
    return false;
  }

  getTransactionById(id) {
    return this.transactions.find(t => t.id === id) || null;
  }

  // Orçamentos
  setBudget(categoryId, amount) {
    this.budgets[categoryId] = Math.max(0, parseFloat(amount) || 0);
    this.saveBudgets();
  }

  getBudget(categoryId) {
    return this.budgets[categoryId] || 0;
  }

  // Obter detalhes de categoria
  getCategory(id) {
    return [...this.categories.expenses, ...this.categories.incomes].find(c => c.id === id) || {
      id: 'unknown',
      name: 'Geral',
      icon: 'tag',
      color: '#94a3b8'
    };
  }

  // Reset / Limpar / Restaurar
  clearAll() {
    this.transactions = [];
    this.saveTransactions();
  }

  resetToSampleData() {
    this.transactions = this.generateSampleTransactions();
    this.saveTransactions();
  }

  // Exportar Backup em JSON
  exportJSON() {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      transactions: this.transactions,
      budgets: this.budgets,
      categories: this.categories
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maodevaca_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Exportar Relatório em CSV
  exportCSV() {
    const headers = ['ID', 'Data', 'Tipo', 'Descrição', 'Categoria', 'Valor (R$)', 'Forma de Pagamento', 'Status', 'Observações'];
    const rows = this.transactions.map(t => {
      const cat = this.getCategory(t.categoryId);
      const tipoStr = t.type === 'income' ? 'Receita' : 'Despesa';
      return [
        `"${t.id}"`,
        `"${t.date}"`,
        `"${tipoStr}"`,
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
    a.download = `maodevaca_extrato_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Importar de arquivo JSON
  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.transactions)) {
        this.transactions = parsed.transactions;
        this.saveTransactions();
      }
      if (parsed.budgets && typeof parsed.budgets === 'object') {
        this.budgets = parsed.budgets;
        this.saveBudgets();
      }
      if (parsed.categories && parsed.categories.expenses) {
        this.categories = parsed.categories;
        this.saveCategories();
      }
      return { success: true, count: this.transactions.length };
    } catch (err) {
      console.error('Falha ao importar backup:', err);
      return { success: false, error: err.message };
    }
  }
}

// Utilitários de Formatação
const Formatters = {
  currency(value) {
    const num = Number(value) || 0;
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  date(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  },

  percent(value) {
    const num = Number(value) || 0;
    return `${num.toFixed(1)}%`;
  }
};

window.finDataStore = new DataStore();
window.Formatters = Formatters;
