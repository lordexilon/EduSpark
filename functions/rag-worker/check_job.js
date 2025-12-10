require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkJob() {
    const { data, error } = await supabase
        .from('file_processing_jobs')
        .select('id, status, metadata, updated_at')
        .eq('id', '4987b29d-dc78-480f-bcd9-720f9eda1ee7')
        .single();

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Job Status:');
        console.log(JSON.stringify(data, null, 2));
    }
}

checkJob();
