import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.-5HFEuphwYhfa8HBW3FddQfu5b-JOCb6FLElKFwezBg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('--- Resumen de Chunks por Course ID ---');
  // Obtenemos los 1000 primeros chunks solo para ver sus course_id
  const { data, error } = await supabase
    .from('course_content_chunks')
    .select('course_id')
    .limit(1000);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const counts = data.reduce((acc, c) => {
    acc[c.course_id] = (acc[c.course_id] || 0) + 1;
    return acc;
  }, {});

  console.log('Conteos por Course ID (muestra de 1000):', counts);
  
  console.log('\n--- Buscando Harrison específicamente ---');
  const { data: harrison } = await supabase
    .from('course_content_chunks')
    .select('id, course_id, content')
    .ilike('content', '%Harrison%')
    .limit(3);
  
  if (harrison && harrison.length > 0) {
    harrison.forEach(h => {
      console.log(`Harrison ID: ${h.id} | Course ID: ${h.course_id}`);
    });
  } else {
    console.log('No se encontró Harrison con ese texto.');
  }

  console.log('\n--- Buscando Anticonceptivos específicamente ---');
  const { data: anti } = await supabase
    .from('course_content_chunks')
    .select('id, course_id, content')
    .ilike('content', '%anticonceptivos%')
    .limit(3);
  
  if (anti && anti.length > 0) {
    anti.forEach(a => {
      console.log(`Anticonceptivos ID: ${a.id} | Course ID: ${a.course_id}`);
    });
  }
}

check();
