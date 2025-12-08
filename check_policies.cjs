
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkPolicies() {
    console.log('Checking RLS policies for courses...');

    const { data, error } = await supabase
        .rpc('get_policies_for_table', { table_name: 'courses' });

    if (error) {
        // Fallback if RPC doesn't exist, try to query pg_policies directly if possible (usually not via client)
        // Or just try to select as a supervisor user if I could simulate it, but I can't easily.
        console.error('Error fetching policies via RPC:', error);

        // Let's try to just list courses as a test? No, I need to know the policies.
        // I will try to create the RPC function if it fails? No, I can't easily create RPCs without SQL editor access usually.
        // But I can try to read the `sql_scripts` folder to see if there are policy definitions.
    } else {
        console.log('Policies:', data);
    }
}

checkPolicies();
