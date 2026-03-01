require('dotenv').config({ path: 'functions/rag-worker/.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function check() {
    console.log('Checking TraceMonkey Job...');
    const { data: job, error } = await supabase
        .from('file_processing_jobs')
        .select('id, status, metadata, updated_at')
        .eq('id', '9b7622b1-3765-4ff7-9647-51cda8962776')
        .single();

    if (error) {
        console.error('Error fetching job:', error);
    } else {
        console.log('Job Status:', JSON.stringify(job, null, 2));
    }

    // Check failed jobs recently
    const { data: failed } = await supabase
        .from('file_processing_jobs')
        .select('id, status, updated_at')
        .eq('status', 'failed')
        .order('updated_at', { ascending: false })
        .limit(1);

    console.log('Most recent failed job:', JSON.stringify(failed, null, 2));

    // Check nodes count
    const { data: nodes, error: countError } = await supabase
        .from('graph_nodes')
        .select('*')
        .limit(5);

    console.log(`Graph Nodes Found: ${nodes?.length || 0}`);
    if (nodes && nodes.length > 0) {
        console.log('Sample Nodes:', JSON.stringify(nodes, null, 2));
    }
}

check();
