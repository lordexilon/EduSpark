// functions/rag-worker/pdfSplitter.js
// Módulo para dividir PDFs grandes en partes manejables

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Divide un PDF grande en múltiples partes
 * @param {Buffer} pdfBuffer - Buffer del PDF completo
 * @param {number} pagesPerPart - Páginas por parte (default: 100)
 * @returns {Promise<Array<{buffer: Buffer, startPage: number, endPage: number, pageCount: number, partNumber: number}>>}
 */
async function splitPDF(pdfBuffer, pagesPerPart = 100) {
  console.log(`[PDFSplitter] 📄 Iniciando división de PDF (${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB)`);
  
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();
    
    console.log(`[PDFSplitter] 📊 Total de páginas: ${totalPages}`);
    
    // Si el PDF tiene menos páginas que el tamaño de parte, no dividir
    if (totalPages <= pagesPerPart) {
      console.log(`[PDFSplitter] ℹ️ PDF tiene ${totalPages} páginas, no requiere división (límite: ${pagesPerPart})`);
      return [{
        buffer: pdfBuffer,
        startPage: 1,
        endPage: totalPages,
        pageCount: totalPages,
        partNumber: 1
      }];
    }
    
    const parts = [];
    
    for (let i = 0; i < totalPages; i += pagesPerPart) {
      const startPage = i;
      const endPage = Math.min(i + pagesPerPart - 1, totalPages - 1);
      const pageCount = endPage - startPage + 1;
      
      console.log(`[PDFSplitter] ✂️ Creando parte ${parts.length + 1}: páginas ${startPage + 1}-${endPage + 1} (${pageCount} páginas)`);
      
      // Crear nuevo documento para esta parte
      const partDoc = await PDFDocument.create();
      
      // Copiar páginas
      const pageIndices = Array.from({ length: pageCount }, (_, j) => startPage + j);
      const copiedPages = await partDoc.copyPages(pdfDoc, pageIndices);
      
      copiedPages.forEach(page => partDoc.addPage(page));
      
      // Guardar como buffer
      const partBytes = await partDoc.save();
      
      parts.push({
        buffer: Buffer.from(partBytes),
        startPage: startPage + 1,
        endPage: endPage + 1,
        pageCount: pageCount,
        partNumber: parts.length + 1
      });
      
      console.log(`[PDFSplitter] ✅ Parte ${parts.length} creada: ${(partBytes.length / 1024 / 1024).toFixed(2)}MB`);
    }
    
    console.log(`[PDFSplitter] 🎉 División completada: ${parts.length} partes creadas`);
    
    return parts;
  } catch (error) {
    console.error(`[PDFSplitter] ❌ Error dividiendo PDF:`, error);
    throw new Error(`Error dividiendo PDF: ${error.message}`);
  }
}

/**
 * Guarda las partes del PDF en archivos temporales
 * @param {Array} parts - Partes del PDF
 * @param {string} baseFileName - Nombre base del archivo
 * @returns {Promise<Array<string>>} - Rutas de los archivos temporales
 */
async function savePartsToTemp(parts, baseFileName) {
  const tempDir = os.tmpdir();
  const filePaths = [];
  
  console.log(`[PDFSplitter] 💾 Guardando ${parts.length} partes en directorio temporal: ${tempDir}`);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // Sanitizar nombre de archivo (eliminar caracteres especiales)
    const sanitizedFileName = baseFileName.replace(/[^a-z0-9_\-\.]/gi, '_');
    const fileName = `${sanitizedFileName}_part${i + 1}_of_${parts.length}.pdf`;
    const filePath = path.join(tempDir, fileName);
    
    await fs.writeFile(filePath, part.buffer);
    filePaths.push(filePath);
    
    console.log(`[PDFSplitter] ✅ Parte ${i + 1} guardada en: ${filePath}`);
  }
  
  return filePaths;
}

/**
 * Limpia archivos temporales
 * @param {Array<string>} filePaths - Rutas de los archivos a eliminar
 */
async function cleanupTempFiles(filePaths) {
  console.log(`[PDFSplitter] 🧹 Limpiando ${filePaths.length} archivos temporales`);
  
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
      console.log(`[PDFSplitter] ✅ Archivo eliminado: ${filePath}`);
    } catch (error) {
      console.warn(`[PDFSplitter] ⚠️ No se pudo eliminar archivo temporal: ${filePath}`, error.message);
    }
  }
}

module.exports = {
  splitPDF,
  savePartsToTemp,
  cleanupTempFiles
};

