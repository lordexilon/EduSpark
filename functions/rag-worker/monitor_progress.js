require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
    console.log('--- Monitoring Report ---');
    const now = new Date().toLocaleTimeString();
    console.log(`Time: ${now}`);

    // 1. Get Active Job
    const { data: job, error: jobError } = await supabase
        .from('file_processing_jobs')
        .select('*')
        .eq('status', 'processing')
        .single();

    if (jobError || !job) {
        console.log('No active processing job found.');
        return;
    }

    console.log(`Active Job: ${job.file_name} (ID: ${job.id})`);

    // 2. Get Statistics
    const materialId = job.metadata?.materialId || job.material_id;
    console.log(`Material ID: ${materialId}`);

    // Count Total Text Chunks
    const res1 = await supabase
        .from('course_content_chunks')
        .select('id', { count: 'exact', head: true })
        .eq('material_id', materialId);

    if (res1.error) console.log('Error 1:', res1.error);
    const totalChunks = res1.count;

    // Count Chunks with Embeddings
    const res2 = await supabase
        .from('course_content_chunks')
        .select('id', { count: 'exact', head: true })
        .eq('material_id', materialId)
        .not('embedding', 'is', null);

    if (res2.error) console.log('Error 2:', res2.error);
    const embeddingsCount = res2.count;

    console.log('\n--- Progress Stats ---');
    console.log(`📝 Text Chunks Created: ${totalChunks}`);
    console.log(`🧠 Embeddings Generated: ${embeddingsCount}`);

    // Estimate phases
    if (embeddingsCount === 0) {
        if (totalChunks === 0) {
            console.log('Phase: ✂️ Splitting PDF / Initializing');
        } else {
            console.log('Phase: 📄 Extracting Text from PDF Chunks');
        }
    } else {
        const percent = totalChunks > 0 ? Math.round((embeddingsCount / totalChunks) * 100) : 0;
        console.log(`Phase: 🤖 Generating Embeddings (${percent}%)`);
    }

})();
