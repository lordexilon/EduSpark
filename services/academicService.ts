// services/academicService.ts
// Servicios para gestión académica (Fase 1): carreras, materias, matriculación, asignaciones

import { supabase } from '../lib/supabase';

// Verificar autenticación antes de consultar
const verifyAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Usuario no autenticado');
  }
  console.log('🔐 Usuario autenticado - auth.uid():', session.user.id);
  return session.user.id;
};

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface Career {
  id: number;
  name: string;
  code: string;
  description?: string;
  coordinator_id?: string;
  duration_months: number;
  total_credits: number;
  degree_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: number;
  career_id?: number;
  name: string;
  code: string;
  description?: string;
  credits: number;
  hours_per_week: number;
  semester?: number;
  prerequisite_subject_id?: number;
  is_core: boolean;
  difficulty_level: string;
  created_at: string;
  updated_at: string;
}

export interface CareerEnrollment {
  id: string;
  student_id: string;
  career_id: number;
  enrollment_date: string;
  status: string;
  graduation_date?: string;
  current_semester: number;
  total_credits_earned: number;
  gpa?: number;
  academic_status: string;
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollment {
  id: string;
  student_id: string;
  course_id: number;
  enrollment_date: string;
  status: string;
  final_grade?: number;
  letter_grade?: string;
  attendance_percentage: number;
  participation_score: number;
  completion_percentage: number;
  time_spent_minutes: number;
  last_access_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SubjectAssignment {
  id: number;
  subject_id: number;
  teacher_id: string;
  academic_period: string;
  start_date: string;
  end_date: string;
  status: string;
  assigned_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// SERVICIOS DE CARRERAS
// ============================================

export const careerService = {
  // Obtener todas las carreras activas
  async getAllCareers(): Promise<Career[]> {
    const { data, error } = await supabase
      .from('careers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Obtener carreras activas
  async getActiveCareers(): Promise<Career[]> {
    const { data, error } = await supabase
      .from('careers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Obtener carrera por ID
  async getCareer(id: number): Promise<Career | null> {
    const { data, error } = await supabase
      .from('careers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Crear nueva carrera
  async createCareer(career: Omit<Career, 'id' | 'created_at' | 'updated_at'>): Promise<Career> {
    const { data, error } = await supabase
      .from('careers')
      .insert([career])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar carrera
  async updateCareer(id: number, updates: Partial<Career>): Promise<Career> {
    const { data, error } = await supabase
      .from('careers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar carrera (soft delete cambiando is_active)
  async deleteCareer(id: number): Promise<void> {
    const { error } = await supabase
      .from('careers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
};

// ============================================
// SERVICIOS DE MATERIAS
// ============================================

export const subjectService = {
  // Obtener todas las materias
  async getAllSubjects(): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('career_id', { ascending: true })
      .order('semester', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Obtener materias de una carrera
  async getSubjectsByCareer(careerId: number): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('career_id', careerId)
      .order('semester', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Obtener materia por ID
  async getSubject(id: number): Promise<Subject | null> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Crear nueva materia
  async createSubject(subject: Omit<Subject, 'id' | 'created_at' | 'updated_at'>): Promise<Subject> {
    const { data, error } = await supabase
      .from('subjects')
      .insert([subject])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar materia
  async updateSubject(id: number, updates: Partial<Subject>): Promise<Subject> {
    const { data, error } = await supabase
      .from('subjects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar materia
  async deleteSubject(id: number): Promise<void> {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// ============================================
// SERVICIOS DE MATRICULACIÓN EN CARRERAS
// ============================================

export const careerEnrollmentService = {
  // Obtener matriculaciones de un estudiante
  async getStudentEnrollments(studentId: string): Promise<CareerEnrollment[]> {
    console.log('🔍 careerEnrollmentService.getStudentEnrollments - Buscando inscripciones para studentId:', studentId);
    
    // Verificar autenticación y obtener auth.uid()
    const authUid = await verifyAuth();
    console.log('🔍 Comparando IDs - studentId recibido:', studentId, 'vs auth.uid():', authUid);
    
    if (studentId !== authUid) {
      console.warn('⚠️ ADVERTENCIA: studentId no coincide con auth.uid(). Usando auth.uid() para RLS.');
      console.warn('   Esto podría causar que las políticas RLS no funcionen correctamente.');
    }
    
    const { data, error } = await supabase
      .from('career_enrollments')
      .select('*')
      .eq('student_id', studentId)
      .order('enrollment_date', { ascending: false });

    if (error) {
      console.error('❌ Error al obtener inscripciones en carreras:', error);
      console.error('   - Código:', error.code);
      console.error('   - Mensaje:', error.message);
      console.error('   - Detalles:', error.details);
      console.error('   - Hint:', error.hint);
      throw error;
    }
    
    console.log('✅ Inscripciones en carreras encontradas:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('   Inscripciones:', data.map(e => ({ id: e.id, career_id: e.career_id, status: e.status })));
    }
    
    return data || [];
  },

  // Obtener estudiantes de una carrera
  async getCareerStudents(careerId: number): Promise<CareerEnrollment[]> {
    const { data, error } = await supabase
      .from('career_enrollments')
      .select('*')
      .eq('career_id', careerId)
      .order('enrollment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Matricular estudiante en carrera
  async enrollStudent(enrollment: Omit<CareerEnrollment, 'id' | 'created_at' | 'updated_at'>): Promise<CareerEnrollment> {
    const { data, error } = await supabase
      .from('career_enrollments')
      .insert([enrollment])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar matriculación
  async updateEnrollment(id: string, updates: Partial<CareerEnrollment>): Promise<CareerEnrollment> {
    const { data, error } = await supabase
      .from('career_enrollments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Dar de baja estudiante (cambiar status)
  async unenrollStudent(id: string): Promise<void> {
    const { error } = await supabase
      .from('career_enrollments')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  // Suspender estudiante (cambiar status a suspended)
  async suspendStudent(id: string): Promise<void> {
    const { error } = await supabase
      .from('career_enrollments')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  // Eliminar completamente la inscripción
  async deleteEnrollment(id: string): Promise<void> {
    const { error } = await supabase
      .from('career_enrollments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// ============================================
// SERVICIOS DE INSCRIPCIÓN EN CURSOS
// ============================================

export const courseEnrollmentService = {
  // Obtener inscripciones de un estudiante
  async getStudentEnrollments(studentId: string): Promise<CourseEnrollment[]> {
    console.log('🔍 courseEnrollmentService.getStudentEnrollments - Buscando inscripciones para studentId:', studentId);
    
    // Verificar autenticación y obtener auth.uid()
    const authUid = await verifyAuth();
    console.log('🔍 Comparando IDs - studentId recibido:', studentId, 'vs auth.uid():', authUid);
    
    if (studentId !== authUid) {
      console.warn('⚠️ ADVERTENCIA: studentId no coincide con auth.uid(). Usando auth.uid() para RLS.');
      console.warn('   Esto podría causar que las políticas RLS no funcionen correctamente.');
    }
    
    const { data, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('student_id', studentId)
      .order('enrollment_date', { ascending: false });

    if (error) {
      console.error('❌ Error al obtener inscripciones en cursos:', error);
      console.error('   - Código:', error.code);
      console.error('   - Mensaje:', error.message);
      console.error('   - Detalles:', error.details);
      console.error('   - Hint:', error.hint);
      throw error;
    }
    
    console.log('✅ Inscripciones encontradas:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('   Inscripciones:', data.map(e => ({ id: e.id, course_id: e.course_id, status: e.status })));
    }
    
    return data || [];
  },

  // Obtener estudiantes de un curso
  async getCourseStudents(courseId: number): Promise<CourseEnrollment[]> {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('course_id', courseId)
      .order('enrollment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Inscribir estudiante en curso
  async enrollStudent(enrollment: Omit<CourseEnrollment, 'id' | 'created_at' | 'updated_at'>): Promise<CourseEnrollment> {
    const { data, error } = await supabase
      .from('course_enrollments')
      .insert([enrollment])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar inscripción
  async updateEnrollment(id: string, updates: Partial<CourseEnrollment>): Promise<CourseEnrollment> {
    const { data, error } = await supabase
      .from('course_enrollments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Dar de baja estudiante (cambiar status)
  async unenrollStudent(id: string): Promise<void> {
    const { error } = await supabase
      .from('course_enrollments')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  // Suspender estudiante (cambiar status a suspended)
  async suspendStudent(id: string): Promise<void> {
    const { error } = await supabase
      .from('course_enrollments')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  // Eliminar completamente la inscripción
  async deleteEnrollment(id: string): Promise<void> {
    const { error } = await supabase
      .from('course_enrollments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// ============================================
// SERVICIOS DE RESETEO DE PROGRESO
// ============================================

export interface ResetProgressResult {
  success: boolean;
  student_id?: string;
  course_id?: number;
  deleted?: {
    unit_progress: number;
    session_progress: number;
    flashcard_progress: number;
    assessment_attempts: number;
    assignment_submissions: number;
  };
  updated_enrollments?: number;
  message?: string;
  error?: string;
}

export interface ResetMultipleProgressResult {
  success: boolean;
  course_id: number;
  total_students: number;
  successful_resets: number;
  failed_resets: number;
  results: Array<{
    student_id: string;
    result: ResetProgressResult;
  }>;
}

export const studentProgressResetService = {
  /**
   * Resetea el progreso de un estudiante en un curso específico
   * Elimina: unit_progress, session_progress, flashcard_progress, assessment_attempts, assignment_submissions
   * Resetea: course_enrollments (completion_percentage, time_spent_minutes, etc.)
   */
  async resetStudentCourseProgress(
    studentId: string,
    courseId: number
  ): Promise<ResetProgressResult> {
    try {
      const { data, error } = await supabase.rpc('reset_student_course_progress', {
        p_student_id: studentId,
        p_course_id: courseId,
      });

      if (error) throw error;

      return data as ResetProgressResult;
    } catch (error: any) {
      console.error('Error al resetear progreso del estudiante:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido al resetear el progreso',
        message: 'No se pudo resetear el progreso del estudiante',
      };
    }
  },

  /**
   * Resetea el progreso de múltiples estudiantes en un curso
   */
  async resetMultipleStudentsProgress(
    studentIds: string[],
    courseId: number
  ): Promise<ResetMultipleProgressResult> {
    try {
      const { data, error } = await supabase.rpc('reset_multiple_students_course_progress', {
        p_student_ids: studentIds,
        p_course_id: courseId,
      });

      if (error) throw error;

      return data as ResetMultipleProgressResult;
    } catch (error: any) {
      console.error('Error al resetear progreso de múltiples estudiantes:', error);
      throw error;
    }
  },

  /**
   * Resetea el progreso de todos los estudiantes activos en un curso
   * Útil para reiniciar un curso completo
   */
  async resetAllStudentsProgress(courseId: number): Promise<ResetMultipleProgressResult> {
    try {
      const { data, error } = await supabase.rpc('reset_all_students_course_progress', {
        p_course_id: courseId,
      });

      if (error) throw error;

      return data as ResetMultipleProgressResult;
    } catch (error: any) {
      console.error('Error al resetear progreso de todos los estudiantes:', error);
      throw error;
    }
  },
};

// ============================================
// SERVICIOS DE ASIGNACIÓN DOCENTE-MATERIA
// ============================================

export const subjectAssignmentService = {
  // Obtener asignaciones de un docente
  async getTeacherAssignments(teacherId: string): Promise<SubjectAssignment[]> {
    const { data, error } = await supabase
      .from('subject_assignments')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('academic_period', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener asignaciones de una materia
  async getSubjectAssignments(subjectId: number): Promise<SubjectAssignment[]> {
    const { data, error } = await supabase
      .from('subject_assignments')
      .select('*')
      .eq('subject_id', subjectId)
      .order('academic_period', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Crear asignación
  async createAssignment(assignment: Omit<SubjectAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<SubjectAssignment> {
    const { data, error } = await supabase
      .from('subject_assignments')
      .insert([assignment])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar asignación
  async updateAssignment(id: number, updates: Partial<SubjectAssignment>): Promise<SubjectAssignment> {
    const { data, error } = await supabase
      .from('subject_assignments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar asignación
  async deleteAssignment(id: number): Promise<void> {
    const { error } = await supabase
      .from('subject_assignments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

