
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mckfscukxcqwntpjagar.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.-5HFEuphwYhfa8HBW3FddQfu5b-JOCb6FLElKFwezBg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProcessing() {
    console.log('--- Verificando Chunks ---');

    // Intento 1: Ver si hay chunks en general
    const { count, error } = await supabase
        .from('course_content_chunks')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error(`Error contando chunks:`, error);
    } else {
        console.log(`Total de chunks en la tabla: ${count}`);
    }

    // Intento 2: Ver los últimos chunks insertados
    const { data: latestChunks, error: latestError } = await supabase
        .from('course_content_chunks')
        .select('id, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (latestError) {
        console.error(`Error obteniendo últimos chunks:`, latestError);
    } else if (latestChunks) {
        console.log('\nÚltimos 5 chunks:');
        latestChunks.forEach(c => {
            console.log(`ID: ${c.id} | Metadata: ${JSON.stringify(c.metadata)} | Created: ${c.created_at}`);
        });
    }

    console.log('\n--- Verificando Jobs ---');
    const { data: jobs, error: jobsError } = await supabase
        .from('file_processing_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (jobsError) {
        console.error('Error obteniendo jobs:', jobsError);
    } else if (jobs) {
        jobs.forEach(job => {
            console.log(`Job: ${job.file_name} | Status: ${job.status} | Created: ${job.created_at}`);
        });
    }
}

checkProcessing();
