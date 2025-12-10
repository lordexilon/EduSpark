require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
    console.log('=== Completando Jobs al 100% ===\n');

    // Buscar TODOS los jobs en processing
    const { data: jobs, error } = await supabase
        .from('file_processing_jobs')
        .select('id, file_name, status, metadata')
        .eq('status', 'processing');

    if (error) {
        console.error('Error buscando jobs:', error.message);
        return;
    }

    console.log(`Jobs en processing: ${jobs.length}\n`);

    let completados = 0;
    let pendientes = 0;

    for (const job of jobs) {
        const chunksProcessed = job.metadata?.chunksProcessed || 0;
        const chunksTotal = job.metadata?.chunksTotal || 0;
        const fileName = job.file_name?.substring(0, 50) || 'Sin nombre';

        // Si chunks procesados >= total, marcar como completed
        if (chunksTotal > 0 && chunksProcessed >= chunksTotal) {
            console.log(`✅ Completando: ${fileName} (${chunksProcessed}/${chunksTotal})`);

            const { error: updateError } = await supabase
                .from('file_processing_jobs')
                .update({
                    status: 'completed',
                    metadata: { ...job.metadata, phase: 'completed' },
                    updated_at: new Date().toISOString()
                })
                .eq('id', job.id);

            if (updateError) {
                console.log(`   ❌ Error job: ${updateError.message}`);
            } else {
                // Actualizar material
                if (job.metadata?.materialId) {
                    await supabase
                        .from('materials')
                        .update({ rag_status: 'completed' })
                        .eq('id', job.metadata.materialId);
                }
                completados++;
            }
        } else {
            console.log(`⏳ Pendiente: ${fileName} (${chunksProcessed}/${chunksTotal})`);
            pendientes++;
        }
    }

    console.log(`\n=== Resumen ===`);
    console.log(`Completados: ${completados}`);
    console.log(`Pendientes: ${pendientes}`);
    console.log(`Total: ${jobs.length}`);
})();
