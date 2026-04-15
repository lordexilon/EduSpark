// workers/file-processing-worker/verify-processing.ts
// Script para verificar el estado del procesamiento de archivos para IA

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar configurados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyProcessing() {
  console.log('🔍 Verificando estado del procesamiento de archivos para IA...\n');

  try {
    // 1. Verificar trabajos por estado
    console.log('📊 Trabajos por estado:');
    const { data: jobsByStatus, error: jobsError } = await supabase
      .from('file_processing_jobs')
      .select('status, metadata')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (jobsError) {
      console.error('❌ Error obteniendo trabajos:', jobsError);
    } else {
      const statusCounts: Record<string, number> = {};
      const jobTypes: Record<string, number> = {};

      jobsByStatus?.forEach((job: any) => {
        statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
        const jobType = job.metadata?.jobType || 'unknown';
        jobTypes[jobType] = (jobTypes[jobType] || 0) + 1;
      });

      console.log('  Estados:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        const icon = status === 'completed' ? '✅' : status === 'failed' ? '❌' : status === 'processing' ? '⏳' : '⏸️';
        console.log(`    ${icon} ${status}: ${count}`);
      });

      console.log('\n  Tipos de trabajo:');
      Object.entries(jobTypes).forEach(([type, count]) => {
        console.log(`    - ${type}: ${count}`);
      });
    }

    // 2. Verificar trabajos pendientes
    console.log('\n📋 Trabajos pendientes (últimos 10):');
    const { data: pendingJobs, error: pendingError } = await supabase
      .from('file_processing_jobs')
      .select('id, file_name, status, created_at, error_message, metadata')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (pendingError) {
      console.error('❌ Error obteniendo trabajos pendientes:', pendingError);
    } else {
      if (pendingJobs && pendingJobs.length > 0) {
        pendingJobs.forEach((job: any) => {
          console.log(`  - ${job.file_name} (${job.metadata?.jobType || 'unknown'}) - Creado: ${new Date(job.created_at).toLocaleString()}`);
        });
      } else {
        console.log('  ✅ No hay trabajos pendientes');
      }
    }

    // 3. Verificar trabajos fallidos recientes
    console.log('\n❌ Trabajos fallidos (últimos 5):');
    const { data: failedJobs, error: failedError } = await supabase
      .from('file_processing_jobs')
      .select('id, file_name, status, error_message, created_at')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (failedError) {
      console.error('❌ Error obteniendo trabajos fallidos:', failedError);
    } else {
      if (failedJobs && failedJobs.length > 0) {
        failedJobs.forEach((job: any) => {
          console.log(`  - ${job.file_name}`);
          console.log(`    Error: ${job.error_message || 'Sin mensaje de error'}`);
          console.log(`    Fecha: ${new Date(job.created_at).toLocaleString()}\n`);
        });
      } else {
        console.log('  ✅ No hay trabajos fallidos recientes');
      }
    }

    // 4. Verificar chunks guardados
    console.log('\n💾 Chunks guardados en Supabase:');
    const { data: chunksStats, error: chunksError } = await supabase
      .from('course_content_chunks')
      .select('course_id, metadata')
      .limit(1);

    if (chunksError) {
      console.error('❌ Error obteniendo estadísticas de chunks:', chunksError);
    } else {
      // Obtener conteo total
      const { count: totalChunks, error: countError } = await supabase
        .from('course_content_chunks')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('❌ Error contando chunks:', countError);
      } else {
        console.log(`  Total de chunks: ${totalChunks || 0}`);

        // Contar por curso
        const { data: chunksByCourse, error: courseError } = await supabase
          .from('course_content_chunks')
          .select('course_id')
          .limit(10000);

        if (!courseError && chunksByCourse) {
          const courseCounts: Record<number, number> = {};
          chunksByCourse.forEach((chunk: any) => {
            courseCounts[chunk.course_id] = (courseCounts[chunk.course_id] || 0) + 1;
          });

          console.log(`  Cursos con chunks: ${Object.keys(courseCounts).length}`);
          if (Object.keys(courseCounts).length > 0) {
            console.log('  Top 5 cursos:');
            Object.entries(courseCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .forEach(([courseId, count]) => {
                console.log(`    - Curso ${courseId}: ${count} chunks`);
              });
          }
        }
      }
    }

    // 5. Verificar trabajos en procesamiento
    console.log('\n⏳ Trabajos en procesamiento:');
    const { data: processingJobs, error: processingError } = await supabase
      .from('file_processing_jobs')
      .select('id, file_name, status, created_at, updated_at, metadata')
      .eq('status', 'processing')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (processingError) {
      console.error('❌ Error obteniendo trabajos en procesamiento:', processingError);
    } else {
      if (processingJobs && processingJobs.length > 0) {
        processingJobs.forEach((job: any) => {
          const duration = new Date().getTime() - new Date(job.updated_at || job.created_at).getTime();
          const minutes = Math.floor(duration / 60000);
          console.log(`  - ${job.file_name} (${job.metadata?.jobType || 'unknown'}) - ${minutes} minutos`);
        });
      } else {
        console.log('  ✅ No hay trabajos en procesamiento');
      }
    }

    console.log('\n✅ Verificación completada\n');

  } catch (error: any) {
    console.error('❌ Error en verificación:', error);
    process.exit(1);
  }
}

// Ejecutar verificación
verifyProcessing()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

