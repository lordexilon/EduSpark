import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('--- Auditoría de Embeddings en DB ---');
  
  const { count: total } = await supabase.from('course_content_chunks').select('*', { count: 'exact', head: true });
  const { count: nullEmbeds } = await supabase.from('course_content_chunks').select('*', { count: 'exact', head: true }).is('embedding', null);
  
  console.log(`Total Chunks: ${total}`);
  console.log(`Chunks con Embedding NULL: ${nullEmbeds}`);
  
  if (total > 0 && total === nullEmbeds) {
     console.log('❌ ERROR CRÍTICO: Todos los embeddings en la base de datos están vacíos.');
  } else {
     console.log('✅ Hay algunos embeddings cargados.');
  }

  // Verificamos de nuevo Naegleria
  const { data: naegleria } = await supabase.from('course_content_chunks').select('id, embedding').ilike('content', '%Naegleria%').limit(1);
  if (naegleria && naegleria[0]) {
     console.log(`Naegleria embedding is null: ${naegleria[0].embedding === null}`);
  }
}

check();
