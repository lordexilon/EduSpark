import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkPages() {
  console.log('--- Buscando Páginas para Afasia ---');
  const { data: chunks } = await supabase
    .from('course_content_chunks')
    .select('content, metadata')
    .eq('course_id', 12)
    .ilike('content', '%Afasia%')
    .limit(5);

  chunks?.forEach((c, i) => {
    console.log(`Chunk #${i+1}`);
    console.log(`Página: ${c.metadata?.pageStart}`);
    console.log(`Fuente: ${c.metadata?.sourceFileName}`);
    console.log(`Inicio: ${c.content.substring(0, 50)}...`);
    console.log('---');
  });
}

checkPages();
