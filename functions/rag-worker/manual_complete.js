require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    const jobId = '6a64e477-36d4-42ca-a7b4-1cbb8e9bd17f';
    const materialId = 'b34ce313-ee4a-4098-80da-a3b713359db6';

    console.log(`[Script] Verificando estado para Job ID: ${jobId}`);

    try {
        // 1. Verificar y actualizar Job
        const { data: job, error: fetchError } = await supabase
            .from('file_processing_jobs')
            .select('status, metadata')
            .eq('id', jobId)
            .single();

        if (fetchError) {
            console.error('[Script] Error obteniendo job:', fetchError.message);
        } else {
            console.log(`[Script] Estado actual del Job: ${job.status}`);

            if (job.status !== 'completed') {
                console.log('[Script] Actualizando job a completed...');
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
                    console.log('[Script] Job actualizado correctamente.');
                }
            } else {
                console.log('[Script] El job ya está marcado como completed.');
            }
        }

        // 2. Verificar y actualizar Material
        console.log(`[Script] Verificando estado para Material ID: ${materialId}`);
        const { data: material, error: matError } = await supabase
            .from('materials')
            .select('rag_status')
            .eq('id', materialId)
            .single();

        if (matError) {
            console.error('[Script] Error obteniendo material:', matError.message);
        } else {
            console.log(`[Script] Estado actual del Material: ${material.rag_status}`);

            if (material.rag_status !== 'completed') {
                console.log('[Script] Actualizando material a completed...');
                const { error: matUpdateError } = await supabase
                    .from('materials')
                    .update({
                        rag_status: 'completed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', materialId);

                if (matUpdateError) {
                    console.error('[Script] Error actualizando material:', matUpdateError.message);
                } else {
                    console.log('[Script] Material actualizado correctamente.');
                }
            } else {
                console.log('[Script] El material ya está marcado como completed.');
            }
        }

    } catch (err) {
        console.error('[Script] Error inesperado:', err);
        process.exit(1);
    }
})();
