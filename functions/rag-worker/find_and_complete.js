require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function findAndComplete() {
    // Buscar el job de Williams Gineco
    const { data: jobs } = await supabase
        .from('file_processing_jobs')
        .select('*')
        .ilike('file_name', '%Williams%')
        .order('created_at', { ascending: false })
        .limit(5);

    if (!jobs || jobs.length === 0) {
        console.log('No se encontro job de Williams');
        return;
    }

    console.log(`Encontrados ${jobs.length} jobs de Williams:`);
    jobs.forEach(j => {
        console.log(`  ${j.id}: ${j.file_name} - Status: ${j.status} - Created: ${j.created_at}`);
    });

    const latestJob = jobs[0];
    console.log(`\nUsando job mas reciente: ${latestJob.id}`);
    console.log(`Status actual: ${latestJob.status}`);
    console.log(`Completed_at: ${latestJob.completed_at}`);

    if (latestJob.status !== 'completed') {
        console.log('\n Marcando como completado...');

        await supabase.from('file_processing_jobs').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }).eq('id', latestJob.id);

        if (latestJob.metadata?.materialId) {
            await supabase.from('materials').update({
                rag_status: 'completed',
                updated_at: new Date().toISOString()
            }).eq('id', latestJob.metadata.materialId);
        }

        console.log('OK - Completado');
    } else {
        console.log('\nYa esta completado');
    }
}

findAndComplete().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
