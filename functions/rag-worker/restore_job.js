require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function restoreJob() {
    const jobId = '4987b29d-dc78-480f-bcd9-720f9eda1ee7';

    console.log('Restaurando metadata completo del job...');

    const fullMetadata = {
        source: 'google_drive',
        userId: '502233ed-a7cd-4362-82ce-94ac80e785dd',
        jobType: 'split',
        pdfType: 'unknown',
        category: 'book',
        chunkSize: 60,
        materialId: 'fc10f106-20e0-42b9-9b87-9c136c4913f2',
        driveFileId: '1ezu3Gb_oBi4pabHbfs50Nf2F4BFWk2lC',
        sourceFileId: '1ezu3Gb_oBi4pabHbfs50Nf2F4BFWk2lC',
        ragProcessingType: 'full'
    };

    const { error } = await supabase
        .from('file_processing_jobs')
        .update({
            status: 'pending',
            metadata: fullMetadata,
            updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Job restaurado a PENDING con metadata completo!');
        console.log('Metadata:', JSON.stringify(fullMetadata, null, 2));
    }
}

restoreJob();
