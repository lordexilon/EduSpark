// workers/file-processing-worker/geminiService.ts
// Servicio para generar embeddings con Gemini

import { GoogleGenAI } from '@google/genai';

let genAI: GoogleGenAI | null = null;

/**
 * Inicializa cliente de Gemini
 */
function initializeGemini(): GoogleGenAI {
  if (genAI) return genAI;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY debe estar configurado');
  }

  genAI = new GoogleGenAI({ apiKey });
  return genAI;
}

/**
 * Genera embedding para un texto
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const genAI = initializeGemini();
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  try {
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_DOCUMENT',
    });

    const embedding = result.embedding.values;
    if (!embedding || embedding.length === 0) {
      throw new Error('No se pudo generar embedding');
    }

    return embedding;
  } catch (error: any) {
    console.error('Error generando embedding:', error);
    throw new Error(`Error generando embedding: ${error.message}`);
  }
}

/**
 * Genera embeddings para múltiples textos (en batch)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  // Procesar en lotes para evitar rate limiting
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map(text => generateEmbedding(text))
    );
    embeddings.push(...batchEmbeddings);
    
    // Pequeño delay entre lotes
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return embeddings;
}

