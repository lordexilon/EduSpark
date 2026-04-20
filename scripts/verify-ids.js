import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.-5HFEuphwYhfa8HBW3FddQfu5b-JOCb6FLElKFwezBg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('--- Listando TODOS los Cursos ---');
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!courses || courses.length === 0) {
    console.log('⚠️ No hay NINGÚN curso en la tabla "courses".');
    
    // Verificamos si hay chunks sin curso o con otro curso
    const { data: chunkCount } = await supabase
      .from('course_content_chunks')
      .select('course_id', { count: 'exact', head: true });
    console.log(`Chunks totales en la tabla: ${chunkCount === null ? 0 : chunkCount.length}`);
    
    // Veamos los IDs de curso únicos en los chunks
    const { data: uniqueCourses } = await supabase
      .from('course_content_chunks')
      .select('course_id')
      .limit(100);
    const ids = [...new Set(uniqueCourses?.map(c => c.course_id))];
    console.log('IDs de curso encontrados en los chunks:', ids);
  } else {
    courses.forEach(c => {
      console.log(`ID: ${c.id} | Título: ${c.title}`);
    });
  }
}

check();
