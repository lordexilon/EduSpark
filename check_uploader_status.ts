import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkStatus() {
  const { data, error } = await supabase
    .table('processed_documents')
    .select('id, title, processing_status, created_at, total_chunks, processed_by')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching processed_documents:', error);
    return;
  }

  console.log('Recent Processed Documents:');
  console.table(data);

  // Check chunks count for the most recent one if it's processing
  if (data && data.length > 0 && data[0].processing_status === 'processing') {
    const doc = data[0];
    const { count, error: countError } = await supabase
      .table('course_content_chunks')
      .select('*', { count: 'exact', head: true })
      .filter('metadata->>sourceFileName', 'eq', doc.title);

    if (!countError) {
      console.log(`Document "${doc.title}" has ${count} chunks so far.`);
    }
  }
}

checkStatus();
