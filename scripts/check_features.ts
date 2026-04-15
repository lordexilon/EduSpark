
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMenuFeatures() {
    const { data, error } = await supabase
        .from('menu_features')
        .select('*');

    if (error) {
        console.error('Error fetching menu features:', error);
    } else {
        console.log('Menu Features:', data);
    }
}

checkMenuFeatures();
