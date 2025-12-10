require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function resetJob() {
    const jobId = '4987b29d-dc78-480f-bcd9-720f9eda1ee7';

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

resetJob();
