import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('--- Unidades del Curso 12 ---');
  const { data: units } = await supabase.from('course_units').select('id, number, title').eq('course_id', 12);
  console.log(units);

  if (units && units.length > 0) {
    const u1 = units.find(u => u.number === 1 || u.title.includes('Medicina Interna'));
    if (u1) {
      console.log(`\n--- Probando Búsqueda para Unidad 1 (ID: ${u1.id}) ---`);
      const { data: results, error } = await supabase.rpc('search_course_content_chunks_text_clean', {
        search_query: "anticonceptivos",
        course_id_param: 12,
        p_module_id: u1.id
      });
      
      if (error) console.log('RPC Falló:', error.message);
      else console.log(`Resultados encontrados: ${results.length}`);
      
      if (results && results.length > 0) {
        console.log('Muestra:', results.map(r => r.content.substring(0, 50)));
      }
    }
  }
}

check();
