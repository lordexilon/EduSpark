import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDocs() {
  console.log('--- Buscando Documentos (Fuentes) ---');
  const { data: docs } = await supabase.from('documents').select('*').limit(5);
  console.log(docs);
}

checkDocs();
