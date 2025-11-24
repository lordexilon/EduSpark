// services/tutorCostService.ts
// Servicio para gestión de costos y límites del Tutor IA

import { supabase } from '../lib/supabase';

export interface CostMetrics {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  byCourse: Array<{ courseId: string; courseTitle: string; cost: number }>;
  byUser: Array<{ userId: string; userName: string; cost: number }>;
  projection: {
    monthly: number;
    yearly: number;
  };
}

export interface UsageLimit {
  id: string;
  course_id?: string;
  user_id?: string;
  limit_type: 'daily_cost' | 'monthly_cost' | 'tokens_per_day' | 'tokens_per_month';
  limit_value: number;
  is_active: boolean;
}

/**
 * Obtiene métricas de costos agregadas
 */
export async function getCostMetrics(filters?: {
  startDate?: Date;
  endDate?: Date;
  courseId?: string | number;
  userId?: string;
}): Promise<CostMetrics> {
  try {
    let query = supabase.from('tutor_interactions').select('cost, course_id, student_id, created_at');

    if (filters?.courseId) {
      const courseIdNum = typeof filters.courseId === 'string' ? parseInt(filters.courseId, 10) : filters.courseId;
      query = query.eq('course_id', courseIdNum);
    }

    if (filters?.userId) {
      query = query.eq('student_id', filters.userId);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    const { data: interactions, error } = await query;

    if (error) throw error;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const todayInteractions = interactions?.filter(
      (i) => new Date(i.created_at) >= today
    ) || [];
    const weekInteractions = interactions?.filter(
      (i) => new Date(i.created_at) >= weekAgo
    ) || [];
    const monthInteractions = interactions?.filter(
      (i) => new Date(i.created_at) >= monthAgo
    ) || [];

    const todayCost = todayInteractions.reduce(
      (sum, i) => sum + (parseFloat(i.cost) || 0),
      0
    );
    const weekCost = weekInteractions.reduce(
      (sum, i) => sum + (parseFloat(i.cost) || 0),
      0
    );
    const monthCost = monthInteractions.reduce(
      (sum, i) => sum + (parseFloat(i.cost) || 0),
      0
    );
    const totalCost = interactions?.reduce(
      (sum, i) => sum + (parseFloat(i.cost) || 0),
      0
    ) || 0;

    // Costos por curso
    const courseCosts = new Map<string, { courseId: string; cost: number }>();
    interactions?.forEach((interaction) => {
      const existing = courseCosts.get(interaction.course_id) || {
        courseId: interaction.course_id,
        cost: 0,
      };
      existing.cost += parseFloat(interaction.cost) || 0;
      courseCosts.set(interaction.course_id, existing);
    });

    // Obtener títulos de cursos
    const courseIds = Array.from(courseCosts.keys());
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title')
      .in('id', courseIds);

    const byCourse = Array.from(courseCosts.values())
      .map((cc) => ({
        courseId: cc.courseId,
        courseTitle:
          courses?.find((c) => c.id === cc.courseId)?.title || 'Curso desconocido',
        cost: cc.cost,
      }))
      .sort((a, b) => b.cost - a.cost);

    // Costos por usuario
    const userCosts = new Map<string, { userId: string; cost: number }>();
    interactions?.forEach((interaction) => {
      const existing = userCosts.get(interaction.student_id) || {
        userId: interaction.student_id,
        cost: 0,
      };
      existing.cost += parseFloat(interaction.cost) || 0;
      userCosts.set(interaction.student_id, existing);
    });

    // Obtener nombres de usuarios
    const userIds = Array.from(userCosts.keys());
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', userIds);

    const byUser = Array.from(userCosts.values())
      .map((uc) => {
        const user = users?.find((u) => u.id === uc.userId);
        return {
          userId: uc.userId,
          userName: user
            ? `${user.first_name} ${user.last_name}`
            : 'Usuario desconocido',
          cost: uc.cost,
        };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10); // Top 10 usuarios

    // Proyección mensual y anual basada en el promedio del último mes
    const daysInMonth = 30;
    const dailyAverage = monthInteractions.length > 0 ? monthCost / daysInMonth : 0;
    const monthlyProjection = dailyAverage * 30;
    const yearlyProjection = monthlyProjection * 12;

    return {
      today: todayCost,
      thisWeek: weekCost,
      thisMonth: monthCost,
      total: totalCost,
      byCourse,
      byUser,
      projection: {
        monthly: monthlyProjection,
        yearly: yearlyProjection,
      },
    };
  } catch (error) {
    console.error('Error fetching cost metrics:', error);
    return {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      total: 0,
      byCourse: [],
      byUser: [],
      projection: {
        monthly: 0,
        yearly: 0,
      },
    };
  }
}

/**
 * Obtiene todos los límites configurados
 */
export async function getUsageLimits(
  courseId?: string | number,
  userId?: string
): Promise<UsageLimit[]> {
  try {
    let query = supabase.from('tutor_usage_limits').select('*').eq('is_active', true);

    if (courseId) {
      const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;
      query = query.eq('course_id', courseIdNum);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching usage limits:', error);
    return [];
  }
}

/**
 * Crea o actualiza un límite de uso
 */
export async function setUsageLimit(
  limit: Omit<UsageLimit, 'id'>
): Promise<UsageLimit> {
  try {
    // Verificar si ya existe un límite similar
    let query = supabase
      .from('tutor_usage_limits')
      .select('*')
      .eq('limit_type', limit.limit_type)
      .eq('is_active', true);

    if (limit.course_id) {
      query = query.eq('course_id', limit.course_id);
    } else {
      query = query.is('course_id', null);
    }

    if (limit.user_id) {
      query = query.eq('user_id', limit.user_id);
    } else {
      query = query.is('user_id', null);
    }

    const { data: existing } = await query;

    if (existing && existing.length > 0) {
      // Actualizar límite existente
      const { data, error } = await supabase
        .from('tutor_usage_limits')
        .update({
          limit_value: limit.limit_value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Crear nuevo límite
      const { data, error } = await supabase
        .from('tutor_usage_limits')
        .insert({
          course_id: limit.course_id || null,
          user_id: limit.user_id || null,
          limit_type: limit.limit_type,
          limit_value: limit.limit_value,
          is_active: limit.is_active,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error setting usage limit:', error);
    throw error;
  }
}

/**
 * Verifica si se ha excedido un límite
 */
export async function checkLimitExceeded(
  courseId?: string | number,
  userId?: string
): Promise<Array<{ limit: UsageLimit; current: number; exceeded: boolean }>> {
  try {
    const limits = await getUsageLimits(courseId, userId);
    const results: Array<{ limit: UsageLimit; current: number; exceeded: boolean }> = [];

    for (const limit of limits) {
      let current = 0;

      if (limit.limit_type === 'daily_cost' || limit.limit_type === 'monthly_cost') {
        const today = new Date();
        const startDate =
          limit.limit_type === 'daily_cost'
            ? new Date(today.getFullYear(), today.getMonth(), today.getDate())
            : new Date(today.getFullYear(), today.getMonth(), 1);

        const metrics = await getCostMetrics({
          startDate,
          courseId: limit.course_id ? (typeof limit.course_id === 'string' ? parseInt(limit.course_id, 10) : limit.course_id) : undefined,
          userId: limit.user_id || undefined,
        });

        current =
          limit.limit_type === 'daily_cost' ? metrics.today : metrics.thisMonth;
      } else {
        // Para límites de tokens, necesitaríamos calcular tokens usados
        // Por ahora, retornamos 0
        current = 0;
      }

      results.push({
        limit,
        current,
        exceeded: current >= limit.limit_value,
      });
    }

    return results;
  } catch (error) {
    console.error('Error checking limits:', error);
    return [];
  }
}

/**
 * Desactiva un límite
 */
export async function deactivateLimit(limitId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('tutor_usage_limits')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', limitId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deactivating limit:', error);
    throw error;
  }
}

