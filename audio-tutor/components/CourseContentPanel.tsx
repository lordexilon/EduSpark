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
  filterMaterialId?: string;
  moduleId?: string;
}

export const CourseContentPanel: React.FC<CourseContentPanelProps> = ({ 
  courseId, 
  isOpen, 
  onClose,
  filterMaterialId,
  moduleId
}) => {
  const [courseInfo, setCourseInfo] = useState<any>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['info', 'materials']));

  useEffect(() => {
    if (!isOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);

    loadCourseContent();

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, courseId, moduleId]);

  const loadCourseContent = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, description, code, created_at')
        .eq('id', parseInt(courseId, 10))
        .single();
      if (courseError) throw new Error(`Error cargando curso: ${courseError.message}`);
      setCourseInfo(courseData);

      // Cargar materiales SIN filtro de módulo (evita 400 si columna no existe)
      const { data: mats, error: matsErr } = await supabase
        .from('course_materials')
        .select('id, title, content, type, file_url, source_url, created_at')
        .eq('course_id', parseInt(courseId, 10))
        .order('created_at', { ascending: true });
      if (matsErr) throw new Error(`Error cargando materiales: ${matsErr.message}`);

      // Filtrar por módulo en memoria sólo si el campo existe en la tabla (no seleccionado aquí)
      let filtered: any[] = mats || [];
      if (moduleId) {
        const mid = parseInt(moduleId, 10);
        filtered = filtered.filter((m: any) => Number(m.module_id) === mid);
      }

      const normalized: CourseMaterial[] = filtered.map((m: any) => ({
        id: String(m.id),
        title: m.title,
        content: m.content || '',
        type: (m.type || 'text') as CourseMaterial['type'],
        url: m.file_url || m.source_url || undefined,
        createdAt: m.created_at || new Date().toISOString()
      }));
      setMaterials(normalized);

      if (filterMaterialId) {
        setTimeout(() => {
          const el = document.getElementById(`mat-${filterMaterialId}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }

    } catch (err) {
      console.error('Error loading course content:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) newExpanded.delete(sectionId); else newExpanded.add(sectionId);
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

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden" onClick={(e)=>e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Contenido del Curso</h2>
            <button onClick={onClose} className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100" title="Cerrar" aria-label="Cerrar panel de contenido">✕</button>
          </div>
        </div>
        {/* Alto fijo para que aparezca la barra interna de scroll */}
        <div className="px-6 py-4 overflow-y-auto h-[calc(90vh-72px)]">
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
              <div className="bg-gray-50 rounded-lg p-4">
                <button onClick={() => toggleSection('info')} className="w-full flex items-center justify-between text-left">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><IconBookOpen className="w-5 h-5" />Información del Curso</h3>
                  <IconChevronDown className="w-5 h-5 rotate-180" />
                </button>
                {expandedSections.has('info') && courseInfo && (
                  <div className="mt-4 space-y-3">
                    <div><span className="font-medium text-gray-700">Título:</span><p className="text-gray-900">{courseInfo.title}</p></div>
                    <div><span className="font-medium text-gray-700">Código:</span><p className="text-gray-900">{courseInfo.code}</p></div>
                    <div><span className="font-medium text-gray-700">Descripción:</span><p className="text-gray-900">{courseInfo.description}</p></div>
                    <div><span className="font-medium text-gray-700">Creado:</span><p className="text-gray-900">{formatDate(courseInfo.created_at)}</p></div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <button onClick={() => toggleSection('materials')} className="w-full flex items-center justify-between text-left">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><IconFileText className="w-5 h-5" />Materiales del Curso ({materials.length})</h3>
                  {expandedSections.has('materials') ? <IconChevronUp className="w-5 h-5" /> : <IconChevronDown className="w-5 h-5" />}
                </button>
                {expandedSections.has('materials') && (
                  <div className="mt-4 space-y-3">
                    {materials.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No hay materiales disponibles para este curso</p>
                    ) : (
                      materials.map((material) => (
                        <div key={material.id} className={`bg-white rounded-lg p-4 border ${filterMaterialId===material.id ? 'ring-2 ring-blue-500' : ''}`} id={`mat-${material.id}`}>
                          <div className="flex items-start gap-3">
                            <div className="text-blue-600 mt-1">{getMaterialIcon(material.type)}</div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{material.title}</h4>
                              <p className="text-gray-600 text-sm mt-1 line-clamp-2">{material.content}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>{formatDate(material.createdAt)}</span>
                                <span className="capitalize">{material.type}</span>
                                {material.url && (
                                  <a className="text-blue-600 hover:text-blue-800 flex items-center gap-1" href={material.url} target="_blank" rel="noopener noreferrer">
                                    <IconEye className="w-3 h-3" />
                                    Ver
                                  </a>
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

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2 mb-3"><IconBookOpen className="w-5 h-5" />Conexión con Tutor Virtual</h3>
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
