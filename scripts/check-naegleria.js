import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.-5HFEuphwYhfa8HBW3FddQfu5b-JOCb6FLElKFwezBg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('--- Diagnóstico: Afasia y Trastornos Cognitivos ---');
  const courseId = 12;
  const query = "Afasia, pérdida de la memoria y otros trastornos cognitivos";
  
  // Simulamos que el estudiante está en una Sesión/Unidad (UUID ficticio pero válido)
  const moduleId = 'e8b50b29-eba2-4d05-a037-cb0b74257267'; 

  console.log(`Buscando con query: "${query}"`);
  console.log(`Filtro p_module_id: ${moduleId}`);

  const { data, error } = await supabase.rpc('search_course_content_chunks', {
    course_id_param: courseId,
    query_embedding: "[]", // El RPC fallará si no le damos un vector, o si no está actualizado para recibir texto
    match_threshold: 0.1,
    match_count: 5,
    p_module_id: moduleId
  });

  if (error) {
    console.log('❌ Error al llamar al RPC:', error.message);
    console.log('Esto confirma que el RPC en Supabase NO HA SIDO ACTUALIZADO o tiene parámetros incompatibles.');
    return;
  }

  const harrisonChunks = data?.filter(d => d.content.includes('Afasia') || d.metadata?.sourceFileName?.includes('Harrison'));
  
  if (!harrisonChunks || harrisonChunks.length === 0) {
    console.log('⚠️ El RPC NO DEVOLVIÓ NINGÚN CHUNK del Harrison al usar un p_module_id.');
    console.log('Causa probable: El filtro (unit_id IS NULL AND session_id IS NULL) no ha sido aplicado en Supabase.');
  } else {
    console.log(`✅ EXITO: Se encontraron ${harrisonChunks.length} chunks del Harrison.`);
  }
}

check();
