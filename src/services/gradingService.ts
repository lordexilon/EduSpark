// services/gradingService.ts
// Servicio para gestión de ponderaciones y cálculo de notas finales

import { supabase } from '@/lib/supabase';
import { getFlashcardMasteryPercentage } from './flashcardService';

export interface SubjectGradingWeights {
  id: string;
  subject_id: number;
  quizzes_weight: number;
  exam1_weight: number;
  exam2_weight: number;
  exam3_weight: number; // Nuevo: Tercer parcial
  final_exam_weight: number;
  practicals_weight: number; // Nuevo: Trabajos Prácticos
  flashcards_weight?: number;
  allow_custom_weights: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentFinalGrade {
  studentId: string;
  courseId: number;
  subjectId: number | null;
  quizzesAverage: number | null;
  exam1Score: number | null;
  exam2Score: number | null;
  exam3Score: number | null; // Nuevo
  finalExamScore: number | null;
  practicalsScore: number | null; // Nuevo: Promedio de tareas específicas o labs
  flashcardsScore: number | null;
  finalGrade: number | null;
  weights: SubjectGradingWeights | null;
  breakdown: {
    quizzesContribution: number;
    exam1Contribution: number;
    exam2Contribution: number;
    exam3Contribution: number; // Nuevo
    finalExamContribution: number;
    practicalsContribution: number; // Nuevo
    flashcardsContribution: number;
  };
}

export const gradingService = {
  /**
   * Obtener subject_id de un curso
   */
  async getCourseSubjectId(courseId: number): Promise<number | null> {
    const { data: course, error } = await supabase
      .from('courses')
      .select('subject_id')
      .eq('id', courseId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching course subject:', error);
      throw error;
    }
    return course?.subject_id || null;
  },

  /**
   * Obtener o crear configuración de ponderación para una materia
   */
  async getOrCreateGradingWeights(subjectId: number): Promise<SubjectGradingWeights> {
    // Intentar obtener configuración existente
    const { data: existing, error: fetchError } = await supabase
      .from('subject_grading_weights')
      .select('*')
      .eq('subject_id', subjectId)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // Si no existe, crear con valores por defecto
    const { data: newWeights, error: createError } = await supabase
      .from('subject_grading_weights')
      .insert([{
        subject_id: subjectId,
        quizzes_weight: 30.00,
        exam1_weight: 20.00,
        exam2_weight: 20.00,
        exam3_weight: 0.00,
        final_exam_weight: 30.00,
        practicals_weight: 0.00,
        allow_custom_weights: true
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating grading weights:', createError);
      throw createError;
    }
    return newWeights;
  },

  /**
   * Obtener configuración de ponderación de una materia (sin crear si no existe)
   */
  async getGradingWeights(subjectId: number): Promise<SubjectGradingWeights | null> {
    const { data, error } = await supabase
      .from('subject_grading_weights')
      .select('*')
      .eq('subject_id', subjectId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching grading weights:', error);
      throw error;
    }
    return data;
  },

  /**
   * Obtener ponderación de un curso (obtiene la materia del curso)
   */
  async getGradingWeightsByCourse(courseId: number): Promise<SubjectGradingWeights | null> {
    const subjectId = await this.getCourseSubjectId(courseId);
    if (!subjectId) {
      return null;
    }
    return this.getGradingWeights(subjectId);
  },

  /**
   * Actualizar ponderaciones de una materia
   */
  async updateGradingWeights(
    subjectId: number,
    weights: Partial<Omit<SubjectGradingWeights, 'id' | 'subject_id' | 'created_at' | 'updated_at'>>
  ): Promise<SubjectGradingWeights> {
    // Validar que la suma sea 100%
    const total = (weights.quizzes_weight || 0) +
      (weights.exam1_weight || 0) +
      (weights.exam2_weight || 0) +
      (weights.exam3_weight || 0) +
      (weights.final_exam_weight || 0) +
      (weights.practicals_weight || 0);

    if (Math.abs(total - 100) > 0.01) {
      throw new Error('La suma de las ponderaciones debe ser exactamente 100%');
    }

    // Verificar si existe, si no, crear primero
    const existing = await this.getGradingWeights(subjectId);
    if (!existing) {
      await this.getOrCreateGradingWeights(subjectId);
    }

    const { data, error } = await supabase
      .from('subject_grading_weights')
      .update({
        ...weights,
        updated_at: new Date().toISOString()
      })
      .eq('subject_id', subjectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating grading weights:', error);
      throw error;
    }
    return data;
  },

  /**
   * Calcular nota final de un estudiante en un curso (versión interna con datos precargados)
   */
  async _calculateFinalGradeInternal(
    studentId: string,
    courseId: number,
    subjectId: number | null,
    weights: SubjectGradingWeights | null,
    courseAssessments: any[],
    studentAttempts: any[],
    courseAssignments: any[],
    studentSubmissions: any[]
  ): Promise<StudentFinalGrade> {
    if (!subjectId || !weights) {
      return {
        studentId, courseId, subjectId: null, quizzesAverage: null, exam1Score: null,
        exam2Score: null, exam3Score: null, finalExamScore: null, practicalsScore: null,
        flashcardsScore: null, finalGrade: null, weights: null,
        breakdown: {
          quizzesContribution: 0, exam1Contribution: 0, exam2Contribution: 0,
          exam3Contribution: 0, finalExamContribution: 0, practicalsContribution: 0,
          flashcardsContribution: 0
        }
      };
    }

    // Filtrar intentos por los assessments publicados del curso
    const assessmentIds = courseAssessments.map(a => a.id);
    const validAttempts = studentAttempts.filter(a => assessmentIds.includes(a.assessments?.id));

    // Separar por tipo
    const quizzes = validAttempts.filter((a: any) =>
      ['quiz', 'trivia'].includes(a.assessments?.assessment_type)
    );

    const assessmentsAssignments = validAttempts.filter((a: any) =>
      a.assessments?.assessment_type === 'assignment'
    );

    const exams = validAttempts.filter((a: any) =>
      a.assessments?.assessment_type === 'exam'
    );

    // Calcular notas de tareas (assignment_submissions)
    let assignmentsGrades: number[] = [];
    if (courseAssignments.length > 0 && studentSubmissions.length > 0) {
      const assignmentIds = courseAssignments.map(a => a.id);
      const validSubmissions = studentSubmissions.filter(s => assignmentIds.includes(s.assignment_id));

      const maxPointsMap = new Map<string, number>();
      courseAssignments.forEach((a: any) => maxPointsMap.set(a.id, a.max_points || 100));

      assignmentsGrades = validSubmissions.map((sub: any) => {
        const maxPoints = sub.assignments?.max_points || maxPointsMap.get(sub.assignment_id) || 100;
        return ((sub.grade || 0) / maxPoints) * 100;
      });
    }

    // Promedio de Quizzes y Tareas
    const quizzesPercentages = quizzes.map((q: any) => q.percentage || 0);
    const assessmentsAssignmentsPercentages = assessmentsAssignments.map((a: any) => a.percentage || 0);
    const allQuizzesAndAssignments = [...quizzesPercentages, ...assessmentsAssignmentsPercentages, ...assignmentsGrades];

    const quizzesAverage = allQuizzesAndAssignments.length > 0
      ? allQuizzesAndAssignments.reduce((sum, p) => sum + p, 0) / allQuizzesAndAssignments.length
      : null;

    // Identificar Parciales y Final
    const sortedExams = exams.sort((a, b) => {
      const dateA = a.submitted_at || a.created_at || '';
      const dateB = b.submitted_at || b.created_at || '';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    const finalExams = sortedExams.filter(e => e.assessments?.title?.toLowerCase().includes('final'));
    const regularExams = sortedExams.filter(e => !e.assessments?.title?.toLowerCase().includes('final'));

    const exam1Score = regularExams[0]?.percentage || null;
    const exam2Score = regularExams[1]?.percentage || null;
    const exam3Score = regularExams[2]?.percentage || null;
    const finalExamScore = finalExams[0]?.percentage || null;

    // Practicals
    const practicalAttempts = validAttempts.filter(a =>
      ['práctico', 'lab', 'taller'].some(term => a.assessments?.title?.toLowerCase().includes(term))
    );
    const practicalsScore = practicalAttempts.length > 0
      ? practicalAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / practicalAttempts.length
      : null;

    // Flashcards (sólo si tiene peso)
    let flashcardsScore: number | null = null;
    if (weights.flashcards_weight && weights.flashcards_weight > 0) {
      try {
        flashcardsScore = await getFlashcardMasteryPercentage(studentId, courseId);
      } catch (e) {
        flashcardsScore = null;
      }
    }

    // Cálculo final ponderado
    let finalGrade: number | null = null;
    const breakdown = {
      quizzesContribution: 0, exam1Contribution: 0, exam2Contribution: 0,
      exam3Contribution: 0, finalExamContribution: 0, practicalsContribution: 0,
      flashcardsContribution: 0
    };

    if (quizzesAverage !== null || exam1Score !== null || exam2Score !== null || exam3Score !== null || finalExamScore !== null || practicalsScore !== null || flashcardsScore !== null) {
      breakdown.quizzesContribution = (quizzesAverage || 0) * (weights.quizzes_weight / 100);
      breakdown.exam1Contribution = (exam1Score || 0) * (weights.exam1_weight / 100);
      breakdown.exam2Contribution = (exam2Score || 0) * (weights.exam2_weight / 100);
      breakdown.exam3Contribution = (exam3Score || 0) * (weights.exam3_weight / 100);
      breakdown.finalExamContribution = (finalExamScore || 0) * (weights.final_exam_weight / 100);
      breakdown.practicalsContribution = (practicalsScore || 0) * (weights.practicals_weight / 100);
      breakdown.flashcardsContribution = (flashcardsScore || 0) * ((weights.flashcards_weight || 0) / 100);

      finalGrade = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
      finalGrade = Math.round(finalGrade * 100) / 100;
    }

    return {
      studentId, courseId, subjectId, quizzesAverage, exam1Score,
      exam2Score, exam3Score, finalExamScore, practicalsScore,
      flashcardsScore, finalGrade, weights, breakdown
    };
  },

  /**
   * Calcular nota final de un estudiante en un curso
   */
  async calculateFinalGrade(studentId: string, courseId: number): Promise<StudentFinalGrade> {
    // Versión individual optimizada (fetches necesarios para un solo estudiante)
    const subjectId = await this.getCourseSubjectId(courseId);
    if (!subjectId) return this._calculateFinalGradeInternal(studentId, courseId, null, null, [], [], [], []);

    const weights = await this.getOrCreateGradingWeights(subjectId);

    const { data: assessments } = await supabase.from('assessments').select('id, assessment_type, title').eq('course_id', courseId).eq('is_published', true);
    const { data: attempts } = await supabase.from('assessment_attempts').select('*, assessments!inner(id, assessment_type, title)').eq('student_id', studentId).eq('assessments.course_id', courseId).in('status', ['submitted', 'graded']);
    const { data: assignments } = await supabase.from('assignments').select('id, max_points').eq('course_id', courseId);
    const { data: submissions } = await supabase.from('assignment_submissions').select('assignment_id, grade, assignments!inner(max_points)').eq('student_id', studentId).in('assignment_id', (assignments || []).map(a => a.id)).not('grade', 'is', null);

    return this._calculateFinalGradeInternal(
      studentId, courseId, subjectId, weights,
      assessments || [], attempts || [], assignments || [], submissions || []
    );
  },

  /**
   * Calcular notas finales de todos los estudiantes de un curso (OPTIMIZADO con Batch Fetches)
   */
  async calculateAllStudentsFinalGrades(courseId: number): Promise<StudentFinalGrade[]> {
    // 1. Datos comunes (1 sola vez)
    const subjectId = await this.getCourseSubjectId(courseId);
    if (!subjectId) return [];
    const weights = await this.getOrCreateGradingWeights(subjectId);

    // 2. Estudiantes inscritos
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('course_enrollments')
      .select('student_id')
      .eq('course_id', courseId)
      .eq('status', 'active');

    if (enrollmentsError || !enrollments || enrollments.length === 0) return [];
    const studentIds = enrollments.map(e => e.student_id);

    // 3. Batch FETCH de todos los datos relevantes del curso para todos los estudiantes
    const [
      { data: assessments },
      { data: allAttempts },
      { data: assignments },
      { data: allSubmissions }
    ] = await Promise.all([
      supabase.from('assessments').select('id, assessment_type, title').eq('course_id', courseId).eq('is_published', true),
      supabase.from('assessment_attempts').select('*, assessments!inner(id, assessment_type, title)').in('student_id', studentIds).eq('assessments.course_id', courseId).in('status', ['submitted', 'graded']),
      supabase.from('assignments').select('id, max_points').eq('course_id', courseId),
      supabase.from('assignment_submissions').select('student_id, assignment_id, grade, assignments!inner(max_points)').in('student_id', studentIds).in('assignment_id', (await supabase.from('assignments').select('id').eq('course_id', courseId)).data?.map(a => a.id) || []).not('grade', 'is', null)
    ]);

    // 4. Organizar datos por estudiante en memoria
    const attemptsMap = new Map<string, any[]>();
    allAttempts?.forEach(a => {
      if (!attemptsMap.has(a.student_id)) attemptsMap.set(a.student_id, []);
      attemptsMap.get(a.student_id)?.push(a);
    });

    const submissionsMap = new Map<string, any[]>();
    allSubmissions?.forEach(s => {
      if (!submissionsMap.has(s.student_id)) submissionsMap.set(s.student_id, []);
      submissionsMap.get(s.student_id)?.push(s);
    });

    // 5. Procesar cada estudiante en paralelo (uso de memoria vs red)
    const finalGrades = await Promise.all(
      studentIds.map(studentId =>
        this._calculateFinalGradeInternal(
          studentId,
          courseId,
          subjectId,
          weights,
          assessments || [],
          attemptsMap.get(studentId) || [],
          assignments || [],
          submissionsMap.get(studentId) || []
        )
      )
    );

    return finalGrades;
  }
};

