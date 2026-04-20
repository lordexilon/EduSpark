import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkKeys() {
  console.log('--- Buscando Llaves de Metadatos ---');
  const { data: chunks } = await supabase
    .from('course_content_chunks')
    .select('id, metadata')
    .eq('course_id', 12)
    .ilike('content', '%Afasia%')
    .limit(1);

  if (chunks && chunks.length > 0) {
    const meta = chunks[0].metadata;
    console.log('Metadatos de Afasia (Chunk ID:', chunks[0].id, ')');
    console.log('LLAVES ENCONTRADAS:', Object.keys(meta || {}));
    console.log('VALORES:', JSON.stringify(meta, null, 2));
  } else {
    console.log('No se encontraron chunks de Afasia.');
  }
}

checkKeys();
