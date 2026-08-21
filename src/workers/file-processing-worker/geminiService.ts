// @ts-nocheck
// workers/file-processing-worker/geminiService.ts
// Servicio para generar embeddings con Gemini usando REST API

/**
 * Genera embedding para un texto usando la API REST de Gemini
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY debe estar configurado');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: {
          parts: [{ text }],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const embedding = result?.embedding?.values;

    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      console.error('Respuesta de Gemini:', JSON.stringify(result, null, 2));
      throw new Error('No se pudo generar embedding - respuesta inválida');
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
  const batchSize = 5; // Reducido para evitar rate limits
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(batch.map((text) => generateEmbedding(text)));
    embeddings.push(...batchEmbeddings);

    // Pequeño delay entre lotes
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return embeddings;
}
