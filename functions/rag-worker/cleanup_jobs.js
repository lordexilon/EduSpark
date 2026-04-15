require('dotenv').config({ path: 'functions/rag-worker/.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function cleanup() {
    console.log('Limpiando jobs rotos...');

    const brokenIds = [
        '196f36ab-794e-4f20-aecd-eb7827476b71', // Tiny PDF
        '80261c56-0616-4fa4-a9c1-ead2f440371f', // Repeated Text PDF (Maybe broken too?)
        '2d5585ea-53d9-41f7-ae0b-3ea2edc685b9'  // Zombie Drive
    ];

    const { error } = await supabase
        .from('file_processing_jobs')
        .update({ status: 'failed', updated_at: new Date().toISOString() }) // No 'error' column to be safe
        .in('id', brokenIds);

    if (error) {
        console.error('Error limpiando:', error);
    } else {
        console.log('Jobs marcados como failed.');
    }

    console.log('Verificando job TraceMonkey...');
    const { data: job } = await supabase
        .from('file_processing_jobs')
        .select('id, status')
        .eq('id', '9b7622b1-3765-4ff7-9647-51cda8962776')
        .single();

    console.log('TraceMonkey Job Status:', job.status);
}

cleanup();
