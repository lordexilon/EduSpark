import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';
const GEMINI_KEY = 'AIzaSyBSisnI5OX87pL2NyRb_Dz3L5JQXQki4OQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAfasia() {
  const query = "Afasia, pérdida de la memoria y otros trastornos cognitivos";
  console.log(`--- Emulando RAG para: "${query}" ---`);

  // 1. Obtener Embedding
  const embRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      model: 'models/gemini-embedding-2-preview', 
      content: { parts: [{ text: query }] }, 
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 512
    })
  });
  
  const embData = await embRes.json();
  const vector = embData.embedding.values;

  // 2. Llamar al RPC (course_id: 12, p_module_id: null)
  const { data: results, error } = await supabase.rpc('search_course_content_chunks', {
    query_embedding: `[${vector.join(',')}]`,
    course_id_param: 12,
    match_threshold: 0.1,
    match_count: 5
  });

  if (error) {
    console.error('❌ Error en RPC:', error.message);
    return;
  }

  console.log(`✅ Resultados encontrados: ${results?.length || 0}`);
  results?.forEach((r, i) => {
    console.log(`Result #${i+1} | Sim: ${r.similarity.toFixed(4)}`);
    console.log(`Content: ${r.content.substring(0, 150)}...`);
    console.log(`Source: ${r.metadata?.sourceFileName || 'N/A'}`);
    console.log('---');
  });
}

checkAfasia();
