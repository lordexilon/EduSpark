// services/costService.ts
// Servicio para consultar costos de procesamiento desde Supabase

import { supabase } from '@/lib/supabase';

export interface ProcessingCost {
  id: string;
  job_id: string;
  user_id: string | null;
  course_id: number | null;
  material_id: string | null;
  file_name: string;
  file_size: number | null;
  total_pages: number | null;
  total_chunks: number | null;
  execution_time_seconds: number | null;
  pdf_type: 'text' | 'scanned' | 'unknown' | null;
  estimated_costs: {
    ocr: number;
    embeddings: number;
    cloudRun: number;
    firestore: number;
    total: number;
  } | null;
  actual_costs: {
    ocr: number;
    embeddings: number;
    cloudRun: number;
    firestore: number;
    total: number;
  };
  cost_difference: number | null;
  created_at: string;
  updated_at: string;
}

export interface CostSummary {
  user_id?: string | null;
  total_jobs: number;
  total_cost: number;
  avg_cost_per_job: number;
  min_cost: number;
  max_cost: number;
  total_pages_processed: number;
  total_chunks_processed: number;
  total_execution_time_seconds: number;
}

export interface DailyCost {
  date: string;
  total_jobs: number;
  total_cost: number;
  avg_cost_per_job: number;
  total_pages_processed: number;
  total_chunks_processed: number;
}

export const costService = {
  /**
   * Obtiene todos los costos con filtros opcionales
   */
  async getCosts(filters?: {
    userId?: string;
    courseId?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ProcessingCost[]> {
    let query = supabase
      .from('processing_costs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.courseId) {
      query = query.eq('course_id', filters.courseId);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo costos:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Obtiene resumen de costos por usuario
   */
  async getCostsByUser(userId?: string): Promise<CostSummary[]> {
    let query = supabase
      .from('v_processing_costs_by_user')
      .select('*')
      .order('total_cost', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo costos por usuario:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Obtiene resumen de costos por curso
   */
  async getCostsByCourse(courseId?: number): Promise<any[]> {
    let query = supabase
      .from('v_processing_costs_by_course')
      .select('*')
      .order('total_cost', { ascending: false });

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo costos por curso:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Obtiene costos diarios
   */
  async getDailyCosts(days: number = 30): Promise<DailyCost[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('v_processing_costs_daily')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error obteniendo costos diarios:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Obtiene estadísticas generales
   */
  async getOverallStats(): Promise<{
    totalCost: number;
    totalJobs: number;
    avgCostPerJob: number;
    totalPages: number;
    totalChunks: number;
  }> {
    const { data, error } = await supabase
      .from('processing_costs')
      .select('actual_costs, total_pages, total_chunks');

    if (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }

    const costs = data || [];
    const totalCost = costs.reduce((sum, cost) => {
      return sum + (cost.actual_costs?.total || 0);
    }, 0);

    const totalPages = costs.reduce((sum, cost) => {
      return sum + (cost.total_pages || 0);
    }, 0);

    const totalChunks = costs.reduce((sum, cost) => {
      return sum + (cost.total_chunks || 0);
    }, 0);

    return {
      totalCost,
      totalJobs: costs.length,
      avgCostPerJob: costs.length > 0 ? totalCost / costs.length : 0,
      totalPages,
      totalChunks,
    };
  },
};
