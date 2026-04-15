require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
    const jobId = '6a64e477-36d4-42ca-a7b4-1cbb8e9bd17f';
    console.log(`Checking status for Job ID: ${jobId}`);

    const { data: job, error } = await supabase
        .from('file_processing_jobs')
        .select('status')
        .eq('id', jobId)
        .single();

    if (error) {
        console.error('Error fetching job:', error.message);
    } else {
        console.log(`Final Job Status: ${job.status}`);
        console.log(`Completed At: ${job.completed_at}`);
    }
})();
