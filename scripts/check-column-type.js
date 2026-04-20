import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkType() {
  console.log('--- Verificando Tipo de Columna metadata ---');
  const { data: info } = await supabase.rpc('get_column_type', { table_name: 'course_content_chunks', column_name: 'metadata' });
  console.log('Tipo de Columna:', info);
  
  // Si falla el RPC, hacemos un query crudo
  const { data: raw } = await supabase.from('course_content_chunks').select('metadata').limit(1);
  console.log('¿Es Object?:', typeof raw[0]?.metadata);
  console.log('Metadata Cruda (primeros 100 char):', String(raw[0]?.metadata).substring(0, 100));
}

// Nota: No tenemos el RPC get_column_type, así que usamos el raw query
checkType();
