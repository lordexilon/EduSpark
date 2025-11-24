// functions/analyzeFile/index.ts
// Cloud Function para analizar archivos antes de procesarlos

import { onRequest } from 'firebase-functions/v2/https';
// Importación dinámica de googleapis para evitar timeout en deployment
// import { google } from 'googleapis'; // Movido a importación dinámica
import { requireAuth } from './auth';

interface AnalyzeFileRequest {
  fileId: string;
  fileName: string;
  userId?: string;
  googleDriveAccessToken?: string; // Token de acceso de Google Drive del usuario
}

interface AnalyzeFileResponse {
  success: boolean;
  analysis?: {
    fileId: string;
    fileName: string;
    fileSize: number;
    totalPages: number;
    pdfType: 'text' | 'scanned' | 'unknown';
    requiresOCR: boolean;
    estimatedCosts: {
      ocr: number;
      embeddings: number;
      cloudRun: number;
      firestore: number;
      total: number;
    };
    processingTime: {
      estimatedMinutes: number;
      estimatedHours: number;
    };
  };
  error?: string;
}

/**
 * Detecta el tipo de PDF (texto vs escaneado)
 */
async function detectPdfType(pdfBuffer: Buffer): Promise<'text' | 'scanned' | 'unknown'> {
  try {
    // Importación dinámica para evitar timeout en deployment
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(pdfBuffer);
    const textLength = data.text.length;
    const pdfSize = pdfBuffer.length;
    
    // Si el texto extraído es menos del 10% del tamaño del PDF, probablemente es escaneado
    const textRatio = textLength / pdfSize;
    
    if (textRatio < 0.1 && textLength < 100) {
      return 'scanned';
    } else if (textLength > 100) {
      return 'text';
    }
    
    return 'unknown';
  } catch (error) {
    console.error('Error detectando tipo de PDF:', error);
    return 'unknown';
  }
}

/**
 * Cuenta las páginas de un PDF
 */
async function countPdfPages(pdfBuffer: Buffer): Promise<number> {
  try {
    // Importación dinámica para evitar timeout en deployment
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error('Error contando páginas:', error);
    // Fallback: intentar con pdf-parse
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(pdfBuffer);
      return data.numpages || 0;
    } catch (e) {
      console.error('Error en fallback de conteo:', e);
      return 0;
    }
  }
}

/**
 * Calcula costos estimados
 */
function calculateCosts(
  totalPages: number,
  pdfType: 'text' | 'scanned' | 'unknown',
  chunkSize: number = 60 // Optimizado: aumentado de 25 a 60 para reducir costos
): {
  ocr: number;
  embeddings: number;
  cloudRun: number;
  firestore: number;
  total: number;
} {
  // OCR
  let ocrCost = 0;
  if (pdfType === 'scanned') {
    if (totalPages <= 1000) {
      ocrCost = (totalPages / 1000) * 1.50;
    } else {
      ocrCost = 1.50 + ((totalPages - 1000) / 1000) * 0.60;
    }
  }
  
  // Embeddings
  const avgCharsPerPage = 500;
  const totalChars = totalPages * avgCharsPerPage;
  const embeddingsCost = (totalChars / 1000) * 0.0001;
  
  // Cloud Run (optimizado: 2 vCPU, 4GB memoria)
  const chunks = Math.ceil(totalPages / chunkSize);
  const secondsPerChunk = 2 * 60; // 2 minutos por chunk
  const cpuCost = chunks * secondsPerChunk * 2 * 0.00002400; // 2 vCPU (reducido de 4)
  const memoryCost = chunks * secondsPerChunk * 4 * 0.00000250; // 4GB (reducido de 8GB)
  const cloudRunCost = cpuCost + memoryCost;
  
  // Firestore
  const writes = totalPages + chunks;
  const reads = chunks * 2;
  const firestoreCost = (writes / 100000) * 0.18 + (reads / 100000) * 0.06;
  
  const total = ocrCost + embeddingsCost + cloudRunCost + firestoreCost;
  
  return {
    ocr: parseFloat(ocrCost.toFixed(4)),
    embeddings: parseFloat(embeddingsCost.toFixed(4)),
    cloudRun: parseFloat(cloudRunCost.toFixed(4)),
    firestore: parseFloat(firestoreCost.toFixed(4)),
    total: parseFloat(total.toFixed(4)),
  };
}

