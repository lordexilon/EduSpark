require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
    // Harrison Job ID from logs
    const jobId = '38d35235-2f52-401b-98b3-a58af09a66d3';

    console.log(`[Script] Marcando Harrison como completado...`);
    console.log(`Job ID: ${jobId}`);

    // 1. Obtener job para extraer materialId
    const { data: job, error: fetchError } = await supabase
        .from('file_processing_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

    if (fetchError) {
        console.error('[Script] Error obteniendo job:', fetchError.message);
        return;
    }

    console.log(`[Script] Status actual: ${job.status}`);
    console.log(`[Script] Chunks procesados: ${job.metadata?.chunksProcessed}`);

    // 2. Actualizar job
    const { error: updateError } = await supabase
        .from('file_processing_jobs')
        .update({
            status: 'completed',
            metadata: { ...job.metadata, phase: 'completed' },
            updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

    if (updateError) {
        console.error('[Script] Error actualizando job:', updateError.message);
    } else {
        console.log('[Script] ✅ Job marcado como completed');
    }

    // 3. Actualizar material si existe
    const materialId = job.metadata?.materialId || job.material_id;
    if (materialId) {
        console.log(`[Script] Actualizando material: ${materialId}`);
        const { error: matError } = await supabase
            .from('materials')
            .update({
                rag_status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', materialId);

        if (matError) {
            console.error('[Script] Error actualizando material:', matError.message);
        } else {
            console.log('[Script] ✅ Material marcado como completed');
        }
    }

    console.log('[Script] ¡Proceso finalizado!');
})();
