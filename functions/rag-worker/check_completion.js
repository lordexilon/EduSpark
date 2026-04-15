require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAndComplete() {
    const JOB_ID = '6a64e477-36d4-42ca-a7b4-1cbb8e9bd17f';
    const MATERIAL_ID = 'b34ce313-ee4a-4098-80da-a3b713359db6';

    // Verificar estado actual
    const { data: job } = await supabase
        .from('file_processing_jobs')
        .select('status, completed_at')
        .eq('id', JOB_ID)
        .single();

    const { data: material } = await supabase
        .from('materials')
        .select('rag_status')
        .eq('id', MATERIAL_ID)
        .single();

    console.log('Job status:', job.status);
    console.log('Job completed_at:', job.completed_at);
    console.log('Material rag_status:', material.rag_status);

    if (job.status !== 'completed') {
        console.log('\nMarcando como completado...');

        await supabase.from('file_processing_jobs').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }).eq('id', JOB_ID);

        await supabase.from('materials').update({
            rag_status: 'completed',
            updated_at: new Date().toISOString()
        }).eq('id', MATERIAL_ID);

        console.log('OK - Marcado como completado');
    } else {
        console.log('\nYa esta completado');
    }
}

checkAndComplete().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
