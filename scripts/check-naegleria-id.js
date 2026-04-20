import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('--- Buscando Naegleria en curso 1, 12 o 21 ---');
  const { data: n1 } = await supabase.from('course_content_chunks').select('id, course_id').eq('course_id', 1).ilike('content', '%Naegleria%').limit(1);
  const { data: n12 } = await supabase.from('course_content_chunks').select('id, course_id').eq('course_id', 12).ilike('content', '%Naegleria%').limit(1);
  const { data: n21 } = await supabase.from('course_content_chunks').select('id, course_id').eq('course_id', 21).ilike('content', '%Naegleria%').limit(1);

  console.log(`Naegleria en Curso 1: ${n1 && n1.length > 0 ? 'SÍ' : 'NO'}`);
  console.log(`Naegleria en Curso 12: ${n12 && n12.length > 0 ? 'SÍ' : 'NO'}`);
  console.log(`Naegleria en Curso 21: ${n21 && n21.length > 0 ? 'SÍ' : 'NO'}`);
}

check();
