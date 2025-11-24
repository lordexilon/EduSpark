// workers/file-processing-worker/driveService.ts
// Servicio para descargar archivos de Google Drive

import { GoogleAuth } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';

let driveClient: drive_v3.Drive | null = null;

/**
 * Inicializa cliente de Google Drive
 */
function initializeDrive(): drive_v3.Drive {
  if (driveClient) return driveClient;

  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

/**
 * Descarga un archivo completo
 */
export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = initializeDrive();
  
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Descarga un rango específico de bytes (útil para archivos grandes)
 */
export async function downloadFileRange(
  fileId: string,
  startByte: number,
  endByte: number
): Promise<Buffer> {
  const drive = initializeDrive();
  
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    {
      responseType: 'arraybuffer',
      headers: {
        Range: `bytes=${startByte}-${endByte}`,
      },
    }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Obtiene metadata de un archivo
 */
export async function getFileMetadata(fileId: string): Promise<{
  id: string;
  name: string;
  size: number;
  mimeType: string;
}> {
  const drive = initializeDrive();
  
  const response = await drive.files.get({
    fileId,
    fields: 'id, name, size, mimeType',
  });

  return {
    id: response.data.id!,
    name: response.data.name!,
    size: parseInt(response.data.size || '0', 10),
    mimeType: response.data.mimeType!,
  };
}

