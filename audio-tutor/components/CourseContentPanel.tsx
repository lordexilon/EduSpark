// =====================================================
// Panel de Contenido del Curso para Tutor Virtual
// Muestra información del curso y materiales disponibles
// =====================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase-shared';
import { IconBookOpen, IconFileText, IconVideo, IconImage, IconDownload, IconEye, IconChevronDown, IconChevronUp } from '../../components/Icons';

interface CourseMaterial {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'video' | 'image' | 'document';
  url?: string;
  metadata?: any;
  createdAt: string;
}

interface CourseContentPanelProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CourseContentPanel: React.FC<CourseContentPanelProps> = ({ 
  courseId, 
  isOpen, 
  onClose 
}) => {
  const [courseInfo, setCourseInfo] = useState<any>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['info']));

  useEffect(() => {
    if (isOpen && courseId) {
      loadCourseContent();
    }
  }, [isOpen, courseId]);

  const loadCourseContent = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Cargar información del curso
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, description, code, created_at')
        .eq('id', parseInt(courseId))
        .single();

      if (courseError) {
        throw new Error(`Error cargando curso: ${courseError.message}`);
      }

      setCourseInfo(courseData);

      // Cargar materiales del curso (simulado por ahora)
      // En una implementación real, esto vendría de una tabla de materiales
      const mockMaterials: CourseMaterial[] = [
        {
          id: '1',
          title: 'Introducción al Desarrollo Web',
          content: 'Conceptos básicos de HTML, CSS y JavaScript...',
          type: 'text',
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          title: 'Estructura de una Página Web',
          content: 'Cómo organizar el contenido y la estructura semántica...',
          type: 'text',
          createdAt: '2024-01-16'
        },
        {
          id: '3',
          title: 'Tutorial de HTML Básico',
          content: 'Video tutorial paso a paso...',
          type: 'video',
          url: 'https://example.com/video1',
          createdAt: '2024-01-17'
        }
      ];

      setMaterials(mockMaterials);

    } catch (err) {
      console.error('Error loading course content:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'video': return <IconVideo className="w-5 h-5" />;
      case 'image': return <IconImage className="w-5 h-5" />;
      case 'document': return <IconFileText className="w-5 h-5" />;
      default: return <IconBookOpen className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconBookOpen className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Contenido del Curso</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando contenido del curso...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 text-xl mb-2">⚠️</div>
              <p className="text-red-600 font-medium">Error cargando contenido</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Información del Curso */}
              <div className="bg-gray-50 rounded-lg p-4">
                <button
                  onClick={() => toggleSection('info')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <IconBookOpen className="w-5 h-5" />
                    Información del Curso
                  </h3>
                  {expandedSections.has('info') ? 
                    <IconChevronUp className="w-5 h-5" /> : 
                    <IconChevronDown className="w-5 h-5" />
                  }
                </button>
                
                {expandedSections.has('info') && courseInfo && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Título:</span>
                      <p className="text-gray-900">{courseInfo.title}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Código:</span>
                      <p className="text-gray-900">{courseInfo.code}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Descripción:</span>
                      <p className="text-gray-900">{courseInfo.description}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Creado:</span>
                      <p className="text-gray-900">{formatDate(courseInfo.created_at)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Materiales del Curso */}
              <div className="bg-gray-50 rounded-lg p-4">
                <button
                  onClick={() => toggleSection('materials')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <IconFileText className="w-5 h-5" />
                    Materiales del Curso ({materials.length})
                  </h3>
                  {expandedSections.has('materials') ? 
                    <IconChevronUp className="w-5 h-5" /> : 
                    <IconChevronDown className="w-5 h-5" />
                  }
                </button>
                
                {expandedSections.has('materials') && (
                  <div className="mt-4 space-y-3">
                    {materials.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        No hay materiales disponibles para este curso
                      </p>
                    ) : (
                      materials.map((material) => (
                        <div key={material.id} className="bg-white rounded-lg p-4 border">
                          <div className="flex items-start gap-3">
                            <div className="text-blue-600 mt-1">
                              {getMaterialIcon(material.type)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{material.title}</h4>
                              <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                                {material.content}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>{formatDate(material.createdAt)}</span>
                                <span className="capitalize">{material.type}</span>
                                {material.url && (
                                  <button className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                    <IconEye className="w-3 h-3" />
                                    Ver
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Información del RAG */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2 mb-3">
                  <IconBookOpen className="w-5 h-5" />
                  Conexión con Tutor Virtual
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>✅ El Tutor Virtual está conectado al contenido de este curso</p>
                  <p>✅ Utiliza los materiales para generar respuestas contextualizadas</p>
                  <p>✅ Considera el perfil del estudiante y configuración pedagógica</p>
                  <p>✅ Proporciona respuestas basadas en el contenido específico del curso</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
