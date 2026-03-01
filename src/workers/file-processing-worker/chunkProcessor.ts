// workers/file-processing-worker/chunkProcessor.ts
// Procesador de chunks de texto

/**
 * Divide texto en chunks pequeños (aproximadamente 8,000 tokens)
 * Asumiendo ~4 caracteres por token, esto es aproximadamente 32,000 caracteres
 */
export function splitIntoChunks(text: string, maxChars: number = 32000): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  // Dividir por párrafos primero
  const paragraphs = text.split(/\n\n+/);

  for (const paragraph of paragraphs) {
    // Si el párrafo solo es muy grande, dividirlo por oraciones
    if (paragraph.length > maxChars) {
      const sentences = paragraph.split(/[.!?]+\s+/);

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChars) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
          }

          // Si la oración sola es muy grande, dividirla
          if (sentence.length > maxChars) {
            const subChunks = sentence.match(new RegExp(`.{1,${maxChars}}`, 'g')) || [];
            chunks.push(...subChunks.map(c => c.trim()));
          } else {
            currentChunk = sentence;
          }
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }
    } else {
      // Agregar párrafo al chunk actual si cabe
      if (currentChunk.length + paragraph.length > maxChars) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
  }

  // Agregar último chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Procesa un array de páginas y las divide en chunks preservando los números de página
 */
export function processPagesIntoChunks(
  pages: Array<{ text: string; pageNumber: number }>,
  metadata: {
    sourceFileName: string;
  }
): Array<{
  content: string;
  metadata: {
    sourceFileName: string;
    pageStart: number;
    pageEnd: number;
    chunkIndex: number;
  };
}> {
  const allChunks: Array<{
    content: string;
    metadata: {
      sourceFileName: string;
      pageStart: number;
      pageEnd: number;
      chunkIndex: number;
    };
  }> = [];

  let chunkIdCounter = 0;

  for (const page of pages) {
    // Si la página es muy grande, la dividimos
    const chunks = splitIntoChunks(page.text);

    for (const content of chunks) {
      allChunks.push({
        content,
        metadata: {
          sourceFileName: metadata.sourceFileName,
          pageStart: page.pageNumber,
          pageEnd: page.pageNumber,
          chunkIndex: chunkIdCounter++,
        },
      });
    }
  }

  return allChunks;
}

/**
 * Procesa texto y lo divide en chunks con metadata (Legacy/Text content)
 */
export function processTextIntoChunks(
  text: string,
  metadata: {
    sourceFileName: string;
    pageStart: number;
    pageEnd: number;
  }
): Array<{
  content: string;
  metadata: {
    sourceFileName: string;
    pageStart: number;
    pageEnd: number;
    chunkIndex: number;
  };
}> {
  const chunks = splitIntoChunks(text);

  return chunks.map((content, index) => ({
    content,
    metadata: {
      ...metadata,
      chunkIndex: index,
    },
  }));
}

