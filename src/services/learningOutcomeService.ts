import { supabase } from '@/lib/supabase';

export interface LearningOutcome {
  id: string;
  course_id: number;
  unit_id: string | null;
  code: string;
  statement: string;
  bloom_level: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssessmentLearningOutcomeLink {
  assessment_id: string;
  learning_outcome_id: string;
  weight: number;
}

export interface LearningOutcomeStudentProgress {
  learningOutcome: LearningOutcome;
  /** true si hay al menos un assessment publicado vinculado con intento aprobado del estudiante */
  evidenced: boolean;
}

export const learningOutcomeService = {
  async listByCourse(courseId: number): Promise<LearningOutcome[]> {
    const { data, error } = await supabase
      .from('learning_outcomes')
      .select('*')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(
    row: Omit<LearningOutcome, 'id' | 'created_at' | 'updated_at'>
  ): Promise<LearningOutcome> {
    const { data, error } = await supabase
      .from('learning_outcomes')
      .insert([row])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<LearningOutcome>): Promise<LearningOutcome> {
    const { data, error } = await supabase
      .from('learning_outcomes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('learning_outcomes').delete().eq('id', id);
    if (error) throw error;
  },

  /** Vínculos para todos los assessments de un curso (batch). */
  async listLinksForCourse(courseId: number): Promise<AssessmentLearningOutcomeLink[]> {
    const { data: assessments, error: e1 } = await supabase
      .from('assessments')
      .select('id')
      .eq('course_id', courseId);

    if (e1) throw e1;
    const ids = (assessments || []).map((a) => a.id);
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from('assessment_learning_outcomes')
      .select('assessment_id, learning_outcome_id, weight')
      .in('assessment_id', ids);

    if (error) throw error;
    return data || [];
  },

  /**
   * Progreso del estudiante por RA: evidencia = assessment publicado vinculado + intento aprobado
   * (is_passed o percentage >= passing_score del instrumento).
   */
  async getStudentProgress(
    courseId: number,
    studentId: string
  ): Promise<LearningOutcomeStudentProgress[]> {
    const los = (await this.listByCourse(courseId)).filter((lo) => lo.is_active);
    if (los.length === 0) return [];

    const links = await this.listLinksForCourse(courseId);
    const loToAssessments = new Map<string, string[]>();
    for (const l of links) {
      if (!loToAssessments.has(l.learning_outcome_id)) {
        loToAssessments.set(l.learning_outcome_id, []);
      }
      loToAssessments.get(l.learning_outcome_id)!.push(l.assessment_id);
    }

    const allLinkedAssessmentIds = [...new Set(links.map((x) => x.assessment_id))];
    if (allLinkedAssessmentIds.length === 0) {
      return los.map((lo) => ({ learningOutcome: lo, evidenced: false }));
    }

    const { data: assessments, error: ae } = await supabase
      .from('assessments')
      .select('id, is_published, passing_score')
      .in('id', allLinkedAssessmentIds);

    if (ae) throw ae;

    const publishedIds = new Set(
      (assessments || []).filter((a) => a.is_published).map((a) => a.id)
    );
    const passingById = new Map(
      (assessments || []).map((a) => [a.id, Number(a.passing_score ?? 70)])
    );

    if (publishedIds.size === 0) {
      return los.map((lo) => ({ learningOutcome: lo, evidenced: false }));
    }

    const { data: attempts, error: te } = await supabase
      .from('assessment_attempts')
      .select('assessment_id, is_passed, percentage, status')
      .eq('student_id', studentId)
      .in('assessment_id', [...publishedIds])
      .in('status', ['submitted', 'graded']);

    if (te) throw te;

    const passedAssessmentIds = new Set<string>();
    for (const att of attempts || []) {
      if (!publishedIds.has(att.assessment_id)) continue;
      const minPass = passingById.get(att.assessment_id) ?? 70;
      const pct = att.percentage != null ? Number(att.percentage) : null;
      const ok = att.is_passed === true || (pct != null && !Number.isNaN(pct) && pct >= minPass);
      if (ok) passedAssessmentIds.add(att.assessment_id);
    }

    return los.map((lo) => {
      const aIds = loToAssessments.get(lo.id) || [];
      const evidenced = aIds.some((aid) => publishedIds.has(aid) && passedAssessmentIds.has(aid));
      return { learningOutcome: lo, evidenced };
    });
  },

  /**
   * Resumen por curso para dashboard: total RA activos vs evidenciados (consultas en paralelo).
   */
  async getCoursesRaSummary(
    courseIds: number[],
    studentId: string
  ): Promise<Record<number, { total: number; evidenced: number }>> {
    const out: Record<number, { total: number; evidenced: number }> = {};
    for (const cid of courseIds) {
      out[cid] = { total: 0, evidenced: 0 };
    }
    await Promise.all(
      courseIds.map(async (cid) => {
        try {
          const rows = await this.getStudentProgress(cid, studentId);
          out[cid] = {
            total: rows.length,
            evidenced: rows.filter((r) => r.evidenced).length,
          };
        } catch {
          out[cid] = { total: 0, evidenced: 0 };
        }
      })
    );
    return out;
  },

  /** Reemplaza los RA vinculados a un assessment. */
  async setLinksForAssessment(assessmentId: string, learningOutcomeIds: string[]): Promise<void> {
    const { error: delErr } = await supabase
      .from('assessment_learning_outcomes')
      .delete()
      .eq('assessment_id', assessmentId);

    if (delErr) throw delErr;

    if (learningOutcomeIds.length === 0) return;

    const rows = learningOutcomeIds.map((learning_outcome_id) => ({
      assessment_id: assessmentId,
      learning_outcome_id,
      weight: 1.0,
    }));

    const { error: insErr } = await supabase.from('assessment_learning_outcomes').insert(rows);
    if (insErr) throw insErr;
  },
};
