require('dotenv').config({ path: 'functions/rag-worker/.env.production' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const WORKER_URL = 'https://rag-worker-dev-mcc5aevj6a-uc.a.run.app';

async function startExperiment() {
    console.log('Environment check:', {
        url: process.env.SUPABASE_URL ? 'OK' : 'MISSING',
        key: process.env.SUPABASE_SERVICE_KEY ? 'OK' : 'MISSING'
    });

    console.log('🔍 Buscando un job completado reciente para usar como prueba...');

    // 1. Buscar el job completado más reciente (idealmente pequeño)
    console.log('Consultando Supabase...');
    const { data: jobs, error } = await supabase
        .from('file_processing_jobs')
        .select('id, file_name, metadata, status')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error de Supabase:', error);
        return;
    }

    console.log(`✅ Jobs encontrados: ${jobs?.length || 0}`);

    if (!jobs || jobs.length === 0) {
        console.error('❌ No se encontraron jobs completados.');
        return;
    }

    // Tomar el más reciente (o buscar uno pequeño si pudiéramos ver el tamaño)
    const job = jobs[0];
    console.log(`\n📄 Archivo seleccionado: ${job.file_name}`);
    console.log(`🆔 Job ID: ${job.id}`);

    // 2. Cambiar estado a 'pending_dev'
    console.log('\n🔄 Cambiando estado a "pending_dev"...');
    const { error: updateError } = await supabase
        .from('file_processing_jobs')
        .update({
            status: 'processing', // Usamos processing para que PROD lo ignore
            updated_at: new Date().toISOString(),
            // Limpiar métricas anteriores para ver el progreso real
            metadata: {
                ...job.metadata,
                rag_mode: 'graph_experiment' // Marca para saber qué estamos haciendo
            }
        })
        .eq('id', job.id);

    if (updateError) {
        console.error('❌ Error actualizando job:', updateError.message);
        return;
    }

    console.log('✅ Job marcado como pendiente para desarrollo.');

    // 3. Invocar al worker
    console.log(`\n🚀 Invocando al Worker DEV en: ${WORKER_URL}`);
    try {
        // La llamada puede tardar, así que no esperamos la respuesta completa si es larga
        // pero axios esperará por defecto.
        const response = await axios.post(WORKER_URL, {}, {
            timeout: 5000 // Timeout corto solo para despertar al worker, el proceso sigue en background
        });
        console.log('✅ Worker invocado (Respuesta 200 OK)');
    } catch (e) {
        if (e.code === 'ECONNABORTED') {
            console.log('✅ Worker invocado (Timeout esperado, el proceso continúa en background)');
        } else {
            console.error('⚠️ Error al invocar worker (puede que ya esté corriendo):', e.message);
        }
    }

    console.log('\n👀 Monitoriza los logs en Google Cloud Console o revisa la tabla graph_nodes en unos minutos.');
}

startExperiment();
