require('dotenv').config({ path: 'functions/rag-worker/.env.production' });
const { createClient } = require('@supabase/supabase-js');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const axios = require('axios');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const WORKER_URL = 'https://rag-worker-dev-mcc5aevj6a-uc.a.run.app';

async function run() {
    console.log('1. Descargando PDF de prueba (Real)...');
    // Usamos el paper de TraceMonkey (técnico, bueno para extraer entidades)
    const SAMPLE_PDF_URL = 'https://raw.githubusercontent.com/mozilla/pdf.js/master/test/pdfs/tracemonkey.pdf';

    // O mejor, uno corto de Wikipedia si es posible, pero TraceMonkey sirve.
    const pdfResponse = await axios.get(SAMPLE_PDF_URL, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(pdfResponse.data);

    console.log(`PDF descargado (${buffer.length} bytes).`);

    console.log('2. Subiendo a Supabase Storage...');
    const fileName = `test_graph_tracemonkey_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('course-documents')
        .upload(fileName, buffer, {
            contentType: 'application/pdf',
            upsert: true
        });

    if (uploadError) {
        console.error('Error subiendo archivo:', uploadError);
        return;
    }
    console.log('Archivo subido:', fileName);

    console.log('3. Creando Job...');
    // Necesitamos un material dummy ID (usamos uno existente o random si no hay FK check estricto)
    // Para evitar FK error, busquemos un material existente cualquiera para "prestar" su ID
    const { data: materials } = await supabase.from('materials').select('id, course_id').limit(1);
    const material = materials[0];

    if (!material) {
        console.error('No se encontraron materiales para asociar.');
        return;
    }

    const { data: job, error: jobError } = await supabase
        .from('file_processing_jobs')
        .insert({
            user_id: '502233ed-a7cd-4362-82ce-94ac80e785dd', // Usamos un user ID real que vimos antes, o el mío
            file_name: fileName,
            bucket_path: fileName,
            status: 'processing', // Directo a processing para el experimento
            metadata: {
                source: 'upload',
                materialId: material.id,
                rag_mode: 'graph_experiment'
            },
            course_id: material.course_id
        })
        .select()
        .single();

    if (jobError) {
        console.error('Error creando job:', jobError);
        return;
    }
    console.log('Job creado:', job.id);

    console.log('4. Invocando Worker...');
    try {
        await axios.post(WORKER_URL, {}, { timeout: 3000 });
    } catch (e) {
        console.log('Worker invocado (ignorar timeout).');
    }

    console.log('✅ Experimento lanzado. Revisa graph_nodes en 1 minuto.');
}

run();
