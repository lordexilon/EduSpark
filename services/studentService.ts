// services/studentService.ts
// Servicios para gestión de estudiantes

import { supabase } from '../lib/supabase';
import { careerEnrollmentService, courseEnrollmentService } from './academicService';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface Student {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: number;
  is_active: boolean;
  created_at: string;
}

export interface StudentWithEnrollments extends Student {
  career_enrollments?: any[];
  course_enrollments?: any[];
}

// ============================================
// SERVICIOS DE ESTUDIANTES
// ============================================

export const studentService = {
  // Obtener todos los estudiantes
  async getAllStudents(): Promise<Student[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role_id', 1) // role_id 1 = student (Mapeo: 1=student, 2=teacher, 3=admin, 4=coordinator)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Obtener estudiante por ID con sus inscripciones
  async getStudentWithEnrollments(studentId: string): Promise<StudentWithEnrollments | null> {
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('*')
      .eq('id', studentId)
      .eq('role_id', 1) // role_id 1 = student (Mapeo: 1=student, 2=teacher, 3=admin, 4=coordinator)
      .single();

    if (studentError) {
      if (studentError.code === 'PGRST116') return null;
      throw studentError;
    }

    if (!student) return null;

    // Obtener inscripciones en carreras
    const careerEnrollments = await careerEnrollmentService.getStudentEnrollments(studentId).catch(() => []);

    // Obtener inscripciones en cursos
    const courseEnrollments = await courseEnrollmentService.getStudentEnrollments(studentId).catch(() => []);

    return {
      ...student,
      career_enrollments: careerEnrollments,
      course_enrollments: courseEnrollments
    };
  },

  // Buscar estudiantes por nombre o email
  async searchStudents(query: string): Promise<Student[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role_id', 1) // role_id 1 = student (Mapeo: 1=student, 2=teacher, 3=admin, 4=coordinator)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('last_name', { ascending: true })
      .limit(50);

    if (error) throw error;
    return data || [];
  },

  // Activar/Desactivar estudiante
  async updateStudentStatus(studentId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ is_active: isActive })
      .eq('id', studentId)
      .eq('role_id', 1); // role_id 1 = student (Mapeo: 1=student, 2=teacher, 3=admin, 4=coordinator)

    if (error) throw error;
  }
};

