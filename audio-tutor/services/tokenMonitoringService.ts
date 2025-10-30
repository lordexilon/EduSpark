// =====================================================
// Servicio de Monitoreo de Tokens para Gemini API
// Control de uso y estimación de costos
// =====================================================

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: Date;
  model: string;
  requestId: string;
}

interface DailyUsage {
  date: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  requestCount: number;
}

interface MonthlyUsage {
  month: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  requestCount: number;
  dailyBreakdown: DailyUsage[];
}

// Precios de Gemini API (por 1M tokens) - Actualizado 2024
const GEMINI_PRICING = {
  'gemini-1.5-flash': {
    input: 0.075,   // $0.075 por 1M tokens de entrada
    output: 0.30    // $0.30 por 1M tokens de salida
  },
  'gemini-1.5-pro': {
    input: 1.25,    // $1.25 por 1M tokens de entrada
    output: 5.00    // $5.00 por 1M tokens de salida
  },
  'gemini-2.5-flash': {
    input: 0.075,   // $0.075 por 1M tokens de entrada
    output: 0.30    // $0.30 por 1M tokens de salida
  }
};

export class TokenMonitoringService {
  private static instance: TokenMonitoringService;
  private usageHistory: TokenUsage[] = [];
  private dailyUsage: Map<string, DailyUsage> = new Map();
  private monthlyUsage: Map<string, MonthlyUsage> = new Map();

  private constructor() {
    this.loadStoredData();
  }

  static getInstance(): TokenMonitoringService {
    if (!TokenMonitoringService.instance) {
      TokenMonitoringService.instance = new TokenMonitoringService();
    }
    return TokenMonitoringService.instance;
  }

  /**
   * Registra el uso de tokens de una consulta
   */
  recordTokenUsage(
    inputTokens: number,
    outputTokens: number,
    model: string,
    requestId: string = this.generateRequestId()
  ): TokenUsage {
    const pricing = GEMINI_PRICING[model as keyof typeof GEMINI_PRICING] || GEMINI_PRICING['gemini-1.5-flash'];
    
    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    const totalCost = inputCost + outputCost;

    const usage: TokenUsage = {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost: totalCost,
      timestamp: new Date(),
      model,
      requestId
    };

    this.usageHistory.push(usage);
    this.updateDailyUsage(usage);
    this.updateMonthlyUsage(usage);
    this.saveData();

    console.log(`📊 Token Usage Recorded:`, {
      model,
      inputTokens,
      outputTokens,
      totalCost: `$${totalCost.toFixed(6)}`,
      requestId
    });

    return usage;
  }

  /**
   * Obtiene estadísticas de uso del día actual
   */
  getTodayUsage(): DailyUsage {
    const today = new Date().toISOString().split('T')[0];
    return this.dailyUsage.get(today) || {
      date: today,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      requestCount: 0
    };
  }

  /**
   * Obtiene estadísticas de uso del mes actual
   */
  getCurrentMonthUsage(): MonthlyUsage {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    return this.monthlyUsage.get(monthKey) || {
      month: monthKey,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      requestCount: 0,
      dailyBreakdown: []
    };
  }

  /**
   * Obtiene el historial de uso de los últimos N días
   */
  getUsageHistory(days: number = 30): DailyUsage[] {
    const history: DailyUsage[] = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const dailyUsage = this.dailyUsage.get(dateKey) || {
        date: dateKey,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        requestCount: 0
      };
      
      history.unshift(dailyUsage);
    }
    
