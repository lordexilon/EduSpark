import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectFull() {
  console.log('--- Inspección Profunda de Metadatos ---');
  const { data: chunks } = await supabase
    .from('course_content_chunks')
    .select('id, content, metadata')
    .eq('course_id', 12)
    .ilike('content', '%Afasia%')
    .limit(2);

  chunks?.forEach(c => {
    console.log(`CHUNK ID: ${c.id}`);
    console.log(`METADATA:`, JSON.stringify(c.metadata, null, 2));
    console.log(`MUESTRA: ${c.content.substring(0, 50)}...`);
    console.log('------------------------');
  });
}

inspectFull();
