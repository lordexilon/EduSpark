// services/quizService.ts
// Servicios para gestión de quizzes y assessments

import { supabase } from '../lib/supabase';

export interface Assessment {
  id: string;
  course_id: number;
  unit_id?: string;
  session_id?: string;
  title: string;
  description?: string;
  assessment_type: 'quiz' | 'trivia' | 'exam' | 'project' | 'assignment';
  instructions?: string;
  time_limit?: number;
  max_attempts?: number;
  passing_score: number;
  total_points: number;
  is_published: boolean;
  is_active: boolean;
  allow_late_submission: boolean;
  is_final_exam?: boolean; // Indica si es un examen final del curso
  available_from?: string;
  available_until?: string;
  due_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'matching';
  order_index: number;
  options?: Array<{ id: string; text: string; correct: boolean }>;
  correct_answer?: any; // JSONB
  explanation?: string;
  points: number;
  partial_credit: boolean;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssessmentAttempt {
  id: string;
  student_id: string;
  assessment_id: string;
  attempt_number: number;
  status: 'in_progress' | 'submitted' | 'auto_submitted' | 'graded';
  score?: number;
  percentage?: number;
  is_passed?: boolean;
  started_at: string;
  submitted_at?: string;
  time_spent_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  student_id: string;
  response_data: any; // JSONB
  is_correct?: boolean;
  points_earned: number;
  teacher_feedback?: string;
  auto_feedback?: string;
  submitted_at: string;
}

export const quizService = {
  // =====================================================
  // SERVICIOS DE ASSESSMENTS
  // =====================================================

  /**
   * Obtener todos los assessments publicados de un curso
   */
  async getCourseAssessments(courseId: number, types?: string[]): Promise<Assessment[]> {
    let query = supabase
      .from('assessments')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (types && types.length > 0) {
      query = query.in('assessment_type', types);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener assessments de una unidad específica
   */
  async getUnitAssessments(unitId: string): Promise<Assessment[]> {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('unit_id', unitId)
      .eq('is_published', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener assessments de una sesión específica
   */
  async getSessionAssessments(sessionId: string): Promise<Assessment[]> {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_published', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener assessment por ID con sus preguntas
   */
  async getAssessmentWithQuestions(assessmentId: string): Promise<{ assessment: Assessment; questions: Question[] }> {
    // Obtener assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .maybeSingle();

    if (assessmentError) throw assessmentError;
    if (!assessment) throw new Error('El quiz no existe o no tienes permiso para verlo (asegúrate de estar inscrito en el curso y que el quiz esté publicado).');

    // Obtener preguntas
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('order_index', { ascending: true });

    if (questionsError) throw questionsError;

    return {
      assessment,
      questions: questions || []
    };
  },

  /**
   * Crear assessment (solo docentes)
   */
  async createAssessment(assessment: Omit<Assessment, 'id' | 'created_at' | 'updated_at'>): Promise<Assessment> {
    const { data, error } = await supabase
      .from('assessments')
      .insert([assessment])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Actualizar assessment (solo docentes)
   */
  async updateAssessment(id: string, updates: Partial<Assessment>): Promise<Assessment> {
    const { data, error } = await supabase
      .from('assessments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Eliminar assessment (solo docentes)
   */
  async deleteAssessment(id: string): Promise<void> {
    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // =====================================================
  // SERVICIOS DE QUESTIONS
  // =====================================================

  /**
   * Crear pregunta en un assessment (solo docentes)
   */
  async createQuestion(question: Omit<Question, 'id' | 'created_at' | 'updated_at'>): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .insert([question])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Actualizar pregunta (solo docentes)
   */
  async updateQuestion(id: string, updates: Partial<Question>): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Eliminar pregunta (solo docentes)
   */
  async deleteQuestion(id: string): Promise<void> {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Reordenar preguntas
   */
  async reorderQuestions(assessmentId: string, questionOrders: Array<{ id: string; order_index: number }>): Promise<void> {
    const updates = questionOrders.map(qo => ({
      ...qo,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('questions')
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;
  },

  // =====================================================
  // SERVICIOS DE ATTEMPTS
  // =====================================================

  /**
   * Iniciar un intento de assessment
   */
  async startAttempt(studentId: string, assessmentId: string, attemptNumber: number): Promise<AssessmentAttempt> {
    const { data, error } = await supabase
      .from('assessment_attempts')
      .insert({
        student_id: studentId,
        assessment_id: assessmentId,
        attempt_number: attemptNumber,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Verificar si ya existe un intento
   */
  async getExistingAttempts(studentId: string, assessmentId: string): Promise<AssessmentAttempt[]> {
    const { data, error } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('student_id', studentId)
      .eq('assessment_id', assessmentId)
      .order('attempt_number', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener intento activo del estudiante
   */
  async getActiveAttempt(studentId: string, assessmentId: string): Promise<AssessmentAttempt | null> {
    const { data, error } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('student_id', studentId)
      .eq('assessment_id', assessmentId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Enviar respuesta a una pregunta
   */
  async submitResponse(response: Omit<QuestionResponse, 'id' | 'submitted_at'>): Promise<QuestionResponse> {
    // Primero verificar si ya existe una respuesta
    const { data: existing } = await supabase
      .from('question_responses')
      .select('*')
      .eq('attempt_id', response.attempt_id)
      .eq('question_id', response.question_id)
      .eq('student_id', response.student_id)
      .maybeSingle();

    // Asegurar que response_data sea válido para JSONB
    let responseDataValue = response.response_data;
    if (typeof responseDataValue === 'string') {
      // Si es string, dejarlo como está (Supabase lo manejará)
      responseDataValue = responseDataValue;
    } else if (responseDataValue !== null && responseDataValue !== undefined) {
      // Si es otro tipo, asegurar que sea serializable
      responseDataValue = responseDataValue;
    }

    const responseData = {
      attempt_id: response.attempt_id,
      question_id: response.question_id,
      student_id: response.student_id,
      response_data: responseDataValue,
      is_correct: response.is_correct,
      points_earned: response.points_earned,
      teacher_feedback: response.teacher_feedback,
      auto_feedback: response.auto_feedback,
      submitted_at: new Date().toISOString()
    };

    if (existing) {
      // Actualizar respuesta existente
      const { data, error } = await supabase
        .from('question_responses')
        .update(responseData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Insertar nueva respuesta
      const { data, error } = await supabase
        .from('question_responses')
        .insert([responseData])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  /**
   * Enviar intento completo
   */
  async submitAttempt(attemptId: string, timeSpentMinutes?: number): Promise<AssessmentAttempt> {
    // Primero obtener el intento para obtener el assessment_id
    const { data: attemptData, error: attemptError } = await supabase
      .from('assessment_attempts')
      .select('assessment_id')
      .eq('id', attemptId)
      .single();

    if (attemptError) throw attemptError;

    // Obtener todas las respuestas para calcular el score
    const { data: responses, error: responsesError } = await supabase
      .from('question_responses')
      .select('points_earned')
      .eq('attempt_id', attemptId);

    if (responsesError) throw responsesError;

    // Calcular score total
    const totalScore = responses?.reduce((sum, r) => sum + (r.points_earned || 0), 0) || 0;

    // Obtener el assessment y las preguntas para calcular total_points real
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('total_points')
      .eq('id', attemptData.assessment_id)
      .single();

    if (assessmentError) throw assessmentError;

    // Obtener todas las preguntas para calcular puntos totales reales
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('points')
      .eq('assessment_id', attemptData.assessment_id);

    if (questionsError) throw questionsError;

    // Calcular puntos totales basado en las preguntas
    const totalPointsFromQuestions = questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0;

    // Usar el total calculado de preguntas o el del assessment, el que sea más preciso
    const totalPoints = totalPointsFromQuestions > 0 ? totalPointsFromQuestions : assessment.total_points;

    // Calcular percentage
    const percentage = totalPoints > 0
      ? (totalScore / totalPoints) * 100
      : 0;

    // Determinar si pasó
    const { data: assessmentFull, error: assessmentFullError } = await supabase
      .from('assessments')
      .select('passing_score')
      .eq('id', attemptData.assessment_id)
      .single();

    if (assessmentFullError) throw assessmentFullError;

    const isPassed = assessmentFull.passing_score
      ? percentage >= assessmentFull.passing_score
      : undefined;

    // Actualizar intento con score, percentage y status
    const { data, error } = await supabase
      .from('assessment_attempts')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        time_spent_minutes: timeSpentMinutes,
        score: totalScore,
        percentage: percentage,
        is_passed: isPassed
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Obtener resultados de un intento
   */
  async getAttemptResults(attemptId: string): Promise<{
    attempt: AssessmentAttempt;
    responses: QuestionResponse[];
  }> {
    // Obtener intento
    const { data: attempt, error: attemptError } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptError) throw attemptError;

    // Obtener respuestas
    const { data: responses, error: responsesError } = await supabase
      .from('question_responses')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('submitted_at', { ascending: true });

    if (responsesError) throw responsesError;

    return {
      attempt,
      responses: responses || []
    };
  },

  /**
   * Obtener todos los intentos de un estudiante en un assessment
   */
  async getStudentAttempts(studentId: string, assessmentId: string): Promise<AssessmentAttempt[]> {
    const { data, error } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('student_id', studentId)
      .eq('assessment_id', assessmentId)
      .order('attempt_number', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Calificar respuesta manualmente (solo docentes)
   */
  async gradeResponse(responseId: string, pointsEarned: number, feedback?: string): Promise<QuestionResponse> {
    const { data, error } = await supabase
      .from('question_responses')
      .update({
        points_earned: pointsEarned,
        teacher_feedback: feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', responseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Marcar intento como calificado (solo docentes)
   */
  async markAttemptAsGraded(attemptId: string): Promise<AssessmentAttempt> {
    const { data, error } = await supabase
      .from('assessment_attempts')
      .update({
        status: 'graded'
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

