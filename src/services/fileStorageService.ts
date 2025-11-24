import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'materials'; // Usamos el bucket 'materials' que ya existe

export interface StorageFile {
    path: string;
    url: string;
    originalName: string;
}

export const fileStorageService = {
    /**
     * Sube un archivo a Supabase Storage
     * @param file Archivo a subir
     * @param institutionId ID de la institución
     * @param documentId ID del documento (opcional, para organizar carpetas)
     */
    async uploadFile(
        file: File,
        institutionId: number,
        documentId?: string
    ): Promise<StorageFile> {
        try {
            // Crear una ruta organizada: institution_id/document_id/filename
            // Si no hay documentId, usar una carpeta 'uploads'
            const folder = documentId
                ? `${institutionId}/${documentId}`
                : `${institutionId}/uploads`;

            // Sanitize filename to avoid issues
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `${folder}/${sanitizedName}`;

            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) throw error;

            // Obtener URL pública por defecto (aunque usaremos firmadas para seguridad)
            const { data: publicUrlData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(filePath);

            return {
                path: filePath,
                url: publicUrlData.publicUrl,
                originalName: file.name
            };
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    },

    /**
     * Obtiene una URL firmada temporal para ver el archivo de forma segura
     * @param path Ruta del archivo en el bucket
     * @param expiresInSeconds Tiempo de expiración en segundos (default 60 min)
     */
    async getSecureUrl(path: string, expiresInSeconds: number = 3600): Promise<string | null> {
        try {
            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .createSignedUrl(path, expiresInSeconds);

            if (error) throw error;
            return data.signedUrl;
        } catch (error) {
            console.error('Error getting signed URL:', error);
            return null;
        }
    },

    /**
     * Elimina un archivo del storage
     * @param path Ruta del archivo
     */
    async deleteFile(path: string): Promise<void> {
        try {
            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([path]);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    },

    /**
     * Helper para obtener la ruta de almacenamiento desde una URL antigua si es posible
     * (Útil para migraciones si la estructura coincide, aunque para Drive no sirve)
     */
    getPathFromUrl(url: string): string | null {
        if (!url.includes(BUCKET_NAME)) return null;
        const parts = url.split(`${BUCKET_NAME}/`);
        return parts.length > 1 ? parts[1] : null;
    }
};
