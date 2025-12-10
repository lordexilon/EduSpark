require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
    console.log('Searching for stuck processing jobs...');

    // Buscar jobs en processing
    const { data: jobs, error } = await supabase
        .from('file_processing_jobs')
        .select('*')
        .eq('status', 'processing')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching jobs:', error);
        return;
    }

    if (jobs.length === 0) {
        console.log('No stuck jobs found.');
        return;
    }

    // Resetear el más reciente
    const job = jobs[0];
    console.log(`Found stuck job: ${job.id} (${job.file_name})`);
    console.log(`Last updated: ${job.updated_at}`);

    console.log('Resetting to PENDING...');

    const { error: updateError } = await supabase
        .from('file_processing_jobs')
        .update({
            status: 'pending',
            updated_at: new Date().toISOString(),
            error_message: null // Clear previous errors if any
        })
        .eq('id', job.id);

    if (updateError) {
        console.error('Error updating job:', updateError);
    } else {
        console.log('✅ Job reset successfully! Worker should pick it up momentarily.');
    }
})();
