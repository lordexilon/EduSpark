// services/googleDriveService.ts
// Servicio para gestionar la carpeta de Google Drive del usuario

import { supabase } from '@/lib/supabase';
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
   * Si el usuario se reconecta, busca primero la carpeta existente antes de crear una nueva
   */
  async createOrGetUserFolder(userId: string): Promise<DriveFolderInfo | null> {
    try {
      // Verificar si el usuario ya tiene una carpeta vinculada en la BD
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('google_drive_folder_id, google_drive_folder_name, google_drive_folder_url')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.error('Error obteniendo usuario:', userError);
        return null;
      }

      // Si ya tiene carpeta en la BD, verificar que todavía existe en Drive
      if (user?.google_drive_folder_id) {
        const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
        if (accessToken) {
          // Verificar que la carpeta todavía existe en Drive
          const folderInfo = await this.getFolderInfo(userId, user.google_drive_folder_id);
          if (folderInfo) {
            // La carpeta existe, retornarla
            return {
              id: user.google_drive_folder_id,
              name: user.google_drive_folder_name || folderInfo.name,
              url: user.google_drive_folder_url || folderInfo.url,
            };
          } else {
            // La carpeta ya no existe en Drive, limpiar la BD y buscar/crear una nueva
            console.warn(
              `⚠️ Carpeta ${user.google_drive_folder_id} ya no existe en Drive, buscando o creando nueva...`
            );
            await this.unlinkDrive(userId);
          }
        }
      }

      // Obtener token de acceso
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error(
          'No hay token de acceso de Google Drive. Por favor, conecta tu cuenta primero.'
        );
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

      // Buscar si ya existe una carpeta con ese nombre en Drive (para evitar duplicados)
      console.log(`🔍 Buscando carpeta existente: "${folderName}"...`);
      const searchQuery = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
      searchUrl.searchParams.set('q', searchQuery);
      searchUrl.searchParams.set('fields', 'files(id, name)');
      searchUrl.searchParams.set('pageSize', '10');
      searchUrl.searchParams.set('orderBy', 'modifiedTime desc');

      const searchResponse = await fetch(searchUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      let existingFolder: { id: string; name: string } | null = null;

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.files && searchData.files.length > 0) {
          // Encontrar la carpeta que coincida exactamente con el nombre
          existingFolder = searchData.files.find((f: any) => f.name === folderName);
          if (existingFolder) {
            console.log(
              `✅ Carpeta existente encontrada: "${folderName}" (ID: ${existingFolder.id})`
            );
          }
        }
      } else {
        console.warn('⚠️ No se pudo buscar carpetas existentes, continuando con creación...');
      }

      let folder: { id: string; name: string };

      if (existingFolder) {
        // Usar la carpeta existente
        folder = existingFolder;
        console.log(`✅ Reutilizando carpeta existente: ${folder.id}`);
      } else {
        // Crear nueva carpeta en Drive
        console.log(`📁 Creando nueva carpeta: "${folderName}"...`);
        const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
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

        folder = await folderResponse.json();
        console.log(`✅ Nueva carpeta creada: ${folder.id}`);
      }

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
        // No lanzar error, la carpeta ya existe o se creó en Drive
      } else {
        console.log(`✅ Carpeta vinculada en BD: ${folder.id}`);
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
      url:
        user.google_drive_folder_url ||
        `https://drive.google.com/drive/folders/${user.google_drive_folder_id}`,
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
   * Crea una nueva carpeta en Google Drive
   */
  async createFolder(
    userId: string,
    folderName: string,
    parentFolderId?: string
  ): Promise<{ id: string; name: string; url: string }> {
    try {
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error('No hay token de acceso de Google Drive');
      }

      // Si no se proporciona parentFolderId, usar la carpeta del usuario
      let targetParentId = parentFolderId;
      if (!targetParentId) {
        const folder = await this.getUserFolder(userId);
        if (!folder) {
          throw new Error('No se pudo obtener la carpeta de Drive del usuario');
        }
        targetParentId = folder.id;
      }

      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [targetParentId],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Error creando carpeta: ${error.error?.message || 'Error desconocido'}`);
      }

      const folder = await response.json();
      return {
        id: folder.id,
        name: folder.name,
        url: `https://drive.google.com/drive/folders/${folder.id}`,
      };
    } catch (error: any) {
      console.error('Error creando carpeta:', error);
      throw error;
    }
  },

  /**
   * Elimina un archivo o carpeta de Google Drive
   */
  async deleteFileOrFolder(userId: string, fileId: string): Promise<void> {
    try {
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error('No hay token de acceso de Google Drive');
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Error eliminando archivo/carpeta: ${error.error?.message || 'Error desconocido'}`
        );
      }
    } catch (error: any) {
      console.error('Error eliminando archivo/carpeta:', error);
      throw error;
    }
  },

  /**
   * Mueve un archivo o carpeta a otra carpeta
   */
  async moveFileOrFolder(
    userId: string,
    fileId: string,
    newParentFolderId: string,
    removeFromOldParents: boolean = true
  ): Promise<void> {
    try {
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error('No hay token de acceso de Google Drive');
      }

      // Primero obtener los padres actuales
      const getResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!getResponse.ok) {
        const error = await getResponse.json();
        throw new Error(
          `Error obteniendo información del archivo: ${error.error?.message || 'Error desconocido'}`
        );
      }

      const fileData = await getResponse.json();
      const previousParents = fileData.parents?.join(',') || '';

      // Mover el archivo
      const moveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParentFolderId}${removeFromOldParents ? `&removeParents=${previousParents}` : ''}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!moveResponse.ok) {
        const error = await moveResponse.json();
        throw new Error(
          `Error moviendo archivo/carpeta: ${error.error?.message || 'Error desconocido'}`
        );
      }
    } catch (error: any) {
      console.error('Error moviendo archivo/carpeta:', error);
      throw error;
    }
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
            Authorization: `Bearer ${accessToken}`,
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

  /**
   * Lista carpetas en una carpeta de Google Drive
   */
  async listFoldersInFolder(
    userId: string,
    folderId: string
  ): Promise<Array<{ id: string; name: string; modifiedTime: string }>> {
    try {
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error('No hay token de acceso de Google Drive');
      }

      const query = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      const folders: Array<{ id: string; name: string; modifiedTime: string }> = [];
      let pageToken: string | undefined;

      do {
        const url = new URL('https://www.googleapis.com/drive/v3/files');
        url.searchParams.set('q', query);
        url.searchParams.set('fields', 'nextPageToken, files(id, name, modifiedTime)');
        url.searchParams.set('pageSize', '100');
        url.searchParams.set('orderBy', 'name');
        if (pageToken) {
          url.searchParams.set('pageToken', pageToken);
        }

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(
            `Error listando carpetas: ${error.error?.message || 'Error desconocido'}`
          );
        }

        const data = await response.json();

        if (data.files) {
          folders.push(
            ...data.files.map((folder: any) => ({
              id: folder.id,
              name: folder.name,
              modifiedTime: folder.modifiedTime,
            }))
          );
        }

        pageToken = data.nextPageToken;
      } while (pageToken);

      return folders;
    } catch (error: any) {
      console.error('Error listando carpetas:', error);
      throw error;
    }
  },

  /**
   * Obtiene información de una carpeta específica
   */
  async getFolderInfo(
    userId: string,
    folderId: string
  ): Promise<{ id: string; name: string; url: string } | null> {
    try {
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error('No hay token de acceso de Google Drive');
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json();
        throw new Error(`Error obteniendo carpeta: ${error.error?.message || 'Error desconocido'}`);
      }

      const folder = await response.json();
      return {
        id: folder.id,
        name: folder.name,
        url: `https://drive.google.com/drive/folders/${folder.id}`,
      };
    } catch (error: any) {
      console.error('Error obteniendo información de carpeta:', error);
      throw error;
    }
  },

  /**
   * Lista archivos en una carpeta de Google Drive
   */
  async listFilesInFolder(
    userId: string,
    folderId: string,
    mimeTypes?: string[]
  ): Promise<
    Array<{ id: string; name: string; size: number; mimeType: string; modifiedTime: string }>
  > {
    try {
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error('No hay token de acceso de Google Drive');
      }

      // Construir query para filtrar por carpeta
      let query = `'${folderId}' in parents and trashed=false`;

      // Filtrar por tipos MIME si se especifican
      if (mimeTypes && mimeTypes.length > 0) {
        const mimeTypeFilters = mimeTypes.map((type) => `mimeType='${type}'`).join(' or ');
        query += ` and (${mimeTypeFilters})`;
      }

      const files: Array<{
        id: string;
        name: string;
        size: number;
        mimeType: string;
        modifiedTime: string;
      }> = [];
      let pageToken: string | undefined;

      do {
        const url = new URL('https://www.googleapis.com/drive/v3/files');
        url.searchParams.set('q', query);
        url.searchParams.set(
          'fields',
          'nextPageToken, files(id, name, size, mimeType, modifiedTime)'
        );
        url.searchParams.set('pageSize', '100');
        if (pageToken) {
          url.searchParams.set('pageToken', pageToken);
        }

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(
            `Error listando archivos: ${error.error?.message || 'Error desconocido'}`
          );
        }

        const data = await response.json();

        if (data.files) {
          files.push(
            ...data.files.map((file: any) => ({
              id: file.id,
              name: file.name,
              size: parseInt(file.size || '0', 10),
              mimeType: file.mimeType,
              modifiedTime: file.modifiedTime,
            }))
          );
        }

        pageToken = data.nextPageToken;
      } while (pageToken);

      return files;
    } catch (error: any) {
      console.error('Error listando archivos:', error);
      throw error;
    }
  },

  /**
   * Descarga un rango específico de bytes de un archivo (útil para archivos grandes)
   */
  async downloadFileRange(
    userId: string,
    fileId: string,
    startByte: number,
    endByte: number
  ): Promise<ArrayBuffer> {
    try {
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error('No hay token de acceso de Google Drive');
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Range: `bytes=${startByte}-${endByte}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: 'Error desconocido' } }));
        throw new Error(
          `Error descargando archivo: ${error.error?.message || 'Error desconocido'}`
        );
      }

      return await response.arrayBuffer();
    } catch (error: any) {
      console.error('Error descargando rango de archivo:', error);
      throw error;
    }
  },

  /**
   * Descarga un archivo completo desde Google Drive
   */
  async downloadFile(userId: string, fileId: string): Promise<ArrayBuffer> {
    try {
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error('No hay token de acceso de Google Drive');
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: 'Error desconocido' } }));
        throw new Error(
          `Error descargando archivo: ${error.error?.message || 'Error desconocido'}`
        );
      }

      return await response.arrayBuffer();
    } catch (error: any) {
      console.error('Error descargando archivo:', error);
      throw error;
    }
  },

  /**
   * Comparte un archivo de Google Drive con una lista de emails (estudiantes)
   * @param userId ID del usuario que comparte (debe ser el propietario o tener permisos)
   * @param fileId ID del archivo en Google Drive
   * @param emails Lista de emails de estudiantes
   * @param role Rol de acceso: 'reader' (solo lectura), 'commenter' (comentar), 'writer' (editar)
   * @returns Lista de emails que recibieron acceso exitosamente
   */
  async shareFileWithEmails(
    userId: string,
    fileId: string,
    emails: string[],
    role: 'reader' | 'commenter' | 'writer' = 'reader'
  ): Promise<{ success: string[]; failed: Array<{ email: string; error: string }> }> {
    try {
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error('No hay token de acceso de Google Drive');
      }

      const success: string[] = [];
      const failed: Array<{ email: string; error: string }> = [];

      // Si el rol es 'reader', aplicar restricciones de solo lectura
      if (role === 'reader') {
        try {
          const updateResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                // Restricciones para prevenir descarga e impresión
                copyRequiresWriterPermission: true, // Requiere permiso de escritor para copiar
                viewersCanCopyContent: false, // Los visualizadores no pueden copiar contenido
              }),
            }
          );

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text().catch(() => 'Error desconocido');
            console.warn(
              '⚠️ No se pudieron aplicar todas las restricciones al archivo:',
              errorText
            );
          } else {
            console.log('✅ Restricciones aplicadas al archivo (sin descarga/copia)');
          }
        } catch (updateError) {
          console.warn('⚠️ Error aplicando restricciones al archivo:', updateError);
          // Continuar con el compartir aunque falle la actualización de restricciones
        }
      }

      // Compartir con cada email
      for (const email of emails) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                role: role,
                type: 'user',
                emailAddress: email,
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: { message: 'Error desconocido' } }));
            const errorMessage = errorData.error?.message || 'Error desconocido';

            // Si el error es que el permiso ya existe, considerarlo como éxito
            if (
              errorMessage.includes('already exists') ||
              errorMessage.includes('Permission already exists')
            ) {
              success.push(email);
            } else {
              failed.push({ email, error: errorMessage });
            }
          } else {
            success.push(email);
          }
        } catch (error: any) {
          failed.push({ email, error: error.message || 'Error desconocido' });
        }
      }

      return { success, failed };
    } catch (error: any) {
      console.error('Error compartiendo archivo:', error);
      throw error;
    }
  },

  /**
   * Comparte un archivo de Google Drive con permisos de SOLO LECTURA (sin descarga ni impresión)
   * Esta función aplica todas las restricciones posibles para prevenir descarga e impresión
   * @param userId ID del usuario que comparte (debe ser el propietario)
   * @param fileId ID del archivo en Google Drive
   * @param emails Lista de emails de estudiantes
   * @returns Resultado con enlace de vista previa y lista de emails compartidos
   */
  // Aplicar restricciones de solo lectura a un archivo sin compartir con usuarios específicos
  async applyReadOnlyRestrictions(
    userId: string,
    fileId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error('No hay token de acceso de Google Drive');
      }

      console.log(`[GoogleDrive] Aplicando restricciones de solo lectura al archivo: ${fileId}`);

      // Aplicar restricciones al archivo para prevenir descarga e impresión
      const updateResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Restricciones máximas para solo lectura
          copyRequiresWriterPermission: true, // Requiere permiso de escritor para copiar
          viewersCanCopyContent: false, // Los visualizadores no pueden copiar contenido
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text().catch(() => 'Error desconocido');
        console.error('[GoogleDrive] ❌ Error aplicando restricciones al archivo:', errorText);
        return { success: false, error: errorText };
      }

      console.log('[GoogleDrive] ✅ Restricciones de solo lectura aplicadas exitosamente');
      return { success: true };
    } catch (error: any) {
      console.error('[GoogleDrive] ❌ Error aplicando restricciones:', error);
      return { success: false, error: error.message };
    }
  },

  async shareFileReadOnly(
    userId: string,
    fileId: string,
    emails: string[]
  ): Promise<{
    viewLink: string;
    success: string[];
    failed: Array<{ email: string; error: string }>;
  }> {
    try {
      const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
      if (!accessToken) {
        throw new Error('No hay token de acceso de Google Drive');
      }

      // 1. Aplicar restricciones al archivo para prevenir descarga e impresión
      try {
        const updateResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Restricciones máximas para solo lectura
            copyRequiresWriterPermission: true, // Requiere permiso de escritor para copiar
            viewersCanCopyContent: false, // Los visualizadores no pueden copiar contenido
          }),
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text().catch(() => 'Error desconocido');
          console.warn('⚠️ No se pudieron aplicar todas las restricciones al archivo:', errorText);
        } else {
          console.log('✅ Restricciones de solo lectura aplicadas al archivo');
        }
      } catch (updateError) {
        console.warn('⚠️ Error aplicando restricciones al archivo:', updateError);
        // Continuar con el compartir aunque falle la actualización de restricciones
      }

      // 2. Compartir con cada email como lector
      const success: string[] = [];
      const failed: Array<{ email: string; error: string }> = [];

      for (const email of emails) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                role: 'reader', // Solo lectura
                type: 'user',
                emailAddress: email,
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: { message: 'Error desconocido' } }));
            const errorMessage = errorData.error?.message || 'Error desconocido';

            // Si el error es que el permiso ya existe, considerarlo como éxito
            if (
              errorMessage.includes('already exists') ||
              errorMessage.includes('Permission already exists')
            ) {
              success.push(email);
            } else {
              failed.push({ email, error: errorMessage });
            }
          } else {
            success.push(email);
          }
        } catch (error: any) {
          failed.push({ email, error: error.message || 'Error desconocido' });
        }
      }

      // 3. Obtener el enlace de vista previa
      let viewLink = `https://drive.google.com/file/d/${fileId}/view`;
      try {
        const fileResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink,webContentLink`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          viewLink = fileData.webViewLink || viewLink;
        }
      } catch (error) {
        console.warn('⚠️ No se pudo obtener el enlace de vista previa, usando enlace por defecto');
      }

      return {
        viewLink,
        success,
        failed,
      };
    } catch (error: any) {
      console.error('Error compartiendo archivo en modo solo lectura:', error);
      throw error;
    }
  },
};
