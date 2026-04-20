import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.-5HFEuphwYhfa8HBW3FddQfu5b-JOCb6FLElKFwezBg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function find() {
  console.log('--- Buscando Curso por Título ---');
  const { data, error } = await supabase
    .from('courses')
    .select('id, title')
    .ilike('title', '%CONAREM%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No se encontró NINGÚN curso con el título "CONAREM".');
    const { data: all } = await supabase.from('courses').select('id, title').limit(10);
    console.log('Primeros 10 de la tabla courses:', all);
  } else {
    data.forEach(c => {
      console.log(`✅ ENCONTRADO: ${c.id} | ${c.title}`);
    });
  }
}

find();
