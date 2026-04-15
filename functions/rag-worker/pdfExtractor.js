/**
 * Extractor de texto página por página para PDFs grandes
 * Evita el error "Invalid string length" procesando página por página
 */

const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');

/**
 * Extrae texto de un PDF página por página
 * @param {Buffer} pdfBuffer - Buffer del PDF completo
 * @returns {Promise<{text: string, numpages: number}>} - Texto completo y número de páginas
 */
async function extractTextPageByPage(pdfBuffer) {
    console.log('[PDF Extractor] 📄 Iniciando extracción página por página...');

    try {
        // Cargar el PDF con pdf-lib
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const totalPages = pdfDoc.getPageCount();

        console.log(`[PDF Extractor] 📄 PDF tiene ${totalPages} páginas`);

        const pageTexts = [];

        // Procesar página por página
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            try {
                // Crear un nuevo PDF con solo esta página
                const singlePagePdf = await PDFDocument.create();
                const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum - 1]);
                singlePagePdf.addPage(copiedPage);

                // Convertir a buffer
                const singlePageBytes = await singlePagePdf.save();
                const singlePageBuffer = Buffer.from(singlePageBytes);

                // Extraer texto de esta página
                const pageData = await pdfParse(singlePageBuffer);
                const pageText = pageData.text.trim();

                if (pageText.length > 0) {
                    pageTexts.push(pageText);
                }

                // Log de progreso cada 50 páginas
                if (pageNum % 50 === 0) {
                    console.log(`[PDF Extractor]   ✓ Procesadas ${pageNum}/${totalPages} páginas`);
                }
            } catch (pageError) {
                console.error(`[PDF Extractor] ⚠️ Error en página ${pageNum}:`, pageError.message);
                // Continuar con la siguiente página
                pageTexts.push(`[Error en página ${pageNum}]`);
            }
        }

        const fullText = pageTexts.join('\n\n');
        console.log(`[PDF Extractor] ✅ Extracción completada: ${pageTexts.length} páginas con texto`);
        console.log(`[PDF Extractor] ✅ Texto total: ${fullText.length} caracteres`);

        return {
            text: fullText,
            numpages: totalPages
        };

    } catch (error) {
        console.error('[PDF Extractor] ❌ Error en extracción página por página:', error);
        throw error;
    }
}

module.exports = { extractTextPageByPage };
