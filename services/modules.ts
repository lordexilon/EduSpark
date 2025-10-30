import { supabase } from '../lib/supabase';

export interface CourseModuleInput {
  course_id: number;
  name: string;
  order?: number;
  is_active?: boolean;
}

export async function listModulesByCourse(courseId: number) {
  const { data, error } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createModule(input: CourseModuleInput) {
  const { data, error } = await supabase
    .from('course_modules')
    .insert({
      course_id: input.course_id,
      name: input.name,
      order: input.order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateModule(id: number, patch: Partial<CourseModuleInput>) {
  const { data, error } = await supabase
    .from('course_modules')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteModule(id: number) {
  const { error } = await supabase
    .from('course_modules')
    .delete()
    .eq('id', id);
  if (error) throw error;
}


