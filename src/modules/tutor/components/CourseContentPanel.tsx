// =====================================================
// Panel de Contenido del Curso para Tutor Virtual
// Muestra información del curso y materiales disponibles
// =====================================================

import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabase-shared";
import { IconBookOpen, IconFileText, IconVideoCamera, IconImage, IconDownload, IconEye, IconChevronDown, IconChevronUp, IconEdit, IconCalendar, IconClock, IconAward, IconChartBar } from '@/components/Common/Icons';
import { TutorWeeklyReport } from '@/components/Features/TutorWeeklyReport';
import { CertificateButton } from '@/components/Features/CertificateButton';
import { useAuth } from '@/hooks/useAuth';

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
  highlightId?: string; // ID a resaltar (puede ser material, unidad o sesión)
  highlightType?: 'material' | 'unit' | 'session'; // Tipo de contenido a resaltar
}

export const CourseContentPanel: React.FC<CourseContentPanelProps> = ({
  courseId,
  isOpen,
  onClose,
  filterMaterialId,
  moduleId,
  highlightId,
  highlightType
}) => {
  const { user } = useAuth();
  const [courseInfo, setCourseInfo] = useState<any>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['progreso', 'info', 'units', 'sessions', 'materials']));

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

      // Intentar cargar el curso - usar maybeSingle para evitar errores si no existe
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, description, code, created_at')
        .eq('id', parseInt(courseId, 10))
        .maybeSingle();

      if (courseError) {
        console.error('Error cargando curso:', courseError);
        // Si es un error 406 (Not Acceptable), probablemente es RLS
        if (courseError.code === 'PGRST301' || courseError.message?.includes('406')) {
          throw new Error(`No tienes permisos para acceder a este curso o el curso no existe (Error: ${courseError.message})`);
        }
        throw new Error(`Error cargando curso: ${courseError.message}`);
      }

      if (!courseData) {
        throw new Error(`El curso con ID ${courseId} no existe o no tienes acceso a él`);
      }

      setCourseInfo(courseData);

      const courseIdInt = parseInt(courseId, 10);

      // Cargar unidades del curso
      const { data: unitsData, error: unitsErr } = await supabase
        .from('course_units')
        .select('id, number, title, description, created_at')
        .eq('course_id', courseIdInt)
        .order('number', { ascending: true });

      if (unitsErr) {
        console.warn('Error cargando unidades:', unitsErr);
        setUnits([]);
      } else {
        setUnits(unitsData || []);
      }

      // Cargar sesiones del curso
      let sessionsQuery = supabase
        .from('sessions')
        .select('id, title, description, starts_at, ends_at, unit_id, created_at')
        .eq('course_id', courseIdInt);

      if (moduleId) {
        sessionsQuery = sessionsQuery.eq('unit_id', moduleId);
      }

      const { data: sessionsData, error: sessionsErr } = await sessionsQuery
        .order('starts_at', { ascending: true });

      if (sessionsErr) {
        console.warn('Error cargando sesiones:', sessionsErr);
        setSessions([]);
      } else {
        setSessions(sessionsData || []);
      }

      // Cargar materiales de la tabla materials
      let materialsQuery = supabase
        .from('materials')
        .select('id, title, kind, url, metadata, unit_id, session_id, created_at')
        .eq('course_id', courseIdInt);

      if (moduleId) {
        materialsQuery = materialsQuery.eq('unit_id', moduleId);
      }

      const { data: materialsFromTable, error: materialsTableErr } = await materialsQuery
        .order('created_at', { ascending: true });

      const materialsList: CourseMaterial[] = [];

      if (!materialsTableErr && materialsFromTable) {
        materialsList.push(...materialsFromTable.map((m: any) => ({
          id: String(m.id),
          title: m.title,
          content: m.metadata ? JSON.stringify(m.metadata) : '',
          type: (m.kind === 'video' ? 'video' : m.kind === 'pdf' || m.kind === 'document' ? 'document' : 'text') as CourseMaterial['type'],
          url: m.url || undefined,
          metadata: {
            ...m.metadata,
            unit_id: m.unit_id, // Agregar unit_id al metadata
            session_id: m.session_id // Agregar session_id al metadata
          },
          createdAt: m.created_at || new Date().toISOString()
        })));
      }

      // Cargar materiales de course_materials
      let query = supabase
        .from('course_materials')
        .select('id, title, content, type, file_url, source_url, module_id, created_at')
        .eq('course_id', courseIdInt);

      // Filtrar por módulo si se especifica
      if (moduleId) {
        const moduleIdInt = parseInt(String(moduleId), 10);
        if (!isNaN(moduleIdInt)) {
          query = query.eq('module_id', moduleIdInt);
        }
      }

      const { data: mats, error: matsErr } = await query.order('created_at', { ascending: true });
      if (matsErr) {
        console.warn('Error cargando course_materials:', matsErr);
      } else if (mats) {
        materialsList.push(...mats.map((m: any) => ({
          id: String(m.id),
          title: m.title,
          content: m.content || '',
          type: (m.type || 'text') as CourseMaterial['type'],
          url: m.file_url || m.source_url || undefined,
          createdAt: m.created_at || new Date().toISOString()
        })));
      }

      setMaterials(materialsList);

      // Resaltar elemento si se especifica
      if (highlightId) {
        setTimeout(() => {
          let elementId = '';
          if (highlightType === 'unit') {
            elementId = `unit-${highlightId}`;
          } else if (highlightType === 'session') {
            elementId = `session-${highlightId}`;
          } else {
            elementId = `mat-${highlightId}`;
          }
          const el = document.getElementById(elementId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Expandir la sección correspondiente
            if (highlightType === 'unit') {
              setExpandedSections(prev => new Set([...prev, 'units']));
            } else if (highlightType === 'session') {
              setExpandedSections(prev => new Set([...prev, 'sessions']));
            } else {
              setExpandedSections(prev => new Set([...prev, 'materials']));
            }
          }
        }, 100);
      } else if (filterMaterialId) {
        setTimeout(() => {
          const el = document.getElementById(`mat-${filterMaterialId}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }

      // Cargar progreso del estudiante
      if (user?.id) {
        const { data: enrollment } = await supabase
          .from('course_enrollments')
          .select('completion_percentage')
          .eq('course_id', courseIdInt)
          .eq('student_id', user.id)
          .maybeSingle();

        if (enrollment) {
          setProgress(enrollment.completion_percentage || 0);
        }
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
      case 'video': return <IconVideoCamera className="w-5 h-5" />;
      case 'image': return <IconImage className="w-5 h-5" />;
      case 'document': return <IconFileText className="w-5 h-5" />;
      default: return <IconFileText className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Contenido del Curso</h2>
            <button onClick={onClose} className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100" title="Cerrar" aria-label="Cerrar panel de contenido">✕</button>
          </div>
        </div>
        {/* Contenedor con scroll vertical */}
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
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
              {/* SECCIÓN NUEVA: PROGRESO Y ANÁLISIS SEMANAL */}
              <div className="bg-indigo-50/30 rounded-lg p-4 border border-indigo-100 shadow-sm">
                <button onClick={() => toggleSection('progreso')} className="w-full flex items-center justify-between text-left">
                  <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                    <IconChartBar className="w-5 h-5 text-indigo-600" />
                    Mi Evaluación y Logros
                  </h3>
                  {expandedSections.has('progreso') ? <IconChevronUp className="w-5 h-5" /> : <IconChevronDown className="w-5 h-5" />}
                </button>
                {expandedSections.has('progreso') && user && (
                  <div className="mt-4 space-y-6">
                    {/* Botón de Certificado */}
                    <div className="max-w-md mx-auto">
                      <CertificateButton
                        studentId={user.id}
                        studentName={`${user.first_name || ''} ${user.last_name || ''}`}
                        courseId={parseInt(courseId)}
                        courseTitle={courseInfo?.title || ''}
                        progress={progress}
                      />
                    </div>

                    {/* Reporte Semanal de IA */}
                    <TutorWeeklyReport
                      studentId={user.id}
                      courseId={parseInt(courseId)}
                    />
                  </div>
                )}
              </div>

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

              {units.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <button onClick={() => toggleSection('units')} className="w-full flex items-center justify-between text-left">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><IconBookOpen className="w-5 h-5" />Unidades del Curso ({units.length})</h3>
                    {expandedSections.has('units') ? <IconChevronUp className="w-5 h-5" /> : <IconChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSections.has('units') && (
                    <div className="mt-4 space-y-3">
                      {units.map((unit) => (
                        <div
                          key={unit.id}
                          id={`unit-${unit.id}`}
                          className={`bg-white rounded-lg p-4 border ${highlightId === unit.id && highlightType === 'unit' ? 'ring-2 ring-blue-500' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="text-blue-600 mt-1"><IconBookOpen className="w-5 h-5" /></div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">Unidad {unit.number}: {unit.title}</h4>
                                {unit.description && (
                                  <p className="text-gray-600 text-sm mt-1">{unit.description}</p>
                                )}
                              </div>
                            </div>
                            <a
                              href={`/courses/${courseId}?unitId=${unit.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium whitespace-nowrap"
                              title="Abrir unidad en nueva pestaña"
                            >
                              <IconEye className="w-4 h-4" />
                              Abrir
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {sessions.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <button onClick={() => toggleSection('sessions')} className="w-full flex items-center justify-between text-left">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><IconCalendar className="w-5 h-5" />Sesiones del Curso ({sessions.length})</h3>
                    {expandedSections.has('sessions') ? <IconChevronUp className="w-5 h-5" /> : <IconChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSections.has('sessions') && (
                    <div className="mt-4 space-y-3">
                      {sessions.map((session) => {
                        const unit = units.find(u => u.id === session.unit_id);
                        return (
                          <div
                            key={session.id}
                            id={`session-${session.id}`}
                            className={`bg-white rounded-lg p-4 border ${highlightId === session.id && highlightType === 'session' ? 'ring-2 ring-blue-500' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="text-blue-600 mt-1"><IconCalendar className="w-5 h-5" /></div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{session.title}</h4>
                                  {session.description && (
                                    <p className="text-gray-600 text-sm mt-1">{session.description}</p>
                                  )}
                                  {unit && (
                                    <p className="text-xs text-gray-500 mt-1">Unidad: {unit.title}</p>
                                  )}
                                  {session.starts_at && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(session.starts_at).toLocaleString('es-ES')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <a
                                href={`/session/${session.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium whitespace-nowrap"
                                title="Abrir sesión en nueva pestaña"
                              >
                                <IconEye className="w-4 h-4" />
                                Abrir
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <button onClick={() => toggleSection('materials')} className="w-full flex items-center justify-between text-left">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <IconFileText className="w-5 h-5" />
                    Materiales del Curso
                    {(() => {
                      const assignedCount = materials.filter(m => {
                        const meta = m.metadata as any;
                        return (meta?.unit_id || (m as any).unit_id) || (meta?.session_id || (m as any).session_id);
                      }).length;
                      return assignedCount > 0 ? ` (${assignedCount})` : '';
                    })()}
                  </h3>
                  {expandedSections.has('materials') ? <IconChevronUp className="w-5 h-5" /> : <IconChevronDown className="w-5 h-5" />}
                </button>
                {expandedSections.has('materials') && (
                  <div className="mt-4 space-y-4">
                    {(() => {
                      const hasAssignedMaterials = materials.some(m => {
                        const meta = m.metadata as any;
                        return (meta?.unit_id || (m as any).unit_id) || (meta?.session_id || (m as any).session_id);
                      });

                      if (!hasAssignedMaterials) {
                        return (
                          <div className="text-center py-8 px-4">
                            <p className="text-gray-600 mb-4">
                              Los materiales de este curso están disponibles organizados por sesiones.
                            </p>
                            <a
                              href={`/courses/${courseId}`}
                              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              <IconBookOpen className="w-5 h-5" />
                              Ver Materiales en la Página del Curso
                            </a>
                            <p className="text-gray-500 text-sm mt-3">
                              Allí encontrarás todos los materiales organizados por unidades y sesiones
                            </p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* Materiales agrupados por unidad */}
                          {units.map((unit) => {
                            const unitMaterials = materials.filter(m => {
                              const materialMetadata = m.metadata as any;
                              const unitId = materialMetadata?.unit_id || (m as any).unit_id;
                              return unitId === unit.id || unitId === String(unit.id);
                            });

                            if (unitMaterials.length === 0) return null;

                            return (
                              <div key={`unit-${unit.id}-materials`} className="bg-white rounded-lg p-4 border border-blue-200">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <IconBookOpen className="w-4 h-4 text-blue-600" />
                                  Unidad {unit.number}: {unit.title}
                                  <span className="text-sm font-normal text-gray-500">({unitMaterials.length} material{unitMaterials.length !== 1 ? 'es' : ''})</span>
                                </h4>
                                <div className="ml-6 space-y-2">
                                  {unitMaterials.map((material) => (
                                    <div
                                      key={material.id}
                                      className={`bg-gray-50 rounded-lg p-3 border ${filterMaterialId === material.id ? 'ring-2 ring-blue-500' : ''}`}
                                      id={`mat-${material.id}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="text-blue-600 mt-1">{getMaterialIcon(material.type)}</div>
                                        <div className="flex-1">
                                          <h5 className="font-medium text-gray-900 text-sm">{material.title}</h5>
                                          <p className="text-gray-600 text-xs mt-1 line-clamp-2">{material.content}</p>
                                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                            <span>{formatDate(material.createdAt)}</span>
                                            <span className="capitalize">{material.type}</span>
                                            {material.url && material.type === 'document' && material.url.endsWith('.pdf') && (
                                              <a
                                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                                href={`/secure-viewer?url=${encodeURIComponent(material.url)}&title=${encodeURIComponent(material.title)}`}
                                                rel="noopener noreferrer"
                                              >
                                                <IconEye className="w-4 h-4" />
                                                Abrir documento
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}

                          {/* Materiales agrupados por sesión */}
                          {sessions.map((session) => {
                            const sessionMaterials = materials.filter(m => {
                              const materialMetadata = m.metadata as any;
                              const sessionId = materialMetadata?.session_id || (m as any).session_id;
                              return sessionId === session.id || sessionId === String(session.id);
                            });

                            if (sessionMaterials.length === 0) return null;

                            const unit = units.find(u => u.id === session.unit_id);

                            return (
                              <div key={`session-${session.id}-materials`} className="bg-white rounded-lg p-4 border border-green-200">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <IconCalendar className="w-4 h-4 text-green-600" />
                                  {session.title}
                                  {unit && <span className="text-sm font-normal text-gray-500">(Unidad {unit.number})</span>}
                                  <span className="text-sm font-normal text-gray-500">({sessionMaterials.length} material{sessionMaterials.length !== 1 ? 'es' : ''})</span>
                                </h4>
                                <div className="ml-6 space-y-2">
                                  {sessionMaterials.map((material) => (
                                    <div
                                      key={material.id}
                                      className={`bg-gray-50 rounded-lg p-3 border ${filterMaterialId === material.id ? 'ring-2 ring-blue-500' : ''}`}
                                      id={`mat-${material.id}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="text-green-600 mt-1">{getMaterialIcon(material.type)}</div>
                                        <div className="flex-1">
                                          <h5 className="font-medium text-gray-900 text-sm">{material.title}</h5>
                                          <p className="text-gray-600 text-xs mt-1 line-clamp-2">{material.content}</p>
                                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                            <span>{formatDate(material.createdAt)}</span>
                                            <span className="capitalize">{material.type}</span>
                                            {material.url && material.type === 'document' && material.url.endsWith('.pdf') && (
                                              <a
                                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                                href={`/secure-viewer?url=${encodeURIComponent(material.url)}&title=${encodeURIComponent(material.title)}`}
                                                rel="noopener noreferrer"
                                              >
                                                <IconEye className="w-4 h-4" />
                                                Abrir documento
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}

                        </>
                      );
                    })()}
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

