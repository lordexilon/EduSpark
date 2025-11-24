// services/gradingService.ts
// Servicio para gestión de ponderaciones y cálculo de notas finales

import { supabase } from '../lib/supabase';

export interface SubjectGradingWeights {
  id: string;
  subject_id: number;
  quizzes_weight: number;
  exam1_weight: number;
  exam2_weight: number;
  final_exam_weight: number;
  flashcards_weight?: number; // Opcional: ponderación de flashcards
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
  finalExamScore: number | null;
  flashcardsScore: number | null; // Porcentaje de flashcards dominadas
  finalGrade: number | null;
  weights: SubjectGradingWeights | null;
  breakdown: {
    quizzesContribution: number;
    exam1Contribution: number;
    exam2Contribution: number;
    finalExamContribution: number;
    flashcardsContribution: number; // Contribución de flashcards
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
        final_exam_weight: 30.00,
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
                  (weights.final_exam_weight || 0);
    
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
   * Calcular nota final de un estudiante en un curso
   */
  async calculateFinalGrade(
    studentId: string, 
    courseId: number
  ): Promise<StudentFinalGrade> {
    // Obtener subject_id del curso
    const subjectId = await this.getCourseSubjectId(courseId);
    
    // Si el curso no tiene materia, retornar sin ponderación
    if (!subjectId) {
      return {
        studentId,
        courseId,
        subjectId: null,
        quizzesAverage: null,
        exam1Score: null,
        exam2Score: null,
        finalExamScore: null,
        finalGrade: null,
        weights: null,
        breakdown: {
          quizzesContribution: 0,
          exam1Contribution: 0,
          exam2Contribution: 0,
          finalExamContribution: 0,
          flashcardsContribution: 0
        }
      };
    }

    // Obtener ponderación de la materia (o crear con valores por defecto)
    const weights = await this.getOrCreateGradingWeights(subjectId);

    // Obtener todos los assessments del curso
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('id, assessment_type, title')
      .eq('course_id', courseId)
      .eq('is_published', true);

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
      throw assessmentsError;
    }

    if (!assessments || assessments.length === 0) {
      return {
        studentId,
        courseId,
        subjectId,
        quizzesAverage: null,
        exam1Score: null,
        exam2Score: null,
        finalExamScore: null,
        flashcardsScore: null,
        finalGrade: null,
        weights,
        breakdown: {
          quizzesContribution: 0,
          exam1Contribution: 0,
          exam2Contribution: 0,
          finalExamContribution: 0,
          flashcardsContribution: 0
        }
      };
    }

    // Obtener intentos del estudiante
    const { data: attempts, error: attemptsError } = await supabase
      .from('assessment_attempts')
      .select(`
        *,
        assessments!inner (
          id,
          assessment_type,
          title
        )
      `)
      .eq('student_id', studentId)
      .in('assessment_id', assessments.map(a => a.id))
      .in('status', ['submitted', 'graded']);

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
      throw attemptsError;
    }

    // Separar por tipo
    const quizzes = (attempts || []).filter((a: any) => 
      ['quiz', 'trivia'].includes(a.assessments?.assessment_type)
    );
    
    const assessmentsAssignments = (attempts || []).filter((a: any) => 
      a.assessments?.assessment_type === 'assignment'
    );

    const exams = (attempts || []).filter((a: any) => 
      a.assessments?.assessment_type === 'exam'
    );