    return history;
  }

  /**
   * Obtiene estadísticas de uso por modelo
   */
  getUsageByModel(): Record<string, { totalTokens: number; totalCost: number; requestCount: number }> {
    const modelStats: Record<string, { totalTokens: number; totalCost: number; requestCount: number }> = {};
    
    this.usageHistory.forEach(usage => {
      if (!modelStats[usage.model]) {
        modelStats[usage.model] = { totalTokens: 0, totalCost: 0, requestCount: 0 };
      }
      
      modelStats[usage.model].totalTokens += usage.totalTokens;
      modelStats[usage.model].totalCost += usage.cost;
      modelStats[usage.model].requestCount += 1;
    });
    
    return modelStats;
  }

  /**
   * Estima el costo de una consulta antes de enviarla
   */
  estimateCost(inputText: string, model: string = 'gemini-1.5-flash'): {
    estimatedInputTokens: number;
    estimatedCost: number;
    pricing: { input: number; output: number };
  } {
    const pricing = GEMINI_PRICING[model as keyof typeof GEMINI_PRICING] || GEMINI_PRICING['gemini-1.5-flash'];
    
    // Estimación aproximada: 1 token ≈ 4 caracteres en español
    const estimatedInputTokens = Math.ceil(inputText.length / 4);
    const estimatedOutputTokens = 1000; // Estimación conservadora
    
    const estimatedInputCost = (estimatedInputTokens / 1000000) * pricing.input;
    const estimatedOutputCost = (estimatedOutputTokens / 1000000) * pricing.output;
    const estimatedCost = estimatedInputCost + estimatedOutputCost;
    
    return {
      estimatedInputTokens,
      estimatedCost,
      pricing
    };
  }

  /**
   * Obtiene alertas de uso excesivo
   */
  getUsageAlerts(): Array<{ type: 'daily' | 'monthly'; message: string; severity: 'warning' | 'critical' }> {
    const alerts: Array<{ type: 'daily' | 'monthly'; message: string; severity: 'warning' | 'critical' }> = [];
    
    const todayUsage = this.getTodayUsage();
    const monthUsage = this.getCurrentMonthUsage();
    
    // Alertas diarias
    if (todayUsage.totalCost > 5) { // $5 por día
      alerts.push({
        type: 'daily',
        message: `Uso diario alto: $${todayUsage.totalCost.toFixed(2)} (${todayUsage.requestCount} consultas)`,
        severity: todayUsage.totalCost > 10 ? 'critical' : 'warning'
      });
    }
    
    // Alertas mensuales
    if (monthUsage.totalCost > 100) { // $100 por mes
      alerts.push({
        type: 'monthly',
        message: `Uso mensual alto: $${monthUsage.totalCost.toFixed(2)} (${monthUsage.requestCount} consultas)`,
        severity: monthUsage.totalCost > 200 ? 'critical' : 'warning'
      });
    }
    
    return alerts;
  }

  /**
   * Limpia datos antiguos (más de 90 días)
   */
  cleanupOldData(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    this.usageHistory = this.usageHistory.filter(usage => usage.timestamp > cutoffDate);
    
    // Limpiar datos diarios antiguos
    for (const [dateKey, _] of this.dailyUsage) {
      const date = new Date(dateKey);
      if (date < cutoffDate) {
        this.dailyUsage.delete(dateKey);
      }
    }
    
    this.saveData();
  }

  /**
   * Exporta datos de uso para análisis
   */
  exportUsageData(): string {
    const data = {
      usageHistory: this.usageHistory,
      dailyUsage: Object.fromEntries(this.dailyUsage),
      monthlyUsage: Object.fromEntries(this.monthlyUsage),
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  // Métodos privados

  private updateDailyUsage(usage: TokenUsage): void {
    const dateKey = usage.timestamp.toISOString().split('T')[0];
    const existing = this.dailyUsage.get(dateKey) || {
      date: dateKey,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      requestCount: 0
    };
    
    existing.totalInputTokens += usage.inputTokens;
    existing.totalOutputTokens += usage.outputTokens;
    existing.totalCost += usage.cost;
    existing.requestCount += 1;
    
    this.dailyUsage.set(dateKey, existing);
  }

  private updateMonthlyUsage(usage: TokenUsage): void {
    const monthKey = `${usage.timestamp.getFullYear()}-${String(usage.timestamp.getMonth() + 1).padStart(2, '0')}`;
    const existing = this.monthlyUsage.get(monthKey) || {
      month: monthKey,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      requestCount: 0,
      dailyBreakdown: []
    };
    
    existing.totalInputTokens += usage.inputTokens;
    existing.totalOutputTokens += usage.outputTokens;
    existing.totalCost += usage.cost;
    existing.requestCount += 1;
    
    this.monthlyUsage.set(monthKey, existing);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadStoredData(): void {
    try {
      const stored = localStorage.getItem('eduspark_token_usage');
      if (stored) {
        const data = JSON.parse(stored);
        this.usageHistory = data.usageHistory || [];
        this.dailyUsage = new Map(data.dailyUsage || []);
        this.monthlyUsage = new Map(data.monthlyUsage || []);
      }
    } catch (error) {
      console.warn('Error loading token usage data:', error);
    }
  }

  private saveData(): void {
    try {
      const data = {
        usageHistory: this.usageHistory,
        dailyUsage: Array.from(this.dailyUsage.entries()),
        monthlyUsage: Array.from(this.monthlyUsage.entries())
      };
      localStorage.setItem('eduspark_token_usage', JSON.stringify(data));
    } catch (error) {
      console.warn('Error saving token usage data:', error);
    }
  }
}

// Instancia singleton
export const tokenMonitoring = TokenMonitoringService.getInstance();
