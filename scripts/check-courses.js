import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.-5HFEuphwYhfa8HBW3FddQfu5b-JOCb6FLElKFwezBg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('--- Buscando Chunks de Metodos Anticonceptivos ---');
  const { data: chunks, error } = await supabase
    .from('course_content_chunks')
    .select('id, content, course_id, unit_id, session_id')
    .ilike('content', '%Métodos anticonceptivos%')
    .limit(3);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!chunks || chunks.length === 0) {
    console.log('⚠️ No se encontraron chunks con ESE texto exacto via SELECT.');
  } else {
    chunks.forEach(c => {
      console.log(`ID: ${c.id} | Course ID: ${c.course_id} | Unit: ${c.unit_id} | Session: ${c.session_id}`);
      console.log(`Content: ${c.content.substring(0, 50)}...`);
      console.log('---');
    });
  }

  console.log('\n--- Probando RPC search_course_content_chunks_text_clean ---');
  // Usaremos el Course ID del primer chunk encontrado, o 12 por defecto
  const testCourseId = chunks?.[0]?.course_id || 12;
  const { data: rpcData, error: rpcError } = await supabase.rpc('search_course_content_chunks_text_clean', {
    search_query: "anticonceptivos",
    course_id_param: testCourseId,
    p_module_id: null
  });

  if (rpcError) {
    console.log('❌ RPC Falló:', rpcError.message);
  } else {
    console.log(`✅ RPC retornó ${rpcData?.length || 0} resultados.`);
  }
}

check();
