import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno locales
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan credenciales de Supabase en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  console.log('Iniciando proceso de actualización de chunks (Backfill)...');
  
  // 1. Obtener todos los materiales que tienen session_id o unit_id para armar el mapa
  const { data: materials, error: matErr } = await supabase
    .from('materials')
    .select('id, unit_id, session_id');

  if (matErr) {
    console.error('Error obteniendo materiales:', matErr);
    process.exit(1);
  }

  const matMap = new Map();
  materials.forEach(m => {
    // Sólo almacenar materiales que posean unidad o sesión para acelerar
    if (m.unit_id || m.session_id) {
      matMap.set(m.id, { unit_id: m.unit_id, session_id: m.session_id });
    }
  });

  console.log(`Se cargaron ${matMap.size} materiales que tienen Unidad/Sesión configurada.`);
  if (matMap.size === 0) {
    console.log('No hay chunks que actualizar, ningún material está asignado a Unidades.');
    process.exit(0);
  }

  // Iterar en chunks y actualizar por lotes (Batch)
  const batchSize = 1000;
  let offset = 0;
  let totalUpdated = 0;

  while (true) {
    console.log(`Buscando chunks... (offset: ${offset})`);
    
    // Solo traemos el metadata y IDs de chunks que aún no tienen unidad asignada
    // Se usa supabase() nativo para paginar
    const { data: chunks, error: chunkErr } = await supabase
      .from('course_content_chunks')
      .select('id, metadata')
      .is('unit_id', null)
      .is('session_id', null)
      .range(offset, offset + batchSize - 1);

    if (chunkErr) {
      console.error('Error buscando chunks:', chunkErr);
      process.exit(1);
    }

    if (!chunks || chunks.length === 0) {
      console.log(`\n¡PROCESO TERMINADO! Se actualizaron ${totalUpdated} chunks totales.`);
      break;
    }

    const updates = [];
    chunks.forEach(c => {
      const metadataStr = c.metadata;
      if (metadataStr && metadataStr.material_id) {
        const matId = metadataStr.material_id;
        if (matMap.has(matId)) {
          const mapping = matMap.get(matId);
          updates.push({
            id: c.id,
            unit_id: mapping.unit_id,
            session_id: mapping.session_id
          });
        }
      }
    });

    if (updates.length > 0) {
      // Upsert masivo o actualización una por una
      // Supabase .upsert() requiere toda la fila o claves primarias.
      // Como queremos actualizar campos sueltos de manera limpia sin perder vectores, 
      // dividimos los updates y hacemos peticiones concurrentes
      console.log(`Encontrados ${updates.length} chunks a corregir en este lote. Procesando...`);
      const updatePromises = updates.map(u => 
        supabase.from('course_content_chunks')
          .update({ unit_id: u.unit_id, session_id: u.session_id })
          .eq('id', u.id)
      );
      
      const results = await Promise.allSettled(updatePromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      totalUpdated += successful;
      console.log(`\t> +${successful} chunks corregidos correctamente.`);
    }

    // Avanzar
    offset += batchSize;
  }
}

main();
