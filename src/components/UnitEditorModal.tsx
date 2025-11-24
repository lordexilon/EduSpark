// components/UnitEditorModal.tsx
// Modal para crear/editar unidades con contenido rico

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CourseUnit } from '../services/teacherCourses';
import { RichTextEditor } from './RichTextEditor';
import Card from './Card';
import Button from './Button';
import { uploadCourseMedia } from '../services/storageService';

interface UnitEditorModalProps {
  unit: CourseUnit | null;
  courseId: number;
  onClose: () => void;
  onSave: (unit: Omit<CourseUnit, 'id' | 'created_at'>) => Promise<void>;
}

export const UnitEditorModal: React.FC<UnitEditorModalProps> = ({
  unit,
  courseId,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [durationHours, setDurationHours] = useState<number | undefined>();
  const [orderIndex, setOrderIndex] = useState<number | undefined>();
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailUploadInfo, setThumbnailUploadInfo] = useState<string | null>(null);
  const [contentUploadMessage, setContentUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadAbortController = useRef<AbortController | null>(null);
  const contentUploadAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (unit) {
      setTitle(unit.title);
      setDescription(unit.description || '');
      setContentHtml(unit.content_html || '');
      setContentMarkdown(unit.content_markdown || '');
      setLearningObjectives(unit.learning_objectives || []);
      setDurationHours(unit.duration_hours);
      setOrderIndex(unit.order_index || unit.number);
      setThumbnailUrl(unit.thumbnail_url || '');
    }
    setThumbnailUploadInfo(null);
    setContentUploadMessage(null);
  }, [unit]);

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      setLearningObjectives([...learningObjectives, newObjective.trim()]);
      setNewObjective('');
    }
  };

  const handleRemoveObjective = (index: number) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
  };

  const handleSelectThumbnailFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 5MB.');
      return;
    }

    try {
      uploadAbortController.current?.abort();
      const controller = new AbortController();
      uploadAbortController.current = controller;

      setUploadingThumbnail(true);
      setThumbnailUploadInfo('Optimizando y subiendo imagen...');

      const result = await uploadCourseMedia(String(courseId), file, 'unit-thumbnails', {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        format: 'image/webp',
        signal: controller.signal,
      });

      if (!result.success || !result.url) {
        throw new Error(result.error || 'No se pudo subir la imagen.');
      }

      setThumbnailUrl(result.url);
      setThumbnailUploadInfo(result.optimization ?? 'Imagen subida correctamente');
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        setThumbnailUploadInfo('La subida fue cancelada.');
        return;
      }
      console.error('Error subiendo la imagen de unidad:', error);
      setThumbnailUploadInfo(error?.message || 'Error al subir la imagen.');
      alert(error?.message || 'Error al subir la imagen. Inténtalo de nuevo.');
    } finally {
      setUploadingThumbnail(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    return () => {
      uploadAbortController.current?.abort();
      contentUploadAbortController.current?.abort();
    };
  }, []);

  const handleUploadEditorImage = useCallback(
    async (file: File) => {
      try {
        contentUploadAbortController.current?.abort();
        const controller = new AbortController();
        contentUploadAbortController.current = controller;
        setContentUploadMessage('Optimizando imagen...');

        const result = await uploadCourseMedia(String(courseId), file, 'unit-content', {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.8,
          format: 'image/webp',
          signal: controller.signal,
        });

        if (!result.success || !result.url) {
          throw new Error(result.error || 'No se pudo subir la imagen.');
        }

        setContentUploadMessage(result.optimization ?? 'Imagen subida correctamente');
        return result.url;
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          setContentUploadMessage('Subida de imagen cancelada.');
          throw error;
        }
        console.error('[UnitEditorModal] Error subiendo imagen del contenido:', error);
        setContentUploadMessage(error?.message || 'Error al subir la imagen.');
        throw error;
      }
    },
    [courseId],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('Por favor ingresa un título');
      return;
    }
    
    // Validar tamaño del contenido HTML (límite razonable: 1MB)
    const maxHtmlLength = 1000000; // 1MB
    if (contentHtml && contentHtml.length > maxHtmlLength) {
      alert(`El contenido HTML es demasiado grande (${(contentHtml.length / 1024).toFixed(0)}KB). Máximo permitido: ${(maxHtmlLength / 1024).toFixed(0)}KB`);
      return;
    }
    
    setLoading(true);

    try {
      const unitData = {
        course_id: courseId,
        number: unit?.number || 0,
        title: title.trim(),
        description: description?.trim() || undefined,
        content_html: contentHtml?.trim() || undefined,
        content_markdown: contentMarkdown?.trim() || undefined,
        learning_objectives: learningObjectives.length > 0 ? learningObjectives : undefined,
        duration_hours: durationHours,
        order_index: orderIndex || unit?.number || undefined,
        thumbnail_url: thumbnailUrl?.trim() || undefined
      };
      
      console.log('Guardando unidad:', {
        ...unitData,
        content_html_length: unitData.content_html?.length || 0
      });
      
      // Timeout de 30 segundos para operaciones largas
      const savePromise = onSave(unitData);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La operación tomó demasiado tiempo (30s)')), 30000)
      );
      
      await Promise.race([savePromise, timeoutPromise]);
      console.log('Unidad guardada exitosamente');
      // El modal se cierra desde handleSaveUnit después de actualizar el estado
    } catch (error: any) {
      console.error('❌ Error saving unit (catch):', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error stack:', error?.stack);
      
      let errorMessage = 'Error desconocido al guardar';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.toString && error.toString() !== '[object Object]') {
        errorMessage = error.toString();
      } else if (error?.supabaseError) {
        errorMessage = error.supabaseError.message || 'Error de Supabase';
      }
      
      alert(`Error al guardar la unidad: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {unit ? 'Editar Unidad' : 'Nueva Unidad'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div className="border-b pb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título de la Unidad *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Unidad 1: Introducción a..."
              />
            </div>

            {/* Descripción breve */}
            <div className="border-b pb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción breve
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Resumen corto de la unidad..."
              />
            </div>

            {/* Contenido rico */}
            <div className="border-b pb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contenido Didáctico *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Puedes agregar imágenes, videos, formato, listas, etc. Usa la barra de herramientas para formatear el texto.
              </p>
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <div style={{ minHeight: '500px' }}>
                  <RichTextEditor
                    value={contentHtml}
                    onChange={setContentHtml}
                    placeholder="Escribe el contenido didáctico de la unidad aquí..."
                    onUploadImage={handleUploadEditorImage}
                  />
                </div>
              </div>
                {contentUploadMessage && (
                  <p className="text-xs text-gray-500 mt-1">
                    {contentUploadMessage}
                  </p>
                )}
              {contentHtml && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Contenido ingresado ({Math.round(contentHtml.length / 1024)}KB)
                </p>
              )}
            </div>

            {/* Objetivos de aprendizaje */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objetivos de Aprendizaje
              </label>
              <div className="space-y-2 mb-2">
                {learningObjectives.map((obj, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                    <span className="flex-1">{obj}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveObjective(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddObjective())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Agregar objetivo..."
                />
                <Button type="button" onClick={handleAddObjective} variant="secondary">
                  Agregar
                </Button>
              </div>
            </div>

            {/* Campos adicionales */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración (horas)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={durationHours || ''}
                  onChange={(e) => setDurationHours(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orden
                </label>
                <input
                  type="number"
                  min="1"
                  value={orderIndex || ''}
                  onChange={(e) => setOrderIndex(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Imagen representativa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL de Imagen Representativa
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSelectThumbnailFile}
              />
              <div className="flex items-center gap-2 mb-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingThumbnail}
                >
                  {uploadingThumbnail ? 'Subiendo...' : 'Subir imagen'}
                </Button>
                <span className="text-xs text-gray-500">
                  JPG/PNG/WebP · máx. 5MB
                </span>
              </div>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
              {thumbnailUploadInfo && (
                <p className="text-xs text-gray-500 mt-1">
                  {thumbnailUploadInfo}
                </p>
              )}
              {thumbnailUrl && (
                <img src={thumbnailUrl} alt="Preview" className="mt-2 max-w-xs rounded border" onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }} />
              )}
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" onClick={onClose} variant="secondary" disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !title}>
                {loading ? 'Guardando...' : 'Guardar Unidad'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

