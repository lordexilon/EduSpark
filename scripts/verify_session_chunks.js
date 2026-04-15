import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const getEnv = (key) => {
    const match = envContent.match(new RegExp(`${key}=(.+)`));
    return match ? match[1].trim() : '';
};

const supabase = createClient(
    getEnv('VITE_SUPABASE_URL'),
    getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY')
);

async function checkChunks() {
    const sessionId = 'c6241617-0173-4171-b14b-368788df68b1';

    const { data, error } = await supabase
        .from('course_content_chunks')
        .select('*')
        .eq('metadata->>sessionId', sessionId)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Chunks encontrados:', data?.length || 0);
    if (data && data.length > 0) {
        console.log('\nÚltimo chunk:');
        console.log('- ID:', data[0].id);
        console.log('- Contenido (primeros 300 chars):', data[0].content?.substring(0, 300));
        console.log('- Metadata:', JSON.stringify(data[0].metadata, null, 2));
        console.log('- Created at:', data[0].created_at);
    } else {
        console.log('\n❌ No se encontraron chunks para esta sesión');
    }
}

checkChunks().then(() => process.exit(0));
