
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mckfscukxcqwntpjagar.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetJob() {
    const jobId = '9f0f85fb-f6b5-4a8a-b715-475f5564308d';
    console.log(`Reseteando job ${jobId} a pending...`);

    const { data, error } = await supabase
        .from('file_processing_jobs')
        .update({ 
            status: 'pending',
            updated_at: new Date().toISOString(),
            error: null
        })
        .eq('id', jobId);

    if (error) {
        console.error('Error reseteando job:', error);
    } else {
        console.log('Job reseteado exitosamente.');
    }
}

resetJob();
