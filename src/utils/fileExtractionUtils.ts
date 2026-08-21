import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

// Configurar el worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Utilidad para extraer texto de diversos formatos de archivo
 */
export const fileExtractionService = {
  /**
   * Extrae texto de un archivo PDF
   */
  async extractFromPdf(file: File, maxPages: number = 50): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      const pagesToRead = Math.min(pdf.numPages, maxPages);
      for (let i = 1; i <= pagesToRead; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `[Página ${i}]\n${pageText}\n\n`;
      }

      if (pdf.numPages > pagesToRead) {
        fullText += `\n... (Texto truncado después de ${pagesToRead} páginas) ...`;
      }

      return fullText;
    } catch (error) {
      console.error('Error en extracción PDF:', error);
      throw new Error('No se pudo leer el PDF.');
    }
  },

  /**
   * Extrae texto de un archivo Word (.docx)
   */
  async extractFromDocx(file: File): Promise<string> {
    // Mammoth no está instalado en el entorno actual
    console.warn("Extracción Word solicitada pero 'mammoth' no está disponible.");
    throw new Error(
      "El soporte para archivos Word (.docx) requiere la librería 'mammoth'. Por favor, ejecuta 'npm install mammoth' para habilitar esta función."
    );
  },

  /**
   * Extrae texto de un archivo PowerPoint (.pptx)
   */
  async extractFromPptx(file: File): Promise<string> {
    // JSZip no está instalado en el entorno actual
    console.warn("Extracción PowerPoint solicitada pero 'jszip' no está disponible.");
    throw new Error(
      "El soporte para archivos PowerPoint (.pptx) requiere la librería 'jszip'. Por favor, ejecuta 'npm install jszip' para habilitar esta función."
    );
  },

  /**
   * Lee un archivo de texto plano (.txt, .md)
   */
  async extractFromText(file: File): Promise<string> {
    try {
      return await file.text();
    } catch (error) {
      console.error('Error leyendo archivo de texto:', error);
      throw new Error('No se pudo leer el archivo de texto.');
    }
  },

  /**
   * Detecta el tipo de archivo y extrae el texto
   */
  async extractText(file: File): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return this.extractFromPdf(file);
      case 'docx':
        return this.extractFromDocx(file);
      case 'pptx':
        return this.extractFromPptx(file);
      case 'txt':
      case 'md':
        return this.extractFromText(file);
      default:
        throw new Error('Formato de archivo no soportado.');
    }
  },
};
