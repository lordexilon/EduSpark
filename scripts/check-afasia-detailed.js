import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDetailed() {
  console.log('--- Buscando Fuentes Detalladas para Afasia ---');
  const { data: chunks } = await supabase
    .from('course_content_chunks')
    .select('content, metadata')
    .eq('course_id', 12)
    .ilike('content', '%Afasia%')
    .order('id', { ascending: true })
    .limit(10);

  chunks?.forEach((c, i) => {
    const meta = c.metadata || {};
    console.log(`[Result #${i+1}]`);
    console.log(`Archivo: ${meta.sourceFileName || 'N/A'}`);
    console.log(`Página: ${meta.pageStart || 'N/A'}`);
    console.log(`Texto: ${c.content.substring(0, 80).replace(/\n/g, ' ')}...`);
    console.log('---');
  });
}

checkDetailed();
