import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('--- Verificando Dimensiones de Chunks en DB ---');
  // Usaremos un fragmento de SQL puro para medir la longitud del array
  const { data, error } = await supabase.rpc('get_vector_dimension_test'); 
  
  // Si el RPC anterior no existe, creamos uno temporal o usamos una consulta directa
  if (error) {
     console.log('Intentando consulta directa de longitud...');
     const { data: samples } = await supabase.from('course_content_chunks').select('embedding').limit(1);
     if (samples && samples[0] && samples[0].embedding) {
        // En Supabase, el vector viene como string "[val, val...]"
        const dims = samples[0].embedding.replace('[', '').replace(']', '').split(',').length;
        console.log(`✅ Dimensión Detectada: ${dims}`);
     } else {
        console.log('No se pudieron obtener muestras de embeddings.');
     }
  }
}

check();
