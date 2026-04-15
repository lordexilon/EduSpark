// components/CourseEditModal.tsx
// Modal para editar curso con funcionalidad mejorada para imágenes

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Course } from '@/services/teacherCourses';
import Card from "@/components/Common/Card";
import Button from "@/components/Common/Button";
import { uploadCourseMedia } from '@/services/storageService';
import { IconX, IconZoomIn, IconZoomOut, IconMaximize, IconMinimize } from '@/components/Common/Icons';

interface CourseEditModalProps {
  course: Course;
  onClose: () => void;
  onSave: (courseData: Partial<Course>) => Promise<void>;
}

export const CourseEditModal: React.FC<CourseEditModalProps> = ({
  course,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState(course.title);
  const [code, setCode] = useState(course.code || '');
  const [description, setDescription] = useState(course.description || '');
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>(course.status);
  const [startDate, setStartDate] = useState(course.start_date ? course.start_date.split('T')[0] : '');
  const [endDate, setEndDate] = useState(course.end_date ? course.end_date.split('T')[0] : '');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailUploadInfo, setThumbnailUploadInfo] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(100); // Porcentaje de zoom
  const [imageExpanded, setImageExpanded] = useState(false); // Vista expandida
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadAbortController = useRef<AbortController | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Cargar thumbnail_url si existe (puede estar en metadata o como campo directo)
    const thumbnail = (course as any).thumbnail_url || (course as any).cover_image_url || '';
    setThumbnailUrl(thumbnail);
  }, [course]);

  useEffect(() => {
    return () => {
      uploadAbortController.current?.abort();
    };
  }, []);

  const handleSelectThumbnailFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 10MB.');
      return;
    }

    try {
      uploadAbortController.current?.abort();
      const controller = new AbortController();
      uploadAbortController.current = controller;

      setUploadingThumbnail(true);
      setThumbnailUploadInfo('Optimizando y subiendo imagen...');

      const result = await uploadCourseMedia(String(course.id), file, 'course-thumbnails', {
        maxWidth: 2000,
        maxHeight: 2000,
        quality: 0.85,
        format: 'image/webp',
        signal: controller.signal,
      });

      if (!result.success || !result.url) {
        throw new Error(result.error || 'No se pudo subir la imagen.');
      }

      setThumbnailUrl(result.url);
      setThumbnailUploadInfo(result.optimization ?? 'Imagen subida correctamente');
      setImageZoom(100); // Resetear zoom al subir nueva imagen
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        setThumbnailUploadInfo('La subida fue cancelada.');
        return;
      }
      console.error('Error subiendo la imagen del curso:', error);
      setThumbnailUploadInfo(error?.message || 'Error al subir la imagen.');
      alert(error?.message || 'Error al subir la imagen. Inténtalo de nuevo.');
    } finally {
      setUploadingThumbnail(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveThumbnail = () => {
    if (confirm('¿Estás seguro de que quieres eliminar la imagen del curso?')) {
      setThumbnailUrl('');
      setImageZoom(100);
      setImageExpanded(false);
    }
  };

  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 25, 300)); // Máximo 300%
  };

  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 25, 50)); // Mínimo 50%
  };

  const handleResetZoom = () => {
    setImageZoom(100);
  };

  const handleToggleExpand = () => {
    setImageExpanded(!imageExpanded);
    if (!imageExpanded) {
      setImageZoom(100); // Resetear zoom al expandir
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('Por favor ingresa un título');
      return;
    }
    
    setLoading(true);

    try {
      const courseData: Partial<Course> = {
        title: title.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        status,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      // Agregar thumbnail_url si existe (puede que necesitemos actualizar el tipo Course)
      if (thumbnailUrl) {
        (courseData as any).thumbnail_url = thumbnailUrl;
      } else {
        (courseData as any).thumbnail_url = null;
      }
      
      await onSave(courseData);
      onClose();
    } catch (error: any) {
      console.error('Error guardando curso:', error);
      alert(error?.message || 'Error al guardar el curso. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className={`w-full ${imageExpanded ? 'max-w-6xl' : 'max-w-4xl'} max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Editar Curso
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              title="Cerrar"
            >
              <IconX className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Título del Curso *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Ej: Introducción a la Programación"
              />
            </div>

            {/* Código */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Código del Curso
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: PROG101"
              />
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe brevemente el contenido y objetivos del curso..."
              />
            </div>

            {/* Estado */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Estado del Curso
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'draft' | 'archived')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="archived">Archivado</option>
              </select>
            </div>

            {/* Fechas del Curso */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  id="start_date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Fin
                </label>
                <input
                  type="date"
                  id="end_date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Imagen del Curso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagen del Curso
              </label>
              
              {thumbnailUrl ? (
                <div className="space-y-3">
                  {/* Controles de zoom y expandir */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleZoomOut}
                      disabled={imageZoom <= 50}
                      title="Alejar"
                    >
                      <IconZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600 min-w-[60px] text-center">
                      {imageZoom}%
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleZoomIn}
                      disabled={imageZoom >= 300}
                      title="Acercar"
                    >
                      <IconZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleResetZoom}
                      title="Restablecer zoom"
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleToggleExpand}
                      title={imageExpanded ? "Contraer" : "Expandir"}
                    >
                      {imageExpanded ? <IconMinimize className="w-4 h-4" /> : <IconMaximize className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Vista de imagen con zoom */}
                  <div className={`border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100 ${imageExpanded ? 'p-4' : 'p-2'}`}>
                    <div className="flex items-center justify-center overflow-auto" style={{ maxHeight: imageExpanded ? '70vh' : '400px' }}>
                      <img
                        ref={imageRef}
                        src={thumbnailUrl}
                        alt="Imagen del curso"
                        className="transition-transform duration-200"
                        style={{
                          transform: `scale(${imageZoom / 100})`,
                          transformOrigin: 'center',
                          maxWidth: imageExpanded ? '100%' : '100%',
                          height: 'auto',
                        }}
                      />
                    </div>
                  </div>

                  {/* Botones de acción para imagen */}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSelectThumbnailFile}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingThumbnail}
                    >
                      {uploadingThumbnail ? 'Subiendo...' : 'Cambiar Imagen'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleRemoveThumbnail}
                    >
                      Eliminar Imagen
                    </Button>
                  </div>
                  
                  {thumbnailUploadInfo && (
                    <p className="text-sm text-gray-600">{thumbnailUploadInfo}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                    <p className="text-gray-500 mb-4">No hay imagen seleccionada</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSelectThumbnailFile}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingThumbnail}
                    >
                      {uploadingThumbnail ? 'Subiendo...' : 'Subir Imagen'}
                    </Button>
                  </div>
                  {thumbnailUploadInfo && (
                    <p className="text-sm text-gray-600">{thumbnailUploadInfo}</p>
                  )}
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || uploadingThumbnail}
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

