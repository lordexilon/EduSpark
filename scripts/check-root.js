import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
// USANDO SERVICE_ROLE_KEY PARA BYPASS RLS
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('--- Buscando Datos Maestros (Service Role) ---');
  const { data: courses } = await supabase.from('courses').select('id, title');
  console.log('Cursos encontrados:', courses);
  
  if (courses && courses.length > 0) {
    // Si encontramos el curso, buscaremos sus unidades
    const courseId = courses[0].id;
    const { data: units } = await supabase.from('course_units').select('id, title').eq('course_id', courseId).limit(5);
    console.log(`Unidades del Curso ${courseId}:`, units);
  }
}

check();
