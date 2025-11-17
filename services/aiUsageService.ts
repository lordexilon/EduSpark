// services/aiUsageService.ts
// Servicio para tracking y reportes de uso de IA (tokens y costos)

import { supabase } from '../lib/supabase';

export interface AIUsageRecord {
  id: string;
  user_id: string;
  course_id?: number;
  session_id?: string;
  model: string;
  request_type: string;
  conversation_id?: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost: number;
  output_cost: number;
  total_cost: number;
  request_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserUsageStats {
  user_id: string;
  user_name?: string;
  user_email?: string;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_input_cost: number;
  total_output_cost: number;
  total_cost: number;
  first_usage?: string;
  last_usage?: string;
}

export interface DailyUsageStats {
  usage_date: string;
  request_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_input_cost: number;
  total_output_cost: number;
  total_cost: number;
}

export interface MonthlyUsageStats {
  usage_month: string;
  request_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_input_cost: number;
  total_output_cost: number;
  total_cost: number;
}

// Precios de Gemini API (por 1M tokens) - Actualizado 2024
const GEMINI_PRICING = {
  'gemini-1.5-flash': {
    input: 0.075,
    output: 0.30
  },
  'gemini-1.5-pro': {
    input: 1.25,
    output: 5.00
  },
  'gemini-2.5-flash': {
    input: 0.075,
    output: 0.30
  },
  'gemini-2.5-pro': {
    input: 1.25,
    output: 5.00
  }
};

export const aiUsageService = {
  /**
   * Registra el uso de tokens en la base de datos
   */
  async recordUsage(data: {
    userId: string;
    courseId?: number;
    sessionId?: string;
    model: string;
    requestType?: string;
    conversationId?: string;
    inputTokens: number;
    outputTokens: number;
    requestId?: string;
    metadata?: Record<string, any>;
  }): Promise<AIUsageRecord | null> {
    try {
      const pricing = GEMINI_PRICING[data.model as keyof typeof GEMINI_PRICING] || GEMINI_PRICING['gemini-2.5-flash'];
      
      const inputCost = (data.inputTokens / 1000000) * pricing.input;
      const outputCost = (data.outputTokens / 1000000) * pricing.output;
      const totalCost = inputCost + outputCost;

      const record = {
        user_id: data.userId,
        course_id: data.courseId || null,
        session_id: data.sessionId || null,
        model: data.model,
        request_type: data.requestType || 'chat',
        conversation_id: data.conversationId || null,
        input_tokens: data.inputTokens,
        output_tokens: data.outputTokens,
        total_tokens: data.inputTokens + data.outputTokens,
        input_cost: inputCost,
        output_cost: outputCost,
        total_cost: totalCost,
        request_id: data.requestId || null,
        metadata: data.metadata || {}
      };

      const { data: inserted, error } = await supabase
        .from('ai_usage_tracking')
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error('Error registrando uso de IA:', error);
        return null;
      }

      return inserted as AIUsageRecord;
    } catch (error) {
      console.error('Error en recordUsage:', error);
      return null;
    }
  },

