// services/rubricService.ts
// S3-T02 — Servicio de rúbricas reutilizables (HU-D02)
// Operaciones CRUD para rubrics, rubric_criteria y rubric_results.

import { supabase } from '@/lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type RubricLevel = {
  level: 'excelente' | 'bueno' | 'regular' | 'insuficiente';
  label: string;
  description: string;
  score: number; // puntaje absoluto del nivel (ej: 4, 3, 2, 1)
};

export interface RubricCriterion {
  id: string;
  rubric_id: string;
  title: string;
  description?: string;
  order_index: number;
  weight: number; // % sobre 100
  levels: RubricLevel[];
  created_at: string;
}

export interface Rubric {
  id: string;
  teacher_id: string;
  course_id?: number | null;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  criteria?: RubricCriterion[];
}

export interface RubricSelection {
  criterion_id: string;
  selected_level_score: number;
  comment?: string;
}

export interface RubricResult {
  id: string;
  rubric_id: string;
  submission_id: string;
  graded_by: string;
  selections: RubricSelection[];
  total_score: number | null;
  max_score: number | null;
  percentage: number | null;
  teacher_comment?: string;
  graded_at: string;
}

// ─── Niveles por defecto ──────────────────────────────────────────────────────

export const DEFAULT_LEVELS: RubricLevel[] = [
  {
    level: 'excelente',
    label: 'Excelente',
    description: 'Supera los criterios esperados',
    score: 4,
  },
  { level: 'bueno', label: 'Bueno', description: 'Cumple los criterios esperados', score: 3 },
  {
    level: 'regular',
    label: 'Regular',
    description: 'Cumple parcialmente los criterios',
    score: 2,
  },
  {
    level: 'insuficiente',
    label: 'Insuficiente',
    description: 'No cumple los criterios mínimos',
    score: 1,
  },
];

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const rubricService = {
  // ── CRUD de Rúbricas ────────────────────────────────────────────────────────

  /** Obtiene todas las rúbricas del docente autenticado (con criterios incluidos). */
  async getMyRubrics(courseId?: number): Promise<Rubric[]> {
    let query = supabase
      .from('rubrics')
      .select(
        `
        *,
        rubric_criteria (*)
      `
      )
      .order('created_at', { ascending: false });

    if (courseId) {
      // Globales del docente + las del curso específico
      query = query.or(`course_id.is.null,course_id.eq.${courseId}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((r) => ({
      ...r,
      criteria: (r.rubric_criteria || []).sort(
        (a: RubricCriterion, b: RubricCriterion) => a.order_index - b.order_index
      ),
    }));
  },

  /** Obtiene una rúbrica por ID con sus criterios. */
  async getRubric(id: string): Promise<Rubric | null> {
    const { data, error } = await supabase
      .from('rubrics')
      .select(`*, rubric_criteria (*)`)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      criteria: (data.rubric_criteria || []).sort(
        (a: RubricCriterion, b: RubricCriterion) => a.order_index - b.order_index
      ),
    };
  },

  /** Crea una rúbrica vacía. */
  async createRubric(
    payload: Pick<Rubric, 'title' | 'description' | 'course_id'>
  ): Promise<Rubric> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('rubrics')
      .insert([{ ...payload, teacher_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return { ...data, criteria: [] };
  },

  /** Actualiza título/descripción de una rúbrica. */
  async updateRubric(
    id: string,
    updates: Partial<Pick<Rubric, 'title' | 'description' | 'course_id'>>
  ): Promise<Rubric> {
    const { data, error } = await supabase
      .from('rubrics')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Elimina una rúbrica (y sus criterios por CASCADE). */
  async deleteRubric(id: string): Promise<void> {
    const { error } = await supabase.from('rubrics').delete().eq('id', id);
    if (error) throw error;
  },

  // ── CRUD de Criterios ────────────────────────────────────────────────────────

  /** Agregar un criterio a una rúbrica. */
  async addCriterion(
    rubricId: string,
    criterion: Omit<RubricCriterion, 'id' | 'rubric_id' | 'created_at'>
  ): Promise<RubricCriterion> {
    const { data, error } = await supabase
      .from('rubric_criteria')
      .insert([{ ...criterion, rubric_id: rubricId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Actualiza un criterio (título, descripción, peso, niveles). */
  async updateCriterion(
    id: string,
    updates: Partial<Omit<RubricCriterion, 'id' | 'rubric_id' | 'created_at'>>
  ): Promise<RubricCriterion> {
    const { data, error } = await supabase
      .from('rubric_criteria')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Elimina un criterio. */
  async deleteCriterion(id: string): Promise<void> {
    const { error } = await supabase.from('rubric_criteria').delete().eq('id', id);
    if (error) throw error;
  },

  /** Reemplaza todos los criterios de una rúbrica (para sincronización completa). */
  async replaceCriteria(
    rubricId: string,
    criteria: Omit<RubricCriterion, 'id' | 'rubric_id' | 'created_at'>[]
  ): Promise<RubricCriterion[]> {
    // 1. Eliminar todos los criterios actuales
    await supabase.from('rubric_criteria').delete().eq('rubric_id', rubricId);

    if (criteria.length === 0) return [];

    // 2. Insertar los nuevos con orden preservado
    const { data, error } = await supabase
      .from('rubric_criteria')
      .insert(criteria.map((c, i) => ({ ...c, rubric_id: rubricId, order_index: i })))
      .select();

    if (error) throw error;
    return data || [];
  },

  // ── Resultados de rúbrica ────────────────────────────────────────────────────

  /** Aplica una rúbrica a una entrega. Calcula el puntaje automáticamente. */
  async applyRubric(payload: {
    rubric_id: string;
    submission_id: string;
    criteria: RubricCriterion[];
    selections: RubricSelection[];
    teacher_comment?: string;
    assignment_max_points: number; // puntaje máximo de la tarea (para escalar el resultado)
  }): Promise<RubricResult> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    // Calcular puntaje: suma ponderada de niveles seleccionados
    const maxLevelScore = Math.max(...(payload.criteria[0]?.levels?.map((l) => l.score) ?? [4]));

    let totalWeighted = 0;
    payload.criteria.forEach((criterion) => {
      const sel = payload.selections.find((s) => s.criterion_id === criterion.id);
      if (sel) {
        // contribución = (score_seleccionado / max_score) * weight_del_criterio
        totalWeighted += (sel.selected_level_score / maxLevelScore) * criterion.weight;
      }
    });

    // totalWeighted está en % (0-100). Escalar a los puntos de la tarea.
    const rawPercentage = Math.min(100, Math.max(0, totalWeighted));
    const scaledScore =
      Math.round((rawPercentage / 100) * payload.assignment_max_points * 100) / 100;

    const { data, error } = await supabase
      .from('rubric_results')
      .upsert(
        [
          {
            rubric_id: payload.rubric_id,
            submission_id: payload.submission_id,
            graded_by: user.id,
            selections: payload.selections,
            total_score: scaledScore,
            max_score: payload.assignment_max_points,
            percentage: rawPercentage,
            teacher_comment: payload.teacher_comment,
            graded_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'submission_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Obtiene el resultado de rúbrica de una entrega (si existe). */
  async getRubricResult(submissionId: string): Promise<RubricResult | null> {
    const { data, error } = await supabase
      .from('rubric_results')
      .select('*')
      .eq('submission_id', submissionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
