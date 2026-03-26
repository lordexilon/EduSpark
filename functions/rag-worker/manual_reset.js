
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mckfscukxcqwntpjagar.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

(async () => {
    const jobId = '9f0f85fb-f6b5-4a8a-b715-475f5564308d';
    console.log(`Checking job ${jobId}...`);
    
    const { data: job, error: fetchError } = await supabase
        .from('file_processing_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

    if (fetchError) {
        console.error('Error fetching job:', fetchError.message);
        return;
    }

    console.log(`Current job:`, JSON.stringify(job, null, 2));
    console.log(`Resetting to pending...`);

    const { error: updateError } = await supabase
        .from('file_processing_jobs')
        .update({ 
            status: 'pending', 
            updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

    if (updateError) {
        console.error('Error updating job:', updateError.message);
    } else {
        console.log('Job reset successfully!');
    }
})();
