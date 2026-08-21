import React, { useState, useRef } from 'react';
import { IconUpload, IconX, IconImage } from '@/components/Common/Icons';
import { uploadLandingImage, LandingImageSection } from '@/services/storageService';

interface ImageUploadProps {
  institutionId: number;
  section: LandingImageSection;
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  label?: string;
  className?: string;
  helperText?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  institutionId,
  section,
  currentImageUrl,
  onImageUploaded,
  label,
  className = '',
  helperText,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error
    setError(null);

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    try {
      setUploading(true);

      // Create local preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload
      const result = await uploadLandingImage(institutionId, file, { section });

      if (result.success && result.url) {
        onImageUploaded(result.url);
        setPreviewUrl(result.url); // Update with remote URL
      } else {
        setError(result.error || 'Error al subir la imagen');
        // Revert preview if upload failed
        setPreviewUrl(currentImageUrl || null);
      }
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Error inesperado al subir la imagen');
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setUploading(false);
      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}

      <div className="flex items-start gap-4">
        {/* Preview Area */}
        <div
          className={`
            relative flex-shrink-0 w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300
            flex items-center justify-center overflow-hidden group
            ${!previewUrl ? 'hover:border-blue-400 cursor-pointer' : ''}
          `}
          onClick={!previewUrl ? triggerFileInput : undefined}
        >
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                  className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  title="Eliminar imagen"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center p-2">
              <IconImage className="w-8 h-8 text-gray-400 mx-auto mb-1" />
              <span className="text-xs text-gray-500">Sin imagen</span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={uploading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2"
            >
              <IconUpload className="w-4 h-4" />
              {previewUrl ? 'Cambiar Imagen' : 'Subir Imagen'}
            </button>

            {previewUrl && (
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={uploading}
                className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                Eliminar
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {helperText && <p className="text-xs text-gray-500">{helperText}</p>}

          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
