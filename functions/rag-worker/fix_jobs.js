require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function resetJobs() {
    console.log('Resetting stuck processing jobs to pending...');

    // Buscar jobs en processing de la última hora
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: jobs, error: searchError } = await supabase
        .from('file_processing_jobs')
        .select('*')
        .eq('status', 'processing')
        .gt('created_at', oneHourAgo);

    if (searchError) {
        console.error('Error searching jobs:', searchError);
        return;
    }

    console.log(`Found ${jobs.length} stuck jobs.`);

    for (const job of jobs) {
        console.log(`Resetting job ${job.id} (${job.file_name})...`);
        const { error: updateError } = await supabase
            .from('file_processing_jobs')
            .update({
                status: 'pending',
                updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

        if (updateError) console.error(`Error updating job ${job.id}:`, updateError);
        else console.log(`Job ${job.id} reset to PENDING.`);
    }
}

resetJobs();
