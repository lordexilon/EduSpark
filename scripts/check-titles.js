import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.-5HFEuphwYhfa8HBW3FddQfu5b-JOCb6FLElKFwezBg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('--- Verificando Títulos de Cursos ---');
  const { data: c1 } = await supabase.from('courses').select('id, title').eq('id', 1).single();
  const { data: c12 } = await supabase.from('courses').select('id, title').eq('id', 12).single();

  console.log(`Course 1: ${c1 ? c1.title : 'No existe'}`);
  console.log(`Course 12: ${c12 ? c12.title : 'No existe'}`);
}

check();
