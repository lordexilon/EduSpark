// Script temporal para agregar páginas estimadas a Harrison
// Ejecutar desde Node.js o crear endpoint temporal

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_SERVICE_KEY! // Usar service key para bypass RLS
);

async function addEstimatedPagesToHarrison() {
    console.log('Iniciando actualización de páginas estimadas...');

    const materials = [
        { id: '6a695969-78c1-42ea-af24-f6f2e2f88332', name: 'Harrison Tomo 1', totalPages: 2500 },
        { id: '79882510-d16f-447b-802a-1f73cdce1c04', name: 'Harrison Tomo 2', totalPages: 2500 }
    ];

    for (const material of materials) {
        console.log(`\nProcesando ${material.name}...`);

        // 1. Obtener todos los chunks del material
        const { data: chunks, error } = await supabase
            .from('course_content_chunks')
            .select('id, chunk_index, metadata')
            .eq('metadata->>material_id', material.id)
            .order('chunk_index');

        if (error) {
            console.error(`Error obteniendo chunks de ${material.name}:`, error);
            continue;
        }

        if (!chunks || chunks.length === 0) {
            console.log(`No se encontraron chunks para ${material.name}`);
            continue;
        }

        console.log(`Encontrados ${chunks.length} chunks`);
        const totalChunks = chunks.length;

        // 2. Actualizar en batches de 10 para evitar timeout
        const BATCH_SIZE = 10;
        let updated = 0;

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length));

            // Actualizar cada chunk del batch
            const updates = batch.map(chunk => {
                const pageStart = Math.floor(((chunk.chunk_index || 1) - 1) * material.totalPages / totalChunks) + 1;
                const pageEnd = Math.floor((chunk.chunk_index || 1) * material.totalPages / totalChunks);

                return supabase
                    .from('course_content_chunks')
                    .update({
                        metadata: {
                            ...chunk.metadata,
                            pageStart,
                            pageEnd
                        }
                    })
                    .eq('id', chunk.id);
            });

            // Ejecutar batch en paralelo
            await Promise.all(updates);
            updated += batch.length;

            console.log(`Progreso: ${updated}/${totalChunks} chunks (${Math.round(updated / totalChunks * 100)}%)`);

            // Pequeño delay para no sobrecargar
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`✅ ${material.name} completado: ${updated} chunks actualizados`);
    }

    console.log('\n✅ Actualización completada!');
}

// Ejecutar
addEstimatedPagesToHarrison().catch(console.error);
