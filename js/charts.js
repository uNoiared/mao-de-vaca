/**
 * Visualização e Gráficos com Chart.js
 * Suporte nativo e reativo a Modo Escuro / Claro
 */

class FinChartsManager {
  constructor() {
    this.monthlyComparisonChart = null;
    this.categoryDoughnutChart = null;
    this.netBalanceLineChart = null;
    this.initChartDefaults();
  }

  getThemeColors(isDark) {
    return {
      textColor: isDark ? '#94a3b8' : '#64748b',
      textMuted: isDark ? '#64748b' : '#94a3b8',
      gridColor: isDark ? 'rgba(51, 65, 85, 0.45)' : 'rgba(226, 232, 240, 0.8)',
      tooltipBg: isDark ? '#1e293b' : '#ffffff',
      tooltipText: isDark ? '#f8fafc' : '#0f172a',
      tooltipBorder: isDark ? '#334155' : '#e2e8f0',
      incomeColor: '#10b981',
      incomeBg: isDark ? 'rgba(16, 185, 129, 0.85)' : 'rgba(16, 185, 129, 0.9)',
      expenseColor: '#f43f5e',
      expenseBg: isDark ? 'rgba(244, 63, 94, 0.85)' : 'rgba(244, 63, 94, 0.9)',
      balanceColor: '#6366f1'
    };
  }

  initChartDefaults() {
    if (typeof Chart === 'undefined') return;

    Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.boxPadding = 6;
    Chart.defaults.plugins.tooltip.usePointStyle = true;
  }

  // 1. Gráfico de Comparação Mensal: Receitas vs Despesas
  renderMonthlyComparison(canvasId, monthlyData, isDark) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const colors = this.getThemeColors(isDark);
    const ctx = canvas.getContext('2d');

    if (this.monthlyComparisonChart) {
      this.monthlyComparisonChart.destroy();
    }

    const labels = monthlyData.map(d => d.monthLabel);
    const incomes = monthlyData.map(d => d.totalIncome);
    const expenses = monthlyData.map(d => d.totalExpense);

    this.monthlyComparisonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Entradas',
            data: incomes,
            backgroundColor: colors.incomeBg,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.6
          },
          {
            label: 'Despesas',
            data: expenses,
            backgroundColor: colors.expenseBg,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: colors.textColor,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipText,
            bodyColor: colors.tooltipText,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const val = Formatters.currency(context.raw);
                return ` ${label}: ${val}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: colors.textColor
            }
          },
          y: {
            grid: {
              color: colors.gridColor
            },
            ticks: {
              color: colors.textColor,
              callback: (val) => 'R$ ' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
            }
          }
        }
      }
    });
  }

  // 2. Gráfico de Rosca: Despesas por Categoria
  renderCategoryDoughnut(canvasId, categoryData, isDark) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const colors = this.getThemeColors(isDark);
    const ctx = canvas.getContext('2d');

    if (this.categoryDoughnutChart) {
      this.categoryDoughnutChart.destroy();
    }

    if (categoryData.length === 0) {
      // Estado sem dados
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const labels = categoryData.map(c => c.name);
    const values = categoryData.map(c => c.total);
    const bgColors = categoryData.map(c => c.color);

    this.categoryDoughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: values,
            backgroundColor: bgColors,
            borderColor: isDark ? '#1e293b' : '#ffffff',
            borderWidth: 3,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        onHover: (event, chartElement) => {
          if (event.native && event.native.target) {
            event.native.target.style.cursor = chartElement && chartElement.length ? 'pointer' : 'default';
          }
        },
        onClick: (event, elements) => {
          if (elements && elements.length > 0) {
            const index = elements[0].index;
            const cat = categoryData[index];
            if (cat && window.finApp && typeof window.finApp.openCategoryDetailModal === 'function') {
              window.finApp.openCategoryDetailModal(cat.id);
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: colors.textColor,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 12,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipText,
            bodyColor: colors.tooltipText,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const current = context.raw;
                const pct = total > 0 ? ((current / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${Formatters.currency(current)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // 3. Gráfico de Linha: Evolução do Saldo Líquido e Fluxo de Caixa
  renderNetBalanceLine(canvasId, monthlyData, isDark) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const colors = this.getThemeColors(isDark);
    const ctx = canvas.getContext('2d');

    if (this.netBalanceLineChart) {
      this.netBalanceLineChart.destroy();
    }

    const labels = monthlyData.map(d => d.monthLabel);
    const netSavings = monthlyData.map(d => d.netBalance);

    // Gradiente abaixo da linha
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.45)' : 'rgba(99, 102, 241, 0.25)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    this.netBalanceLineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Saldo Líquido (Entradas - Despesas)',
            data: netSavings,
            borderColor: colors.balanceColor,
            backgroundColor: gradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: colors.balanceColor,
            pointBorderColor: isDark ? '#0f172a' : '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipText,
            bodyColor: colors.tooltipText,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (context) => ` Balanço Líquido: ${Formatters.currency(context.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: colors.textColor
            }
          },
          y: {
            grid: {
              color: colors.gridColor
            },
            ticks: {
              color: colors.textColor,
              callback: (val) => 'R$ ' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
            }
          }
        }
      }
    });
  }

  // Atualizar tema em todos os gráficos existentes
  updateThemes(isDark, monthlyData, categoryData) {
    if (monthlyData) {
      this.renderMonthlyComparison('chart-monthly-comparison', monthlyData, isDark);
      this.renderNetBalanceLine('chart-net-balance', monthlyData, isDark);
    }
    if (categoryData) {
      this.renderCategoryDoughnut('chart-categories-doughnut', categoryData, isDark);
    }
  }
}

window.finChartsManager = new FinChartsManager();