    // Obtener tareas de la tabla assignments (assignments reales)
    const { data: courseAssignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id, max_points')
      .eq('course_id', courseId);

    let assignmentsGrades: number[] = [];
    if (!assignmentsError && courseAssignments && courseAssignments.length > 0) {
      const assignmentIds = courseAssignments.map(a => a.id);
      const { data: submissions, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select(`
          assignment_id,
          grade,
          assignments!inner(max_points)
        `)
        .eq('student_id', studentId)
        .in('assignment_id', assignmentIds)
        .not('grade', 'is', null);

      if (!submissionsError && submissions) {
        // Crear un mapa de max_points por assignment_id
        const maxPointsMap = new Map<string, number>();
        courseAssignments.forEach((a: any) => {
          maxPointsMap.set(a.id, a.max_points || 100);
        });

        // Calcular porcentaje para cada entrega calificada
        assignmentsGrades = submissions.map((sub: any) => {
          const assignmentId = sub.assignment_id;
          const maxPoints = sub.assignments?.max_points || maxPointsMap.get(assignmentId) || 100;
          const grade = sub.grade || 0;
          return (grade / maxPoints) * 100;
        });
      }
    }

    // Combinar quizzes, trivias, assignments de assessments y assignments reales
    const quizzesPercentages = quizzes.map((q: any) => q.percentage || 0);
    const assessmentsAssignmentsPercentages = assessmentsAssignments.map((a: any) => a.percentage || 0);
    const allQuizzesAndAssignments = [...quizzesPercentages, ...assessmentsAssignmentsPercentages, ...assignmentsGrades];
    
    const quizzesAverage = allQuizzesAndAssignments.length > 0
      ? allQuizzesAndAssignments.reduce((sum, p) => sum + p, 0) / allQuizzesAndAssignments.length
      : null;

    // Obtener exámenes (identificar por orden de fecha o por título)
    // Ordenar por fecha de envío
    const sortedExams = exams.sort((a: any, b: any) => {
      const dateA = a.submitted_at || a.created_at || '';
      const dateB = b.submitted_at || b.created_at || '';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    // Identificar exámenes: buscar "final" en el título para el examen final
    const finalExams = sortedExams.filter((e: any) => 
      e.assessments?.title?.toLowerCase().includes('final')
    );
    const regularExams = sortedExams.filter((e: any) => 
      !e.assessments?.title?.toLowerCase().includes('final')
    );

    const exam1Score = regularExams[0]?.percentage || null;
    const exam2Score = regularExams[1]?.percentage || null;
    const finalExamScore = finalExams[0]?.percentage || null;

    // Calcular score de flashcards (porcentaje de dominio)
    let flashcardsScore: number | null = null;
    if (weights.flashcards_weight && weights.flashcards_weight > 0) {
      try {
        const { getFlashcardMasteryPercentage } = await import('./flashcardService');
        flashcardsScore = await getFlashcardMasteryPercentage(studentId, courseId);
      } catch (error) {
        console.warn('Error calculando score de flashcards:', error);
        flashcardsScore = null;
      }
    }

    // Calcular nota final ponderada
    let finalGrade: number | null = null;
    const breakdown = {
      quizzesContribution: 0,
      exam1Contribution: 0,
      exam2Contribution: 0,
      finalExamContribution: 0,
      flashcardsContribution: 0
    };

    if (quizzesAverage !== null || exam1Score !== null || exam2Score !== null || finalExamScore !== null || flashcardsScore !== null) {
      breakdown.quizzesContribution = (quizzesAverage || 0) * (weights.quizzes_weight / 100);
      breakdown.exam1Contribution = (exam1Score || 0) * (weights.exam1_weight / 100);
      breakdown.exam2Contribution = (exam2Score || 0) * (weights.exam2_weight / 100);
      breakdown.finalExamContribution = (finalExamScore || 0) * (weights.final_exam_weight / 100);
      breakdown.flashcardsContribution = (flashcardsScore || 0) * ((weights.flashcards_weight || 0) / 100);
      
      finalGrade = breakdown.quizzesContribution + 
                   breakdown.exam1Contribution + 
                   breakdown.exam2Contribution + 
                   breakdown.finalExamContribution +
                   breakdown.flashcardsContribution;
      
      // Redondear a 2 decimales
      finalGrade = Math.round(finalGrade * 100) / 100;
    }

    return {
      studentId,
      courseId,
      subjectId,
      quizzesAverage,
      exam1Score,
      exam2Score,
      finalExamScore,
      flashcardsScore,
      finalGrade,
      weights,
      breakdown
    };
  },

  /**
   * Calcular notas finales de todos los estudiantes de un curso
   */
  async calculateAllStudentsFinalGrades(courseId: number): Promise<StudentFinalGrade[]> {
    // Obtener todos los estudiantes inscritos en el curso
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('course_enrollments')
      .select('student_id')
      .eq('course_id', courseId)
      .eq('status', 'active');

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
      throw enrollmentsError;
    }

    if (!enrollments || enrollments.length === 0) {
      return [];
    }

    // Calcular nota final para cada estudiante
    const finalGrades = await Promise.all(
      enrollments.map(enrollment => 
        this.calculateFinalGrade(enrollment.student_id, courseId)
      )
    );

    return finalGrades;
  }
};

