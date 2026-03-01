// @ts-nocheck
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
import { downloadFileFromBucket } from './supabaseService';
import { createClient } from '@supabase/supabase-js';

let supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Inicializa cliente de Supabase
 */
function initializeSupabase() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar configurados');
  }

  supabaseClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

/**
 * Descarga un archivo desde Google Drive usando el token del usuario
 */
export async function downloadFileFromDrive(driveFileId: string, userId: string): Promise<Buffer> {
  const supabase = initializeSupabase();

  // Obtener token de Google Drive del usuario
  const { data: tokens, error: tokenError } = await supabase
    .from('user_google_tokens')
    .select('access_token, refresh_token, expires_at, service_type')
    .eq('user_id', userId)
    .in('service_type', ['drive', 'both'])
    .limit(1)
    .maybeSingle();

  if (tokenError || !tokens) {
    throw new Error(`No se encontró token de Google Drive para usuario ${userId}`);
  }

  let accessToken = tokens.access_token;

  // Verificar si el token está expirado y refrescarlo si es necesario
  if (tokens.expires_at) {
    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();

    if (expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
      // Token expirado o próximo a expirar, refrescar
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!googleClientId || !googleClientSecret || !tokens.refresh_token) {
        throw new Error('No se puede refrescar el token de Google Drive');
      }

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshResponse.ok) {
        const refreshed = await refreshResponse.json();
        accessToken = refreshed.access_token;

        // Actualizar token en Supabase
        await supabase
          .from('user_google_tokens')
          .update({
            access_token: refreshed.access_token,
            expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
          })
          .eq('user_id', userId)
          .eq('service_type', tokens.service_type);
      }
    }
  }

  // Descargar archivo de Google Drive
  const driveResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!driveResponse.ok) {
    throw new Error(`Error descargando de Google Drive: ${driveResponse.status}`);
  }

  const arrayBuffer = await driveResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Descarga un archivo completo (desde Supabase Storage o Google Drive)
 * @param fileIdOrPath - bucketPath para Supabase Storage o driveFileId para Google Drive
 * @param source - 'bucket' o 'google_drive'
 * @param userId - ID del usuario (requerido solo para Google Drive)
 */
export async function downloadFile(
  fileIdOrPath: string,
  source: 'bucket' | 'google_drive' = 'bucket',
  userId?: string
): Promise<Buffer> {
  if (source === 'google_drive') {
    if (!userId) {
      throw new Error('userId es requerido para descargar desde Google Drive');
    }
    return downloadFileFromDrive(fileIdOrPath, userId);
  } else {
    // Supabase Storage (comportamiento original)
    return downloadFileFromBucket(fileIdOrPath);
  }
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

