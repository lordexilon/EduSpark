// services/storageService.ts
// Servicio para manejar la subida de archivos a Supabase Storage

import { supabase } from '../lib/supabase';
import {
  optimizeImage,
  shouldOptimizeInFrontend,
  ImageMimeType,
} from '../utils/imageOptimization';

const AVATAR_BUCKET = 'avatars';
const COURSE_MEDIA_BUCKET = 'course-media';
const COURSE_DOCUMENTS_BUCKET = 'course-documents';
const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_COURSE_FILE_SIZE = 35 * 1024 * 1024; // 35MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface UploadOptimizedImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: ImageMimeType;
  cacheSeconds?: number;
  forceOptimization?: boolean;
  signal?: AbortSignal;
  bucketName?: string;
}

/**
 * Verifica que el bucket de avatares existe
 * Nota: listBuckets() puede requerir permisos de admin, así que no lo usamos
 * En su lugar, asumimos que el bucket existe y dejamos que el upload falle con un error claro si no existe
 */
export const ensureAvatarBucket = async (): Promise<boolean> => {
  // No intentamos listar buckets porque puede requerir permisos de admin
  // El bucket debe existir y estar configurado correctamente
  // Si no existe, el error de upload será claro
  return true;
};

/**
 * Sube una imagen de avatar para un usuario
 */
export const uploadAvatar = async (
  userId: string,
  file: File
): Promise<UploadResult> => {
  try {
    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG o WebP.'
      };
    }

    // Validar tamaño
    if (file.size > MAX_AVATAR_FILE_SIZE) {
      return {
        success: false,
        error: 'El archivo es demasiado grande. El tamaño máximo es 5MB.'
      };
    }

    // Nota: No verificamos el bucket aquí porque listBuckets() requiere permisos de admin
    // El bucket debe existir y estar configurado. Si no existe, el upload fallará con un error claro

    let fileToUpload = file;
    let optimizationInfo = 'sin optimizar';

    try {
      if (shouldOptimizeInFrontend(file) || file.type !== 'image/webp') {
        const result = await optimizeImage(file, {
          maxWidth: 512,
          maxHeight: 512,
          quality: 0.75,
          format: 'image/webp',
          force: true,
        });
        fileToUpload = result.file;
        optimizationInfo = result.info;
      }
    } catch (optError) {
      if (optError instanceof DOMException && optError.name === 'AbortError') {
        return {
          success: false,
          error: 'La optimización de imagen fue cancelada.',
        };
      }
      console.warn('[uploadAvatar] No se pudo optimizar la imagen, se usará original', optError);
      fileToUpload = file;
      optimizationInfo = 'optimización fallida, usando original';
    }

    // Generar nombre único para el archivo basado en el tipo final
    const fileExt = MIME_TO_EXT[fileToUpload.type] || file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Subir archivo
    const { data, error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, fileToUpload, {
        cacheControl: '86400',
        upsert: true, // Permitir sobrescribir si existe (para actualizar avatar)
        contentType: fileToUpload.type,
      });

    if (uploadError) {
      console.error('Error subiendo avatar:', uploadError);
      
      // Mensajes de error más descriptivos
      let errorMessage = uploadError.message || 'Error al subir la imagen.';
      
      if (uploadError.message?.includes('Bucket not found') || 
          uploadError.message?.includes('does not exist') ||
          uploadError.message?.includes('No such bucket')) {
        errorMessage = 'El bucket de avatares no está configurado. Por favor, contacta al administrador para crear el bucket "avatars".';
      } else if (uploadError.message?.includes('row-level security') || 
                 uploadError.message?.includes('RLS') ||
                 uploadError.message?.includes('new row violates')) {
        errorMessage = 'Error de permisos. Verifica que el bucket "avatars" existe y las políticas RLS están configuradas correctamente.';
      } else if (uploadError.message?.includes('permission') || 
                 uploadError.message?.includes('403') ||
                 uploadError.message?.includes('Forbidden')) {
        errorMessage = 'No tienes permisos para subir archivos. Verifica que el bucket existe y las políticas RLS permiten subir avatares.';
      } else if (uploadError.message?.includes('folder') || 
                 uploadError.message?.includes('path')) {
        errorMessage = 'Error con la ruta del archivo. Asegúrate de que el archivo se sube en la carpeta correcta.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return {
        success: false,
        error: 'Error al obtener la URL de la imagen.'
      };
    }

    return {
      success: true,
      url: urlData.publicUrl,
      error: undefined,
    };
  } catch (error: any) {
    console.error('Error inesperado subiendo avatar:', error);
    return {
      success: false,
      error: error.message || 'Error inesperado al subir la imagen.'
    };
  }
};

/**
 * Sube una imagen optimizada al bucket general de cursos
 */
