// services/contentIndexingService.ts
// Servicio para indexar contenido de texto (Unidades, Sesiones) en el RAG

import { FileProcessingJob } from '@/types/fileProcessing';
import { createJob } from './firestoreService';

// URL del worker local (para desarrollo)
// En producción esto debería ser una Cloud Function o la misma URL si el worker está expuesto
const WORKER_API_URL = 'http://localhost:3001/jobs';

/**
 * Helper para crear job vía API (bypassing Firestore rules)
 */
async function createJobViaApi(jobData: any): Promise<string> {
    console.log('📤 createJobViaApi - Enviando job al worker:', WORKER_API_URL, jobData.jobType);
    try {
        const response = await fetch(WORKER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(jobData),
        });

        console.log('📥 createJobViaApi - Respuesta del worker:', response.status, response.ok);

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ createJobViaApi - Error del worker:', error);
            throw new Error(error.error || 'Error al crear job en worker');
        }

        const data = await response.json();
        console.log('✅ createJobViaApi - Job creado:', data.jobId);
        return data.jobId;
    } catch (error) {
        console.error('❌ createJobViaApi - Error llamando a worker API:', error);
        // Fallback: Intentar crear directamente (fallará si las reglas son estrictas)
        return await createJob(jobData);
    }
}

/**
 * Indexa el contenido de texto de una unidad
 */
export async function indexUnitContent(
    unit: {
        id: string;
        course_id: string | number;
        title: string;
        description?: string;
        content_html?: string;
        learning_objectives?: string[];
    },
    userId: string
): Promise<string> {
    // Construir el texto a indexar
    const parts = [];

    if (unit.title) parts.push(`Título: ${unit.title}`);
    if (unit.description) parts.push(`Descripción: ${unit.description}`);
    if (unit.learning_objectives && unit.learning_objectives.length > 0) {
        parts.push(`Objetivos de Aprendizaje:\n- ${unit.learning_objectives.join('\n- ')}`);
    }
    if (unit.content_html) {
        // El HTML se limpiará en el worker, pero aquí podemos darle contexto
        parts.push(`Contenido:\n${unit.content_html}`);
    }

    const fullText = parts.join('\n\n');

    if (!fullText.trim()) {
        console.warn('No hay contenido para indexar en la unidad', unit.id);
        return '';
    }

    // Crear el job
    const jobId = await createJobViaApi({
        status: 'pending',
        jobType: 'index_text_content',
        courseId: String(unit.course_id),
        textContent: fullText,
        sourceFileName: `Unidad: ${unit.title}`,
        metadata: {
            userId,
            category: 'syllabus', // Las unidades suelen ser parte del temario
            unitId: unit.id,
            // Usamos un ID ficticio para sourceFileId para que sea rastreable
            fileSize: fullText.length,
        }
    });

    console.log(`Job de indexación creado para unidad ${unit.id}: ${jobId}`);
    return jobId;
}

/**
 * Indexa el contenido de texto de una sesión
 */
export async function indexSessionContent(
    session: {
        id: string;
        course_id: string | number;
        title: string;
        description?: string;
        content_html?: string;
        learning_objectives?: string[];
    },
    userId: string,
    unitId?: string
): Promise<string> {
    // Construir el texto a indexar
    const parts = [];

    if (session.title) parts.push(`Título de Sesión: ${session.title}`);
    if (session.description) parts.push(`Descripción: ${session.description}`);
    if (session.learning_objectives && session.learning_objectives.length > 0) {
        parts.push(`Objetivos de Aprendizaje:\n- ${session.learning_objectives.join('\n- ')}`);
    }
    if (session.content_html) {
        parts.push(`Contenido:\n${session.content_html}`);
    }

    const fullText = parts.join('\n\n');

    if (!fullText.trim()) {
        console.warn('No hay contenido para indexar en la sesión', session.id);
        return '';
    }

    // Crear el job
    const jobId = await createJobViaApi({
        status: 'pending',
        jobType: 'index_text_content',
        courseId: String(session.course_id),
        textContent: fullText,
        sourceFileName: `Sesión: ${session.title}`,
        metadata: {
            userId,
            category: 'syllabus',
            unitId: unitId,
            sessionId: session.id,
            fileSize: fullText.length,
        }
    });

    console.log(`Job de indexación creado para sesión ${session.id}: ${jobId}`);
    return jobId;
}
