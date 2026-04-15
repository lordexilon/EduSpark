// services/assignments.ts
// Servicios para gestión de tareas y entregas

import { supabase } from '@/lib/supabase';

export interface Assignment {
  id: string;
  course_id: number;
  unit_id?: string;
  session_id?: string;
  title: string;
  description?: string;
  due_at?: string;
  max_points: number;
  attachments: Record<string, any>[];
  created_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  submitted_at: string;
  url?: string;
  text?: string;
  grade?: number;
  feedback?: string;
}

export interface AssignmentWithSubmissions extends Assignment {
  submissions: AssignmentSubmission[];
  submission_count: number;
  graded_count: number;
}

// Servicios de Tareas
export const assignmentService = {
  // Obtener tareas de un curso
  async getCourseAssignments(courseId: number): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)
      .order('due_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Obtener tareas con entregas
  async getAssignmentsWithSubmissions(courseId: number): Promise<AssignmentWithSubmissions[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        assignment_submissions (
          id,
          student_id,
          submitted_at,
          url,
          text,
          grade,
          feedback
        )
      `)
      .eq('course_id', courseId)
      .order('due_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(assignment => ({
      ...assignment,
      submissions: assignment.assignment_submissions || [],
      submission_count: assignment.assignment_submissions?.length || 0,
      graded_count: assignment.assignment_submissions?.filter(s => s.grade !== null).length || 0
    }));
  },

  // Crear nueva tarea
  async createAssignment(assignment: Omit<Assignment, 'id' | 'created_at'>): Promise<Assignment> {
    console.log('🔵 assignmentService.createAssignment - Datos recibidos:', assignment);
    
    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert([assignment])
        .select()
        .single();

      console.log('🔵 assignmentService.createAssignment - Respuesta de Supabase:', { data, error });

      if (error) {
        console.error('🔴 assignmentService.createAssignment - Error:', error);
        throw error;
      }

      if (!data) {
        console.error('🔴 assignmentService.createAssignment - No data returned');
        throw new Error('No se recibió datos de la base de datos');
      }

      console.log('✅ assignmentService.createAssignment - Tarea creada exitosamente:', data);
      return data;
    } catch (err: any) {
      console.error('🔴 assignmentService.createAssignment - Excepción capturada:', err);
      throw err;
    }
  },

  // Actualizar tarea
  async updateAssignment(id: string, updates: Partial<Assignment>): Promise<Assignment> {
    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar tarea
  async deleteAssignment(id: string): Promise<void> {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Obtener tarea por ID
  async getAssignment(id: string): Promise<Assignment | null> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Obtener tareas de todos los cursos de un estudiante (basado en sus inscripciones)
  async getStudentAssignments(studentId: string, courseId?: number): Promise<Assignment[]> {
    console.log('🔵 getStudentAssignments - Iniciando', { studentId, courseId });
    
    let query = supabase
      .from('assignments')
      .select('*');

    if (courseId) {
      // Si se especifica un curso, solo obtener assignments de ese curso
      console.log('🔵 getStudentAssignments - Filtrando por curso específico:', courseId);
      query = query.eq('course_id', courseId);
    } else {
      // Obtener assignments de todos los cursos en los que el estudiante está inscrito
      console.log('🔵 getStudentAssignments - Buscando inscripciones del estudiante:', studentId);
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('status', 'active');

      console.log('🔵 getStudentAssignments - Resultado de inscripciones:', { enrollments, enrollmentsError });

      if (enrollmentsError) {
        console.error('🔴 getStudentAssignments - Error al obtener inscripciones:', enrollmentsError);
        throw enrollmentsError;
      }
      
      if (!enrollments || enrollments.length === 0) {
        console.warn('⚠️ getStudentAssignments - El estudiante no tiene inscripciones activas');
        return [];
      }

      const courseIds = enrollments.map(e => e.course_id);
      console.log('🔵 getStudentAssignments - IDs de cursos inscritos:', courseIds);
      query = query.in('course_id', courseIds);
    }

    console.log('🔵 getStudentAssignments - Ejecutando consulta de assignments...');
    const { data, error } = await query.order('due_at', { ascending: true });

    console.log('🔵 getStudentAssignments - Resultado de assignments:', { 
      count: data?.length || 0, 
      error,
      assignments: data?.map(a => ({ id: a.id, title: a.title, course_id: a.course_id }))
    });

    if (error) {
      console.error('🔴 getStudentAssignments - Error al obtener assignments:', error);
      throw error;
    }
    
    return data || [];
  }
};

// Servicios de Entregas
export const submissionService = {
  // Obtener entregas de una tarea
  async getAssignmentSubmissions(assignmentId: string): Promise<AssignmentSubmission[]> {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select(`
        *,
        users!assignment_submissions_student_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener entrega por estudiante y tarea
  async getStudentSubmission(assignmentId: string, studentId: string): Promise<AssignmentSubmission | null> {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Crear nueva entrega
  async createSubmission(submission: Omit<AssignmentSubmission, 'id' | 'submitted_at'>): Promise<AssignmentSubmission> {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .insert([{
        ...submission,
        submitted_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar entrega
  async updateSubmission(id: string, updates: Partial<AssignmentSubmission>): Promise<AssignmentSubmission> {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Calificar entrega
  async gradeSubmission(id: string, grade: number, feedback?: string): Promise<AssignmentSubmission> {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({ grade, feedback })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar entrega
  async deleteSubmission(id: string): Promise<void> {
    const { error } = await supabase
      .from('assignment_submissions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Servicios de Estadísticas
export const assignmentStatsService = {
  // Obtener estadísticas de un curso
  async getCourseStats(courseId: number): Promise<{
    total_assignments: number;
    total_submissions: number;
    average_grade: number;
    pending_grades: number;
  }> {
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id')
      .eq('course_id', courseId);

    if (assignmentsError) throw assignmentsError;

    const assignmentIds = assignments?.map(a => a.id) || [];

    if (assignmentIds.length === 0) {
      return {
        total_assignments: 0,
        total_submissions: 0,
        average_grade: 0,
        pending_grades: 0
      };
    }

    const { data: submissions, error: submissionsError } = await supabase
      .from('assignment_submissions')
      .select('grade')
      .in('assignment_id', assignmentIds);

    if (submissionsError) throw submissionsError;

    const grades = submissions?.map(s => s.grade).filter(g => g !== null) || [];
    const averageGrade = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
    const pendingGrades = submissions?.filter(s => s.grade === null).length || 0;

    return {
      total_assignments: assignmentIds.length,
      total_submissions: submissions?.length || 0,
      average_grade: Math.round(averageGrade * 100) / 100,
      pending_grades: pendingGrades
    };
  }
};
