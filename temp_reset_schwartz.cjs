const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://mckfscukxcqwntpjagar.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8'
);

async function resetSpecificJob() {
    const jobId = '847e3841-4361-4227-846f-d37f64604492';

    console.log('Reseteando job a pending:', jobId);

    const { error } = await supabase
        .from('file_processing_jobs')
        .update({
            status: 'pending',
            updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Job reseteado a PENDING exitosamente!');
    }
}

resetSpecificJob();
