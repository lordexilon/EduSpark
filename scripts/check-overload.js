import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDuplicates() {
  console.log('--- Buscando Duplicados de search_course_content_chunks ---');
  // Consultamos el catálogo de Postgres para ver las sobrecargas
  const { data, error } = await supabase.rpc('check_functions_overload', { function_name: 'search_course_content_chunks' });
  
  if (error) {
     console.log('No pudimos extraer vía RPC, usaremos SELECT en pg_proc...');
     const { data: procs } = await supabase.from('pg_proc').select('proname, proargtypes').ilike('proname', 'search_course%');
     console.log('Procedimientos encontrados (bruto):', procs?.length || 0);
     procs?.forEach(p => console.log(`Nombre: ${p.proname}`));
  }
}

checkDuplicates();
