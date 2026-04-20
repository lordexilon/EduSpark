import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('--- Buscando Contenido Médico en el curso de MATEMÁTICA (ID 1) ---');
  const { data: chunks } = await supabase
    .from('course_content_chunks')
    .select('id, content')
    .eq('course_id', 1)
    .ilike('content', '%médico%')
    .limit(5);

  if (chunks && chunks.length > 0) {
    console.log(`⚠️ ENCONTRADOS ${chunks.length} (muestra) chunks MÉDICOS en el curso 1.`);
    chunks.forEach(c => console.log(`- ${c.content.substring(0, 100)}...`));
  } else {
    console.log('No se encontró contenido médico en el curso 1.');
  }
}

check();
