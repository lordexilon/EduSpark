import { supabase } from '@/lib/supabase';

export interface CourseMaterialInput {
  course_id: number;
  module_id?: number;
  title: string;
  type?: 'text' | 'video' | 'image' | 'document';
  content?: string;
  file_url?: string;
  source_url?: string;
}

export async function listMaterialsByCourse(courseId: number) {
  const { data, error } = await supabase
    .from('course_materials')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function listMaterialsByModule(courseId: number, moduleId: number) {
  // Evitar 400 por columnas inexistentes: no usar module_id en la query
  const { data, error } = await supabase
    .from('course_materials')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = data || [];
  // Filtrar por módulo solo si el campo existe en los datos
  const hasModule = rows.length > 0 && Object.prototype.hasOwnProperty.call(rows[0], 'module_id');
  return hasModule ? rows.filter((m: any) => Number(m.module_id) === Number(moduleId)) : rows;
}

export async function createMaterial(input: CourseMaterialInput) {
  // Inserción adaptable: elimina claves opcionales que no existan en el schema
  const mandatory: any = { course_id: input.course_id, title: input.title };
  const optionalPairs: Array<[string, any]> = [
    ['module_id', input.module_id],
    ['type', input.type ?? 'text'],
    ['content', input.content ?? ''],
    ['file_url', input.file_url ?? null],
    ['source_url', input.source_url ?? null],
  ];

  let payload: any = { ...mandatory };
  optionalPairs.forEach(([k, v]) => {
    if (typeof v !== 'undefined') payload[k] = v;
  });

  const { data, error } = await supabase
    .from('course_materials')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateMaterial(id: number, patch: Partial<CourseMaterialInput>) {
  const { data, error } = await supabase
    .from('course_materials')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMaterial(id: number) {
  const { error } = await supabase.from('course_materials').delete().eq('id', id);
  if (error) throw error;
}