  /**
   * Obtiene estadísticas de uso por usuario (para administradores)
   */
  async getUserUsageStats(startDate?: Date, endDate?: Date): Promise<UserUsageStats[]> {
    try {
      let query = supabase
        .from('ai_usage_tracking')
        .select(`
          user_id,
          input_tokens,
          output_tokens,
          total_tokens,
          input_cost,
          output_cost,
          total_cost,
          created_at
        `);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Agrupar por usuario
      const userStatsMap = new Map<string, UserUsageStats>();

      data?.forEach((record: any) => {
        const userId = record.user_id;
        
        if (!userStatsMap.has(userId)) {
          userStatsMap.set(userId, {
            user_id: userId,
            total_requests: 0,
            total_input_tokens: 0,
            total_output_tokens: 0,
            total_tokens: 0,
            total_input_cost: 0,
            total_output_cost: 0,
            total_cost: 0
          });
        }

        const stats = userStatsMap.get(userId)!;
        stats.total_requests += 1;
        stats.total_input_tokens += record.input_tokens || 0;
        stats.total_output_tokens += record.output_tokens || 0;
        stats.total_tokens += record.total_tokens || 0;
        stats.total_input_cost += parseFloat(record.input_cost || 0);
        stats.total_output_cost += parseFloat(record.output_cost || 0);
        stats.total_cost += parseFloat(record.total_cost || 0);

        // Actualizar fechas
        const createdAt = new Date(record.created_at);
        if (!stats.first_usage || createdAt < new Date(stats.first_usage)) {
          stats.first_usage = record.created_at;
        }
        if (!stats.last_usage || createdAt > new Date(stats.last_usage)) {
          stats.last_usage = record.created_at;
        }
      });

      // Obtener información de usuarios
      const userIds = Array.from(userStatsMap.keys());
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', userIds);

        users?.forEach((user: any) => {
          const stats = userStatsMap.get(user.id);
          if (stats) {
            stats.user_name = user.name;
            stats.user_email = user.email;
          }
        });
      }

      return Array.from(userStatsMap.values()).sort((a, b) => b.total_cost - a.total_cost);
    } catch (error) {
      console.error('Error obteniendo estadísticas de uso:', error);
      return [];
    }
  },

  /**
   * Obtiene estadísticas diarias de uso (para todos los usuarios)
   */
  async getDailyUsageStats(startDate?: Date, endDate?: Date): Promise<DailyUsageStats[]> {
    try {
      let query = supabase
        .from('ai_usage_daily_stats')
        .select('*')
        .order('usage_date', { ascending: false });

      if (startDate) {
        query = query.gte('usage_date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('usage_date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Agrupar por fecha (sumar todos los usuarios y modelos)
      const dateStatsMap = new Map<string, DailyUsageStats>();

      data?.forEach((record: any) => {
        const date = record.usage_date;
        
        if (!dateStatsMap.has(date)) {
          dateStatsMap.set(date, {
            usage_date: date,
            request_count: 0,
            total_input_tokens: 0,
            total_output_tokens: 0,
            total_tokens: 0,
            total_input_cost: 0,
            total_output_cost: 0,
            total_cost: 0
          });
        }

        const stats = dateStatsMap.get(date)!;
        stats.request_count += record.request_count || 0;
        stats.total_input_tokens += record.total_input_tokens || 0;
        stats.total_output_tokens += record.total_output_tokens || 0;
        stats.total_tokens += record.total_tokens || 0;
        stats.total_input_cost += parseFloat(record.total_input_cost || 0);
        stats.total_output_cost += parseFloat(record.total_output_cost || 0);
        stats.total_cost += parseFloat(record.total_cost || 0);
      });

      return Array.from(dateStatsMap.values()).sort((a, b) => 
        new Date(b.usage_date).getTime() - new Date(a.usage_date).getTime()
      );
    } catch (error) {
      console.error('Error obteniendo estadísticas diarias:', error);
      return [];
    }
  },

  /**
   * Obtiene estadísticas mensuales de uso
   */
  async getMonthlyUsageStats(startMonth?: string, endMonth?: string): Promise<MonthlyUsageStats[]> {
    try {
      let query = supabase
        .from('ai_usage_monthly_stats')
        .select('*')
        .order('usage_month', { ascending: false });

      if (startMonth) {
        query = query.gte('usage_month', startMonth);
      }
      if (endMonth) {
        query = query.lte('usage_month', endMonth);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Agrupar por mes (sumar todos los usuarios y modelos)
      const monthStatsMap = new Map<string, MonthlyUsageStats>();

      data?.forEach((record: any) => {
        const month = record.usage_month;
        
        if (!monthStatsMap.has(month)) {
          monthStatsMap.set(month, {
            usage_month: month,
            request_count: 0,
            total_input_tokens: 0,
            total_output_tokens: 0,
            total_tokens: 0,
            total_input_cost: 0,
            total_output_cost: 0,
            total_cost: 0
          });
        }

        const stats = monthStatsMap.get(month)!;
        stats.request_count += record.request_count || 0;
        stats.total_input_tokens += record.total_input_tokens || 0;
        stats.total_output_tokens += record.total_output_tokens || 0;
        stats.total_tokens += record.total_tokens || 0;
        stats.total_input_cost += parseFloat(record.total_input_cost || 0);
        stats.total_output_cost += parseFloat(record.total_output_cost || 0);
        stats.total_cost += parseFloat(record.total_cost || 0);
      });

      return Array.from(monthStatsMap.values()).sort((a, b) => 
        new Date(b.usage_month).getTime() - new Date(a.usage_month).getTime()
      );
    } catch (error) {
      console.error('Error obteniendo estadísticas mensuales:', error);
      return [];
    }
  },

  /**
   * Obtiene totales generales de uso
   */
  async getTotalUsageStats(): Promise<{
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalInputCost: number;
    totalOutputCost: number;
    totalCost: number;
    uniqueUsers: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('ai_usage_tracking')
        .select('input_tokens, output_tokens, total_tokens, input_cost, output_cost, total_cost, user_id');

      if (error) throw error;

      const totals = {
        totalRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalInputCost: 0,
        totalOutputCost: 0,
        totalCost: 0,
        uniqueUsers: new Set<string>()
      };

      data?.forEach((record: any) => {
        totals.totalRequests += 1;
        totals.totalInputTokens += record.input_tokens || 0;
        totals.totalOutputTokens += record.output_tokens || 0;
        totals.totalTokens += record.total_tokens || 0;
        totals.totalInputCost += parseFloat(record.input_cost || 0);
        totals.totalOutputCost += parseFloat(record.output_cost || 0);
        totals.totalCost += parseFloat(record.total_cost || 0);
        totals.uniqueUsers.add(record.user_id);
      });

      return {
        ...totals,
        uniqueUsers: totals.uniqueUsers.size
      };
    } catch (error) {
      console.error('Error obteniendo totales:', error);
      return {
        totalRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalInputCost: 0,
        totalOutputCost: 0,
        totalCost: 0,
        uniqueUsers: 0
      };
    }
  }
};