export const uploadCourseMedia = async (
  courseId: string,
  file: File,
  folder = 'general',
  options: UploadOptimizedImageOptions = {},
): Promise<UploadResult & { optimization?: string }> => {
  try {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG o WebP.',
      };
    }

    if (file.size > MAX_COURSE_FILE_SIZE) {
      return {
        success: false,
        error: 'El archivo es demasiado grande. El tamaño máximo es 35MB.',
      };
    }

    let fileToUpload = file;
    let optimizationMessage = 'Imagen no optimizada';

    try {
      const shouldForce = options.forceOptimization || shouldOptimizeInFrontend(file);

      if (shouldForce) {
        const result = await optimizeImage(file, {
          maxWidth: options.maxWidth ?? 1600,
          maxHeight: options.maxHeight ?? 1600,
          quality: options.quality ?? 0.8,
          format: options.format ?? 'image/webp',
          signal: options.signal,
          force: options.forceOptimization ?? false,
        });
        fileToUpload = result.file;
        optimizationMessage = result.info;
      }
    } catch (optError) {
      if (optError instanceof DOMException && optError.name === 'AbortError') {
        return {
          success: false,
          error: 'La optimización de imagen fue cancelada.',
        };
      }
      console.warn('[uploadCourseMedia] Falló optimización, usando original', optError);
      fileToUpload = file;
      optimizationMessage = 'No se pudo optimizar, se usa original';
    }

    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '');
    const basePath = `courses/${courseId}/${safeFolder}`.replace(/\/+/g, '/').replace(/\/$/, '');
    const fileExt = MIME_TO_EXT[fileToUpload.type] || file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `${basePath}/${fileName}`;
    const bucket = options.bucketName || COURSE_MEDIA_BUCKET;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileToUpload, {
        cacheControl: String(options.cacheSeconds ?? 31536000),
        contentType: fileToUpload.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error subiendo media del curso:', uploadError);

      let errorMessage = uploadError.message || 'Error al subir la imagen.';
      if (uploadError.message?.includes('Bucket not found')) {
        errorMessage = `El bucket "${bucket}" no existe. Solicita su creación en Supabase.`;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return {
        success: false,
        error: 'Error al obtener la URL de la imagen.',
      };
    }

    return {
      success: true,
      url: urlData.publicUrl,
      optimization: optimizationMessage,
    };
  } catch (error: any) {
    console.error('Error inesperado subiendo media del curso:', error);
    return {
      success: false,
      error: error.message || 'Error inesperado al subir la imagen.',
    };
  }
};

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
];

export interface UploadCourseDocumentOptions {
  folder?: string;
  cacheSeconds?: number;
  signal?: AbortSignal;
}

export const uploadCourseDocument = async (
  courseId: string,
  file: File,
  options: UploadCourseDocumentOptions = {},
): Promise<UploadResult & { path?: string; optimization?: string }> => {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return {
      success: false,
      error: 'Tipo de archivo no permitido. Solo se permiten PDF, documentos Office u OpenDocument.',
    };
  }

  if (file.size > MAX_COURSE_FILE_SIZE) {
    return {
      success: false,
      error: 'El archivo es demasiado grande. El tamaño máximo es 35MB.',
    };
  }

  try {
    const folder = options.folder ?? 'docs';
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '');
    const basePath = `courses/${courseId}/${safeFolder}`.replace(/\/+/g, '/').replace(/\/$/, '');
    const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `${basePath}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(COURSE_DOCUMENTS_BUCKET)
      .upload(filePath, file, {
        cacheControl: String(options.cacheSeconds ?? 31536000),
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error subiendo documento del curso:', uploadError);
      let errorMessage = uploadError.message || 'Error al subir el documento.';
      if (uploadError.message?.includes('Bucket not found')) {
        errorMessage = 'El bucket "course-documents" no existe. Solicita su creación en Supabase.';
      } else if (uploadError.message?.toLowerCase().includes('row-level security')) {
        errorMessage = 'No tienes permisos para subir documentos. Verifica las políticas RLS del bucket "course-documents".';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const { data: urlData } = supabase.storage
      .from(COURSE_DOCUMENTS_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return {
        success: false,
        error: 'Error al obtener la URL del documento.',
      };
    }

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      optimization: 'Documento subido (sin compresión)',
    };
  } catch (error: any) {
    console.error('Error inesperado subiendo documento del curso:', error);
    return {
      success: false,
      error: error.message || 'Error inesperado al subir el documento.',
    };
  }
};

/**
 * Elimina el avatar anterior de un usuario
 */
export const deleteAvatar = async (userId: string, filePath: string): Promise<boolean> => {
  try {
    // Si filePath es una URL completa, extraer solo el path relativo
    let fullPath: string;
    
    if (filePath.startsWith('http')) {
      // Es una URL completa, extraer el path después de /avatars/
      const urlParts = filePath.split('/avatars/');
      if (urlParts.length > 1) {
        fullPath = urlParts[1];
      } else {
        // Fallback: extraer solo el nombre del archivo
        const pathParts = filePath.split('/');
        const fileName = pathParts[pathParts.length - 1];
        fullPath = `${userId}/${fileName}`;
      }
    } else {
      // Es un path relativo, verificar si ya incluye el userId
      if (filePath.startsWith(`${userId}/`)) {
        fullPath = filePath;
      } else {
        // Solo es el nombre del archivo
        const pathParts = filePath.split('/');
        const fileName = pathParts[pathParts.length - 1];
        fullPath = `${userId}/${fileName}`;
      }
    }

    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([fullPath]);

    if (error) {
      console.error('Error eliminando avatar anterior:', error);
      // No fallar si el archivo no existe (puede que ya se haya eliminado)
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return true; // Considerar éxito si el archivo ya no existe
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error inesperado eliminando avatar:', error);
    // No fallar silenciosamente, pero no bloquear la subida de nuevo avatar
    return false;
  }
};

/**
 * Actualiza el avatar_url en la base de datos
 */
export const updateAvatarUrl = async (
  userId: string,
  avatarUrl: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (error) {
      console.error('Error actualizando avatar_url:', error);
      return {
        success: false,
        error: error.message || 'Error al actualizar el perfil.'
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error inesperado actualizando avatar_url:', error);
    return {
      success: false,
      error: error.message || 'Error inesperado al actualizar el perfil.'
    };
  }
};

