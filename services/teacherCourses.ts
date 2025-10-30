// services/teacherCourses.ts
// Servicios para gestión de cursos del docente

import { supabase } from '../lib/supabase';

export interface Course {
  id: number;
  title: string;
  code?: string;
  description?: string;
  teacher_id: string;
  status: 'active' | 'archived' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface CourseUnit {
  id: string;
  course_id: number;
  number: number;
  title: string;
  description?: string;
  created_at: string;
}

export interface Session {
  id: string;
  course_id: number;
  unit_id?: string;
  title: string;
  starts_at?: string;
  ends_at?: string;
  description?: string;
  created_at: string;
}

export interface Material {
  id: string;
  course_id: number;
  unit_id?: string;
  session_id?: string;
  title: string;
  kind: 'markdown' | 'pdf' | 'link' | 'video' | 'other';
  url?: string;
  mime_type?: string;
  size_bytes?: number;
  metadata: Record<string, any>;
  created_at: string;
}

// Servicios de Cursos
export const courseService = {
  // Obtener todos los cursos del docente
  async getMyCourses(teacherId: string): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Crear nuevo curso
  async createCourse(course: Omit<Course, 'id' | 'created_at' | 'updated_at'>): Promise<Course> {
    const { data, error } = await supabase
      .from('courses')
      .insert([course])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar curso
  async updateCourse(id: number, updates: Partial<Course>): Promise<Course> {
    const { data, error } = await supabase
      .from('courses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar curso
  async deleteCourse(id: number): Promise<void> {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Obtener curso por ID
  async getCourse(id: number): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
};

// Servicios de Unidades
export const unitService = {
  // Obtener unidades de un curso
  async getCourseUnits(courseId: number): Promise<CourseUnit[]> {
    const { data, error } = await supabase
      .from('course_units')
      .select('*')
      .eq('course_id', courseId)
      .order('number', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Crear nueva unidad
  async createUnit(unit: Omit<CourseUnit, 'id' | 'created_at'>): Promise<CourseUnit> {
    const { data, error } = await supabase
      .from('course_units')
      .insert([unit])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar unidad
  async updateUnit(id: string, updates: Partial<CourseUnit>): Promise<CourseUnit> {
    const { data, error } = await supabase
      .from('course_units')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar unidad
  async deleteUnit(id: string): Promise<void> {
    const { error } = await supabase
      .from('course_units')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Servicios de Sesiones
export const sessionService = {
  // Obtener sesiones de un curso
  async getCourseSessions(courseId: number): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('course_id', courseId)
      .order('starts_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Crear nueva sesión
  async createSession(session: Omit<Session, 'id' | 'created_at'>): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .insert([session])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar sesión
  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar sesión
  async deleteSession(id: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Servicios de Materiales
export const materialService = {
  // Obtener materiales de un curso
  async getCourseMaterials(courseId: number): Promise<Material[]> {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener materiales de una unidad
  async getUnitMaterials(unitId: string): Promise<Material[]> {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Crear nuevo material
  async createMaterial(material: Omit<Material, 'id' | 'created_at'>): Promise<Material> {
    const { data, error } = await supabase
      .from('materials')
      .insert([material])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar material
  async updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
    const { data, error } = await supabase
      .from('materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar material
  async deleteMaterial(id: string): Promise<void> {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
