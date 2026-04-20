import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkFinal() {
  console.log('--- Buscando REFERENCIAS PRECISAS de Afasia ---');
  // Buscamos harrison
  const { data: harrison } = await supabase.from('course_content_chunks').select('content, metadata').eq('course_id', 12).ilike('content', '%Afasia%').ilike('metadata->>sourceFileName', '%Harrison%').limit(3);
  // Buscamos nelson
  const { data: nelson } = await supabase.from('course_content_chunks').select('content, metadata').eq('course_id', 12).ilike('content', '%Afasia%').ilike('metadata->>sourceFileName', '%Nelson%').limit(3);

  console.log('RESULTADOS HARRISON:');
  harrison?.forEach(h => console.log(`- Pag ${h.metadata?.pageStart}: ${h.content.substring(0, 100)}...`));
  
  console.log('\nRESULTADOS NELSON:');
  nelson?.forEach(n => console.log(`- Pag ${n.metadata?.pageStart}: ${n.content.substring(0, 100)}...`));
}

checkFinal();
