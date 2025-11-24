import { supabase } from '../lib/supabase';

export interface AdminCourseOverview {
  course_id: number;
  course_title: string | null;
  course_code: string | null;
  course_description: string | null;
  teacher_id: string | null;
  student_count: number;
  module_count: number;
}

export interface CourseModuleRow {
  id: number;
  course_id: number;
  name: string;
  order: number | null;
  is_active: boolean;
}

export async function getAdminCourseOverview() {
  const { data, error } = await supabase
    .from('vw_admin_course_overview')
    .select('*')
    .order('course_id', { ascending: true });
  if (error) throw error;
  return (data || []) as AdminCourseOverview[];
}

export async function getModulesByCourse(courseId: number) {
  const { data, error } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []) as CourseModuleRow[];
}

export async function getCoursesByTeacher(teacherId: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getEnrollmentsByStudent(userId: string) {
  // Usar course_enrollments en lugar de enrollments (tabla correcta)
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('course_id, status, enrollment_date, completion_percentage')
    .eq('student_id', userId);
  if (error) throw error;
  return data || [];
}