/**
 * Cloud Function: Analizar archivo
 */
export const analyzeFile = onRequest(
  {
    memory: '2GiB', // Aumentar memoria a 2 GiB para evitar exceder límite
    timeoutSeconds: 540, // 9 minutos
    maxInstances: 10,
    cpu: 1,
  },
  async (req, res) => {
    // CORS - Configurar headers antes de cualquier otra operación
    const origin = req.headers.origin || '*';
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Max-Age', '3600');

    // Manejar preflight OPTIONS
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // Verificar autenticación
    const user = await requireAuth(req, res);
    if (!user) {
      return; // requireAuth ya envió la respuesta de error
    }

    try {
      const { fileId, fileName, googleDriveAccessToken }: AnalyzeFileRequest = req.body;

      if (!fileId || !fileName) {
        res.status(400).json({
          success: false,
          error: 'fileId y fileName son requeridos',
        });
        return;
      }

      if (!googleDriveAccessToken) {
        res.status(400).json({
          success: false,
          error: 'Token de acceso de Google Drive requerido. Por favor, conecta tu cuenta de Google Drive.',
        });
        return;
      }

      // Usar el token de acceso del usuario en lugar del Service Account
      // Crear un cliente OAuth2 con el token del usuario (importación dinámica para evitar timeout)
      const { OAuth2Client } = await import('google-auth-library');
      
      // Obtener credenciales de la aplicación desde variables de entorno
      const clientId = process.env.GOOGLE_CLIENT_ID || '';
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
      
      // Debug: Log de variables (sin mostrar el secret completo)
      console.log('GOOGLE_CLIENT_ID configurado:', clientId ? `${clientId.substring(0, 20)}...` : 'NO CONFIGURADO');
      console.log('GOOGLE_CLIENT_SECRET configurado:', clientSecret ? `${clientSecret.substring(0, 10)}...` : 'NO CONFIGURADO');
      
      // Verificar que las credenciales estén configuradas
      if (!clientId || !clientSecret) {
        console.error('GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no están configurados');
        console.error('Variables disponibles:', Object.keys(process.env).filter(k => k.includes('GOOGLE')));
        res.status(500).json({
          success: false,
          error: 'Configuración de Google OAuth incompleta en el servidor',
        });
        return;
      }
      
      // Crear cliente OAuth2 con las credenciales de la aplicación
      const oauth2Client = new OAuth2Client(clientId, clientSecret);
      
      // Configurar el token de acceso del usuario
      // Esto hará que el cliente use el token en el header Authorization, no como API key
      oauth2Client.setCredentials({
        access_token: googleDriveAccessToken,
      });
      
      // Crear cliente de Drive API con autenticación OAuth2
      // El cliente OAuth2 manejará automáticamente el header Authorization
      // Importación dinámica de googleapis para evitar timeout
      const { google } = await import('googleapis');
      const drive = google.drive({ 
        version: 'v3', 
        auth: oauth2Client
      });

      // Obtener metadata del archivo
      const fileMetadata = await drive.files.get({
        fileId,
        fields: 'id, name, size, mimeType',
      });

      const fileSize = parseInt((fileMetadata.data as any).size || '0', 10);
      const mimeType = (fileMetadata.data as any).mimeType || '';
      const isImage = mimeType.startsWith('image/');

      let totalPages = 0;
      let pdfType: 'text' | 'scanned' | 'unknown' = 'unknown';
      let requiresOCR = false;

      if (isImage) {
        // Para imágenes, tratarlas como 1 "página" equivalente
        // Las imágenes siempre requieren OCR para extraer texto
        totalPages = 1;
        pdfType = 'scanned'; // Las imágenes se tratan como escaneadas
        requiresOCR = true;
      } else {
        // Para PDFs, usar la lógica existente
        // Descargar primeras páginas para análisis (máximo 10 páginas o 5MB)
        const maxBytes = Math.min(5 * 1024 * 1024, fileSize);
        let pdfBuffer: Buffer;

        if (fileSize > maxBytes) {
          // Descargar solo una porción del archivo
          const response = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'arraybuffer' }
          );
          pdfBuffer = Buffer.from(response.data as ArrayBuffer);
          // Limitar a los primeros bytes
          pdfBuffer = pdfBuffer.slice(0, maxBytes);
        } else {
          // Descargar archivo completo
          const response = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'arraybuffer' }
          );
          pdfBuffer = Buffer.from(response.data as ArrayBuffer);
        }

        // Detectar tipo y contar páginas
        pdfType = await detectPdfType(pdfBuffer);
        
        // OPTIMIZACIÓN: Para contar páginas, evitar descargar archivo completo si es muy grande
        // Esto reduce significativamente el uso de memoria
        try {
          // Si el archivo es pequeño (menos de 5MB), ya lo tenemos en memoria
          if (fileSize <= maxBytes) {
            // Usar el buffer que ya tenemos
            totalPages = await countPdfPages(pdfBuffer);
          } else {
            // Para archivos grandes, intentar obtener número de páginas del buffer parcial
            // pdf-parse puede extraer metadata del PDF sin cargar todo en memoria
            try {
              const pdfParse = (await import('pdf-parse')).default;
              const data = await pdfParse(pdfBuffer);
              // Si pdf-parse puede obtener el número de páginas del buffer parcial, usarlo
              if (data.numpages && data.numpages > 0) {
                totalPages = data.numpages;
              } else {
                // Si no se puede obtener del buffer parcial, estimar basado en tamaño
                // Asumiendo ~1.7MB por página promedio para PDFs escaneados
                // o ~200KB por página para PDFs de texto
                const avgPageSize = pdfType === 'scanned' ? 1.7 * 1024 * 1024 : 200 * 1024;
                totalPages = Math.ceil(fileSize / avgPageSize);
              }
            } catch (parseError) {
              console.warn('No se pudo contar páginas del buffer parcial, usando estimación:', parseError);
              // Estimación basada en tamaño
              const avgPageSize = pdfType === 'scanned' ? 1.7 * 1024 * 1024 : 200 * 1024;
              totalPages = Math.ceil(fileSize / avgPageSize);
            }
          }
        } catch (error) {
          console.error('Error obteniendo páginas totales:', error);
          // Estimación basada en tamaño (asumiendo ~1.7MB por página promedio para escaneados)
          const avgPageSize = pdfType === 'scanned' ? 1.7 * 1024 * 1024 : 200 * 1024;
          totalPages = Math.ceil(fileSize / avgPageSize);
        }

        requiresOCR = pdfType === 'scanned';
      }

      // Calcular costos (usando chunkSize optimizado de 60)
      const estimatedCosts = calculateCosts(totalPages, pdfType, 60);
      const chunks = Math.ceil(totalPages / 60); // Usar chunkSize optimizado
      const estimatedMinutes = chunks * 2;
      const estimatedHours = estimatedMinutes / 60;

      const analysis: AnalyzeFileResponse['analysis'] = {
        fileId,
        fileName,
        fileSize,
        totalPages,
        pdfType,
        requiresOCR,
        estimatedCosts,
        processingTime: {
          estimatedMinutes,
          estimatedHours: parseFloat(estimatedHours.toFixed(2)),
        },
      };

      res.status(200).json({
        success: true,
        analysis,
      });
    } catch (error: any) {
      console.error('Error analizando archivo:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        response: error.response?.data,
        stack: error.stack?.substring(0, 500),
      });
      
      // Proporcionar mensajes de error más específicos
      let errorMessage = 'Error interno del servidor';
      if (error.message?.includes('API key not valid')) {
        errorMessage = 'Error de autenticación con Google Drive. Por favor, verifica tu conexión a Google Drive.';
      } else if (error.message?.includes('File not found')) {
        errorMessage = 'Archivo no encontrado en Google Drive. Verifica que el archivo exista y que tengas permisos para accederlo.';
      } else if (error.message?.includes('API has not been used')) {
        errorMessage = 'La API de Google Drive no está habilitada. Por favor, habilítala en Google Cloud Console.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }
);

