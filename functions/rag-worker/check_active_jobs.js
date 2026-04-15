require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
    console.log('Checking for active jobs...');
    const { data: jobs, error } = await supabase
        .from('file_processing_jobs')
        .select('id, file_name, status, created_at, metadata')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching jobs:', error.message);
    } else {
        if (jobs.length === 0) {
            console.log('No active jobs found.');
        } else {
            console.log(`Found ${jobs.length} active jobs:`);
            jobs.forEach(job => {
                console.log(`- [${job.status}] ${job.file_name} (ID: ${job.id})`);
                if (job.metadata) {
                    console.log(`  Metadata: ${JSON.stringify(job.metadata)}`);
                }
            });
        }
    }
})();
