// =====================================================
// Hook para Contexto de Curso
// Gestión de información del curso y configuración
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { 
  getPedagogicalSettings, 
  getGradingScale, 
  getCourseImages,
  savePedagogicalSettings 
} from '../services/supabaseService';
import type { 
  PedagogicalSettings, 
  GradingScale, 
  CourseImage,
  CourseContext 
} from '../types/pedagogical';

// =====================================================
// Hook useCourseContext
// =====================================================

export const useCourseContext = (courseId: string) => {
  // Estados principales
  const [courseContext, setCourseContext] = useState<CourseContext | null>(null);
  const [pedagogicalSettings, setPedagogicalSettings] = useState<PedagogicalSettings | null>(null);
  const [gradingScale, setGradingScale] = useState<GradingScale | null>(null);
  const [images, setImages] = useState<CourseImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // Cargar Contexto del Curso
  // =====================================================

  const loadCourseContext = useCallback(async () => {
    if (!courseId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Cargar configuración pedagógica
      const pedagogicalResponse = await getPedagogicalSettings(courseId);
      if (pedagogicalResponse.success && pedagogicalResponse.data) {
        setPedagogicalSettings(pedagogicalResponse.data);
      }

      // Cargar escala de calificación
      const gradingResponse = await getGradingScale(courseId);
      if (gradingResponse.success && gradingResponse.data) {
        setGradingScale(gradingResponse.data);
      }

      // Cargar imágenes del curso
      const imagesResponse = await getCourseImages(courseId);
      if (imagesResponse.success && imagesResponse.data) {
        setImages(imagesResponse.data);
      }

      // Crear contexto completo del curso
      const context: CourseContext = {
        id: courseId,
        title: 'Curso', // Se obtendría de la base de datos
        code: 'CURSO-001',
        description: 'Descripción del curso',
        teacherId: pedagogicalResponse.data?.teacherId || 'unknown',
        teacherName: 'Profesor', // Se obtendría de la base de datos
        coverImageUrl: imagesResponse.data?.find(img => img.imageType === 'cover')?.imageUrl,
        bannerImageUrl: imagesResponse.data?.find(img => img.imageType === 'banner')?.imageUrl,
        pedagogicalSettings: pedagogicalResponse.data || getDefaultPedagogicalSettings(),
        gradingScale: gradingResponse.data || getDefaultGradingScale(),
        materials: [], // Se cargaría desde la base de datos
        images: imagesResponse.data || []
      };

      setCourseContext(context);

    } catch (error) {
      console.error('Error loading course context:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar el contexto del curso');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  // =====================================================
  // Gestión de Configuración Pedagógica
  // =====================================================

  const updatePedagogicalSettings = useCallback(async (
    newSettings: Partial<PedagogicalSettings>
  ): Promise<boolean> => {
    if (!pedagogicalSettings || !courseId) return false;

    try {
      setIsLoading(true);
      setError(null);

      const updatedSettings = {
        ...pedagogicalSettings,
        ...newSettings,
        courseId,
        teacherId: pedagogicalSettings.teacherId,
        updatedAt: new Date()
      };

      const response = await savePedagogicalSettings(updatedSettings);

      if (response.success && response.data) {
        setPedagogicalSettings(response.data);
        
        // Actualizar contexto del curso
        setCourseContext(prev => prev ? {
          ...prev,
          pedagogicalSettings: response.data!
        } : null);

        return true;
      } else {
        setError(response.error || 'Error al actualizar configuración');
        return false;
      }

    } catch (error) {
      console.error('Error updating pedagogical settings:', error);
      setError(error instanceof Error ? error.message : 'Error al actualizar configuración');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [pedagogicalSettings, courseId]);

  // =====================================================
  // Gestión de Imágenes
  // =====================================================

  const addCourseImage = useCallback(async (
    imageUrl: string,
    imageType: 'cover' | 'banner' | 'material' | 'content',
    fileSizeBytes: number,
    mimeType: string,
    altText?: string
  ): Promise<boolean> => {
    if (!courseId) return false;

    try {
      setIsLoading(true);
      setError(null);

      // Aquí se implementaría la lógica para subir la imagen
      // y guardarla en la base de datos
      console.log('Adding course image:', { imageUrl, imageType, fileSizeBytes, mimeType, altText });

      // Simular éxito por ahora
      const newImage: CourseImage = {
        id: Date.now().toString(),
        courseId,
        uploadedBy: 'current-user', // Se obtendría del contexto de autenticación
        imageUrl,
        imageType,
        fileSizeBytes,
        mimeType,
        altText,
        metadata: {},
        createdAt: new Date()
      };

      setImages(prev => [...prev, newImage]);

      // Actualizar contexto del curso
      setCourseContext(prev => prev ? {
        ...prev,
        images: [...prev.images, newImage],
        coverImageUrl: imageType === 'cover' ? imageUrl : prev.coverImageUrl,
        bannerImageUrl: imageType === 'banner' ? imageUrl : prev.bannerImageUrl
      } : null);

      return true;

    } catch (error) {
      console.error('Error adding course image:', error);
      setError(error instanceof Error ? error.message : 'Error al agregar imagen');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  const removeCourseImage = useCallback(async (imageId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Aquí se implementaría la lógica para eliminar la imagen
      console.log('Removing course image:', imageId);

      setImages(prev => prev.filter(img => img.id !== imageId));

      // Actualizar contexto del curso
      setCourseContext(prev => prev ? {
        ...prev,
        images: prev.images.filter(img => img.id !== imageId)
      } : null);

      return true;

    } catch (error) {
      console.error('Error removing course image:', error);
      setError(error instanceof Error ? error.message : 'Error al eliminar imagen');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // =====================================================
  // Utilidades
  // =====================================================

  const getImageByType = useCallback((imageType: 'cover' | 'banner' | 'material' | 'content') => {
    return images.find(img => img.imageType === imageType);
  }, [images]);

  const getImagesByType = useCallback((imageType: 'cover' | 'banner' | 'material' | 'content') => {
    return images.filter(img => img.imageType === imageType);
  }, [images]);

  const hasImages = useCallback(() => {
    return images.length > 0;
  }, [images]);

  const getImageCount = useCallback(() => {
    return images.length;
  }, [images]);

  // =====================================================
  // Efectos
  // =====================================================

  useEffect(() => {
    loadCourseContext();
  }, [loadCourseContext]);

  // =====================================================
  // API Pública
  // =====================================================

  return {
    // Estados principales
    courseContext,
    pedagogicalSettings,
    gradingScale,
    images,
    isLoading,
    error,

    // Funciones principales
    loadCourseContext,
    updatePedagogicalSettings,
    addCourseImage,
    removeCourseImage,

    // Utilidades
    getImageByType,
    getImagesByType,
    hasImages,
    getImageCount,

    // Estados de error
    hasError: !!error,
    clearError: () => setError(null)
  };
};

// =====================================================
// Configuraciones por Defecto
// =====================================================

const getDefaultPedagogicalSettings = (): PedagogicalSettings => ({
  id: 'default',
  courseId: '',
  teacherId: 'unknown',
  teachingStyle: 'constructivista',
  tonePreference: 'amigable',
  detailLevel: 'medio',
  useExamples: true,
  encourageQuestions: true,
  voiceName: 'Kore',
  voiceSpeed: 1.0,
  createdAt: new Date(),
  updatedAt: new Date()
});

const getDefaultGradingScale = (): GradingScale => ({
  id: 'default',
  courseId: '',
  teacherId: 'unknown',
  scaleType: 'numeric',
  minScore: 0,
  maxScore: 100,
  passingScore: 60,
  scaleDefinition: [
    { min: 90, max: 100, grade: 'A', label: 'Excelente', color: '#10B981' },
    { min: 80, max: 89, grade: 'B', label: 'Bueno', color: '#3B82F6' },
    { min: 70, max: 79, grade: 'C', label: 'Satisfactorio', color: '#F59E0B' },
    { min: 60, max: 69, grade: 'D', label: 'Aprobado', color: '#EF4444' },
    { min: 0, max: 59, grade: 'F', label: 'Reprobado', color: '#6B7280' }
  ],
  roundingRule: 'nearest',
  showPercentage: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
