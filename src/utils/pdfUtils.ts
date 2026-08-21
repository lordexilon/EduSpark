import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js para Vite
// Usamos la importación con ?url para que Vite lo trate como un asset estático
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extrae todo el texto de un archivo PDF
 */
export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // Limitar número de páginas para evitar colgar el navegador en archivos enormes
    // 50 páginas suele ser suficiente para sacar temas, o podemos leer todo si es necesario
    const maxPages = Math.min(pdf.numPages, 50);

    for (let i = 1; i <= maxPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');

        fullText += `Página ${i}:\n${pageText}\n\n`;
      } catch (pageError) {
        console.warn(`Error leyendo página ${i}:`, pageError);
        fullText += `[Error leyendo página ${i}]\n\n`;
      }
    }

    if (pdf.numPages > maxPages) {
      fullText += `\n... (Texto truncado después de ${maxPages} páginas para optimización) ...`;
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(
      'No se pudo leer el texto del PDF. Asegúrate de que no esté protegido con contraseña o dañado.'
    );
  }
};
