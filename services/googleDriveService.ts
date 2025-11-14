// services/googleDriveService.ts
// Servicio para gestionar la carpeta de Google Drive del usuario

import { supabase } from '../lib/supabase';
import { googleOAuthService } from './googleOAuthService';

export interface DriveFolderInfo {
  id: string;
  name: string;
  url: string;
}

/**
 * Servicio para gestionar Google Drive del usuario
 */
export const googleDriveService = {
  /**
   * Crea o obtiene la carpeta de Drive del usuario
   */
  async createOrGetUserFolder(userId: string): Promise<DriveFolderInfo | null> {
    try {
      // Verificar si el usuario ya tiene una carpeta vinculada
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('google_drive_folder_id, google_drive_folder_name, google_drive_folder_url')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.error('Error obteniendo usuario:', userError);
        return null;
      }

      // Si ya tiene carpeta, retornar la información
      if (user?.google_drive_folder_id) {
        return {
          id: user.google_drive_folder_id,
          name: user.google_drive_folder_name || 'EduSpark',
          url: user.google_drive_folder_url || `https://drive.google.com/drive/folders/${user.google_drive_folder_id}`
        };
      }

      // Obtener token de acceso
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error('No hay token de acceso de Google Drive. Por favor, conecta tu cuenta primero.');
      }

      // Obtener información del usuario para el nombre de la carpeta
      const { data: userInfo } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', userId)
        .maybeSingle();

      const folderName = userInfo 
        ? `EduSpark - ${userInfo.first_name} ${userInfo.last_name}`
        : `EduSpark - Usuario ${userId.substring(0, 8)}`;

      // Crear carpeta en Drive
      const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });

      if (!folderResponse.ok) {
        const error = await folderResponse.json();
        throw new Error(`Error creando carpeta: ${error.error?.message || 'Error desconocido'}`);
      }

      const folder = await folderResponse.json();

      // Guardar información de la carpeta en la base de datos
      const folderUrl = `https://drive.google.com/drive/folders/${folder.id}`;
      const { error: updateError } = await supabase
        .from('users')
        .update({
          google_drive_folder_id: folder.id,
          google_drive_folder_name: folderName,
          google_drive_folder_url: folderUrl,
          google_drive_linked_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error guardando carpeta:', updateError);
        // No lanzar error, la carpeta ya se creó en Drive
      }

      return {
        id: folder.id,
        name: folderName,
        url: folderUrl,
      };
    } catch (error: any) {
      console.error('Error en createOrGetUserFolder:', error);
      throw error;
    }
  },

  /**
   * Obtiene información de la carpeta de Drive del usuario
   */
  async getUserFolder(userId: string): Promise<DriveFolderInfo | null> {
    const { data: user, error } = await supabase
      .from('users')
      .select('google_drive_folder_id, google_drive_folder_name, google_drive_folder_url')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user?.google_drive_folder_id) {
      return null;
    }

    return {
      id: user.google_drive_folder_id,
      name: user.google_drive_folder_name || 'EduSpark',
      url: user.google_drive_folder_url || `https://drive.google.com/drive/folders/${user.google_drive_folder_id}`,
    };
  },

  /**
   * Verifica si el usuario tiene Drive vinculado
   */
  async hasDriveLinked(userId: string): Promise<boolean> {
    const folder = await this.getUserFolder(userId);
    return folder !== null;
  },

  /**
   * Desvincula la carpeta de Drive del usuario
   */
  async unlinkDrive(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        google_drive_folder_id: null,
        google_drive_folder_name: null,
        google_drive_folder_url: null,
        google_drive_linked_at: null,
      })
      .eq('id', userId);

    if (error) throw error;
  },

  /**
   * Sube un archivo a la carpeta de Drive del usuario
   */
  async uploadFileToFolder(
    userId: string,
    file: File,
    folderId?: string
  ): Promise<{ id: string; name: string; url: string } | null> {
    try {
      // Obtener carpeta del usuario si no se proporciona
      let targetFolderId = folderId;
      if (!targetFolderId) {
        const folder = await this.createOrGetUserFolder(userId);
        if (!folder) {
          throw new Error('No se pudo obtener la carpeta de Drive');
        }
        targetFolderId = folder.id;
      }

      // Obtener token de acceso
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error('No hay token de acceso de Google Drive');
      }

      // Crear metadata del archivo
      const metadata = {
        name: file.name,
        parents: [targetFolderId],
      };

      // Crear FormData para subir el archivo
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      // Subir archivo
      const uploadResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: form,
        }
      );

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(`Error subiendo archivo: ${error.error?.message || 'Error desconocido'}`);
      }

      const uploadedFile = await uploadResponse.json();

      return {
        id: uploadedFile.id,
        name: uploadedFile.name,
        url: `https://drive.google.com/file/d/${uploadedFile.id}/view`,
      };
    } catch (error: any) {
      console.error('Error subiendo archivo:', error);
      throw error;
    }
  },
};

