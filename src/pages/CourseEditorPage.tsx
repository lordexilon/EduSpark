// pages/CourseEditorPage.tsx
// Editor de curso con unidades, sesiones y materiales

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { courseService, unitService, sessionService, materialService, Course, CourseUnit, Session, Material } from '../services/teacherCourses';
import { subjectService, careerService, Subject, Career } from '../services/academicService';
import { courseEnrollmentService } from '../services/academicService';
import Card from '../components/Card';
import Button from '../components/Button';
import { UnitEditorModal } from '../components/UnitEditorModal';
import { SessionEditorModal } from '../components/SessionEditorModal';
import { CourseEditModal } from '../components/CourseEditModal';
import { IconEye, IconCards, IconChevronDown, IconChevronUp, IconEdit } from '../components/Icons';
import { uploadCourseMedia, uploadCourseDocument, UploadResult } from '../services/storageService';
import { VideoPlayer } from '../components/VideoPlayer';
import { VideoTranscriptService } from '../services/videoTranscriptService';
import { RichTextDisplay } from '../components/RichTextDisplay';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { indexUnitContent, indexSessionContent } from '../services/contentIndexingService';

export const CourseEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'units' | 'sessions' | 'materials'>('units');
  const [subject, setSubject] = useState<Subject | null>(null);
  const [career, setCareer] = useState<Career | null>(null);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [editingUnit, setEditingUnit] = useState<CourseUnit | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showCourseEditModal, setShowCourseEditModal] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [materialUploadInfo, setMaterialUploadInfo] = useState<string | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const materialFileInputRef = useRef<HTMLInputElement | null>(null);
  const materialUploadAbortController = useRef<AbortController | null>(null);
  const MAX_FILE_SIZE = 35 * 1024 * 1024;

  useEffect(() => {
    if (id) {
      loadCourseData();
    }
  }, [id]);

  useEffect(() => {
    return () => {
      materialUploadAbortController.current?.abort();
    };
  }, []);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const courseId = parseInt(id!);
      const isAdmin = user?.role?.name === 'admin' || user?.role?.name === 'coordinator';

      // Intentar cargar el curso
      let courseData: Course | null = null;
      try {
        courseData = await courseService.getCourse(courseId);
      } catch (error: any) {
        console.error('Error cargando curso con servicio:', error);
        // Si hay error y es admin/coordinator, intentar cargar directamente desde supabase
        if (isAdmin) {
          console.warn('Error cargando curso con servicio, intentando acceso directo como admin...');
          try {
            // Intentar con select específico sin thumbnail_url (puede no existir)
            const { data, error: supabaseError } = await supabase
              .from('courses')
              .select('id, title, code, description, teacher_id, status, subject_id, academic_period, start_date, end_date, schedule, max_students, created_at, updated_at')
              .eq('id', courseId)
              .maybeSingle(); // Usar maybeSingle en lugar de single para evitar error si no existe

            if (!supabaseError && data) {
              courseData = data as Course;
              // Establecer thumbnail_url como null (la columna no existe en la BD)
              (courseData as any).thumbnail_url = null;
            } else {
              console.error('Error incluso con acceso directo:', supabaseError);
              if (supabaseError?.code === 'PGRST116' || supabaseError?.code === '406') {
                // Curso no encontrado o error de formato
                console.warn('Curso no encontrado o problema de permisos RLS');
              }
            }
          } catch (directError: any) {
            console.error('Error en acceso directo:', directError);
          }
        } else {
          // Si no es admin y hay error, redirigir
          console.warn('Error cargando curso y no tienes permisos de administrador');
          navigate('/teacher/dashboard');
          return;
        }
      }

      // Verificar permisos: solo el dueño del curso, admin o coordinator pueden verlo
      if (!courseData) {
        // Si el curso no se encontró, verificar si es admin/coordinator antes de mostrar error
        if (!isAdmin) {
          // Si no es admin/coordinator y el curso no existe, redirigir
          console.warn('Curso no encontrado y no tienes permisos de administrador');
          navigate('/teacher/dashboard');
          return;
        }
        // Si es admin/coordinator pero el curso no existe, mostrar mensaje de error pero no redirigir
        console.warn('Curso no encontrado (puede ser un problema de permisos RLS)');
      } else {
        // Si el curso existe, verificar permisos
        const isOwner = courseData.teacher_id === user?.id;

        if (!isOwner && !isAdmin) {
          // Si no es el dueño ni admin/coordinator, redirigir
          console.warn('Acceso denegado: no eres el dueño del curso ni tienes permisos de administrador');
          navigate('/teacher/dashboard');
          return;
        }
      }

      // Cargar datos del curso (unidades, sesiones, materiales)
      // Si es admin/coordinator, intentar cargar incluso si el curso no se encontró inicialmente
      let unitsData: CourseUnit[] = [];
      let sessionsData: Session[] = [];
      let materialsData: Material[] = [];

      try {
        [unitsData, sessionsData, materialsData] = await Promise.all([
          unitService.getCourseUnits(courseId),
          sessionService.getCourseSessions(courseId),
          materialService.getCourseMaterials(courseId)
        ]);
      } catch (error: any) {
        // Si hay error y es admin/coordinator, intentar cargar directamente desde supabase
        if (isAdmin) {
          console.warn('Error cargando datos del curso con servicio, intentando acceso directo como admin...');
          const [unitsResult, sessionsResult, materialsResult] = await Promise.all([
            supabase.from('course_units').select('*').eq('course_id', courseId),
            supabase.from('sessions').select('*').eq('course_id', courseId),
            supabase.from('materials').select('*').eq('course_id', courseId)
          ]);

          if (!unitsResult.error) unitsData = unitsResult.data as CourseUnit[];
          if (!sessionsResult.error) sessionsData = sessionsResult.data as Session[];
          if (!materialsResult.error) materialsData = materialsResult.data as Material[];
        } else {
          console.error('Error cargando datos del curso:', error);
        }
      }

      setCourse(courseData);
      setUnits(unitsData);
      setSessions(sessionsData);
      setMaterials(materialsData);

      // Cargar información académica
      if (courseData?.subject_id) {
        try {
          const subjectData = await subjectService.getSubject(courseData.subject_id);
          setSubject(subjectData);
          if (subjectData?.career_id) {
            const careerData = await careerService.getCareer(subjectData.career_id);
            setCareer(careerData);
          }
        } catch (err) {
          console.error('Error loading academic info:', err);
        }
      }

      // Cargar contador de estudiantes
      try {
        const enrollments = await courseEnrollmentService.getCourseStudents(courseId);
        setEnrolledCount(enrollments.length);
      } catch (err) {
        console.error('Error loading enrollments:', err);
      }
    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUnit = () => {
    if (!course) return;
    setEditingUnit(null);
    setShowUnitModal(true);
  };

  const handleEditUnit = (unit: CourseUnit) => {
    setEditingUnit(unit);
    setShowUnitModal(true);
  };

  const handleSaveUnit = async (unitData: Omit<CourseUnit, 'id' | 'created_at'>) => {
    if (!course) {
      throw new Error('No hay curso seleccionado');
    }

    try {
      console.log('handleSaveUnit - Datos recibidos:', unitData);

      let savedUnit: CourseUnit;
      if (editingUnit) {
        console.log('Actualizando unidad existente:', editingUnit.id);
        savedUnit = await unitService.updateUnit(editingUnit.id, unitData);
        console.log('Unidad actualizada:', savedUnit);
        // Actualizar la lista con la unidad actualizada
        const updatedUnits = units.map(u => u.id === editingUnit.id ? savedUnit : u);
        setUnits(updatedUnits);
      } else {
        const unitNumber = units.length + 1;
        console.log('Creando nueva unidad con número:', unitNumber);
        savedUnit = await unitService.createUnit({
          ...unitData,
          number: unitNumber
        });
        console.log('Unidad creada:', savedUnit);
        setUnits([...units, savedUnit]);
      }

      // Indexar contenido para RAG
      if (user?.id) {
        indexUnitContent(savedUnit, user.id).catch(err =>
          console.error('Error indexando unidad:', err)
        );
      }


      // Cerrar modal después de una pequeña pausa para asegurar renderizado
      await new Promise(resolve => setTimeout(resolve, 50));
      setShowUnitModal(false);
      setEditingUnit(null);
    } catch (error: any) {
      console.error('Error en handleSaveUnit:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      throw error;
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta unidad?')) return;

    try {
      await unitService.deleteUnit(unitId);
      setUnits(units.filter(u => u.id !== unitId));
    } catch (error) {
      console.error('Error deleting unit:', error);
      alert('Error al eliminar la unidad');
    }
  };

  const handleCreateSession = () => {
    if (!course) return;
    setEditingSession(null);
    setShowSessionModal(true);
  };

  const handleEditSession = (session: Session) => {
    setEditingSession(session);
    setShowSessionModal(true);
  };

  const handleSaveSession = async (sessionData: Omit<Session, 'id' | 'created_at'>) => {
    if (!course) {
      throw new Error('No hay curso seleccionado');
    }

    try {
      console.log('handleSaveSession - Datos recibidos:', sessionData);

      let savedSession: Session;
      if (editingSession) {
        console.log('Actualizando sesión existente:', editingSession.id);
        savedSession = await sessionService.updateSession(editingSession.id, sessionData);
        console.log('Sesión actualizada:', savedSession);
        // Actualizar la lista con la sesión actualizada
        const updatedSessions = sessions.map(s => s.id === editingSession.id ? savedSession : s);
        setSessions(updatedSessions);
      } else {
        console.log('Creando nueva sesión');
        savedSession = await sessionService.createSession(sessionData);
        console.log('Sesión creada:', savedSession);
        setSessions([...sessions, savedSession]);
      }

      // Indexar contenido para RAG
      console.log('🔍 Verificando indexación - user:', user, 'user.id:', user?.id);
      if (user?.id) {
        console.log('✅ Llamando a indexSessionContent para sesión:', savedSession.id);
        indexSessionContent(savedSession, user.id, savedSession.unit_id).catch(err =>
          console.error('❌ Error indexando sesión:', err)
        );
      } else {
        console.warn('⚠️ No se puede indexar: usuario no disponible');
      }

      // Cerrar modal después de una pequeña pausa para asegurar renderizado
      await new Promise(resolve => setTimeout(resolve, 50));
      setShowSessionModal(false);
      setEditingSession(null);
    } catch (error: any) {
      console.error('Error en handleSaveSession:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      throw error;
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta sesión?')) return;

    try {
      await sessionService.deleteSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error al eliminar la sesión');
    }
  };

  const handleCreateMaterial = async () => {
    if (!course) return;

    const title = prompt('Título del material:');
    if (!title) return;

    const kind = prompt('Tipo de material (markdown/pdf/link/video/other):') as Material['kind'] || 'other';

    try {
      const newMaterial = await materialService.createMaterial({
        course_id: course.id,
        title,
        kind,
        metadata: {}
      });
      setMaterials([...materials, newMaterial]);
    } catch (error) {
      console.error('Error creating material:', error);
    }
  };

  const determineMaterialKind = (mime: string): Material['kind'] => {
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('video')) return 'video';
    if (mime.includes('markdown') || mime.includes('text')) return 'markdown';
    if (mime.includes('spreadsheet') || mime.includes('excel')) return 'other';
    if (mime.includes('word') || mime.includes('msword')) return 'other';
    return 'other';
  };

  const handleSelectMaterialFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!course) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('El archivo supera el límite de 35MB.');
      event.target.value = '';
      return;
    }

    try {
      materialUploadAbortController.current?.abort();
      const controller = new AbortController();
      materialUploadAbortController.current = controller;

      setUploadingMaterial(true);
      // Detectar tipo de archivo para mostrar mensaje apropiado
      const fileSizeMB = file.size / 1024 / 1024;
      const isLargeFile = fileSizeMB > 50;
      const isLargePDF = file.type === 'application/pdf' && fileSizeMB > 5 && fileSizeMB <= 50;

      if (isLargeFile) {
        setMaterialUploadInfo(`Subiendo archivo grande (${fileSizeMB.toFixed(2)}MB). Esto puede tardar varios minutos...`);
      } else if (isLargePDF) {
        setMaterialUploadInfo('Comprimiendo PDF para reducir tamaño...');
      } else {
        setMaterialUploadInfo('Optimizando y subiendo material...');
      }

      const isImage = file.type.startsWith('image/');
      let result: UploadResult & { optimization?: string };

      if (isImage) {
        result = await uploadCourseMedia(String(course.id), file, 'materials', {
          maxWidth: 2000,
          maxHeight: 2000,
          quality: 0.85,
          format: 'image/webp',
          signal: controller.signal,
          forceOptimization: true,
        });
      } else {
        result = await uploadCourseDocument(String(course.id), file, {
          folder: 'materials',
          cacheSeconds: 31536000,
        });
      }

      if (!result.success || !result.url) {
        throw new Error(result.error || 'No se pudo subir el material.');
      }

      const newMaterial = await materialService.createMaterial({
        course_id: course.id,
        title: file.name,
        kind: determineMaterialKind(file.type),
        url: result.url,
        mime_type: file.type,
        size_bytes: file.size,
        metadata: {
          original_name: file.name,
          optimized: result.optimization,
          bucket: isImage ? 'course-media' : 'course-documents',
        },
      });

      setMaterials((prev) => [newMaterial, ...prev]);
      setMaterialUploadInfo(result.optimization ?? 'Material subido correctamente');
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        setMaterialUploadInfo('Subida cancelada.');
        return;
      }
      console.error('[CourseEditorPage] Error subiendo material:', error);
      setMaterialUploadInfo(error?.message || 'Error al subir el material.');
      alert(error?.message || 'Error al subir el material.');
    } finally {
      setUploadingMaterial(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleDeleteMaterial = useCallback(async (materialId: string) => {
    if (!confirm('¿Eliminar este material?')) return;

    try {
      await materialService.deleteMaterial(materialId);
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    } catch (error) {
      console.error('[CourseEditorPage] Error eliminando material:', error);
      alert('No se pudo eliminar el material. Intenta nuevamente.');
    }
  }, []);

  const handleEditMaterial = useCallback(async (material: Material) => {
    const newTitle = prompt('Nuevo título del material:', material.title);
    if (newTitle === null) return;
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      alert('El título no puede estar vacío.');
      return;
    }

    let newUrl = material.url;
    if (material.url) {
      const urlPrompt = prompt('URL del material (deja igual si no quieres cambiarla):', material.url);
      if (urlPrompt === null) return;
      newUrl = urlPrompt.trim() || material.url;
    }

    try {
      const updated = await materialService.updateMaterial(material.id, {
        title: trimmedTitle,
        url: newUrl,
        metadata: {
          ...material.metadata,
          updated_at: new Date().toISOString(),
        },
      });
      setMaterials((prev) => prev.map((m) => (m.id === material.id ? updated : m)));
    } catch (error) {
      console.error('[CourseEditorPage] Error actualizando material:', error);
      alert('No se pudo actualizar el material.');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-gray-900">Curso no encontrado</h2>
        <Button onClick={() => navigate('/teacher/courses')} className="mt-4">
          Volver a Cursos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <p className="text-gray-600">Editor de curso</p>
          {/* Información Académica */}
          {(subject || course.academic_period || enrolledCount > 0) && (
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {subject && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Materia:</span>
                  <a
                    href={`/admin/subjects?subjectId=${subject.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/admin/subjects?subjectId=${subject.id}`);
                    }}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    title={`Ver detalles de ${subject.name}`}
                  >
                    {subject.name}
                  </a>
                  {career && (
                    <>
                      <span className="text-gray-500">·</span>
                      <a
                        href={`/admin/careers?careerId=${career.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/admin/careers?careerId=${career.id}`);
                        }}
                        className="text-gray-600 hover:text-gray-800 hover:underline cursor-pointer"
                        title={`Ver detalles de ${career.name}`}
                      >
                        {career.name}
                      </a>
                    </>
                  )}
                </div>
              )}
              {course.academic_period && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Período:</span>
                  <span className="font-medium">{course.academic_period}</span>
                </div>
              )}
              {enrolledCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Estudiantes:</span>
                  <span className="font-medium">{enrolledCount}</span>
                  {course.max_students && (
                    <span className="text-gray-400">/ {course.max_students}</span>
                  )}
                </div>
              )}
              {course.start_date && course.end_date && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Fechas:</span>
                  <span className="font-medium">
                    {new Date(course.start_date).toLocaleDateString()} - {new Date(course.end_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowCourseEditModal(true)}
            leftIcon={<IconEdit className="w-4 h-4" />}
          >
            Editar Curso
          </Button>
          <Button onClick={() => navigate('/teacher/courses')}>
            Volver a Cursos
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('units')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'units'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Unidades ({units.length})
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'sessions'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Sesiones ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'materials'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Materiales ({materials.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'units' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Unidades del Curso</h2>
            <Button onClick={handleCreateUnit}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Unidad
            </Button>
          </div>

          {units.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-500">No hay unidades creadas</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {units.map((unit) => {
                const isExpanded = expandedUnits.has(unit.id);
                const toggleUnit = () => {
                  setExpandedUnits(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(unit.id)) {
                      newSet.delete(unit.id);
                    } else {
                      newSet.add(unit.id);
                    }
                    return newSet;
                  });
                };

                return (
                  <Card key={unit.id}>
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <button
                              onClick={toggleUnit}
                              className="flex items-center gap-2 hover:bg-gray-100 rounded px-2 py-1 transition-colors"
                              title={isExpanded ? "Plegar unidad" : "Desplegar unidad"}
                            >
                              {isExpanded ? (
                                <IconChevronUp className="w-5 h-5 text-gray-600" />
                              ) : (
                                <IconChevronDown className="w-5 h-5 text-gray-600" />
                              )}
                              <h3 className="font-semibold">Unidad {unit.number}: {unit.title}</h3>
                            </button>
                            {unit.thumbnail_url && (
                              <img src={unit.thumbnail_url} alt={unit.title} className="w-16 h-16 object-cover rounded" />
                            )}
                          </div>
                          {isExpanded && (
                            <>
                              {unit.description && (
                                <p className="text-gray-600 text-sm mt-1">{unit.description}</p>
                              )}
                              {unit.content_html && (
                                <div className="mt-2 text-sm">
                                  <RichTextDisplay content={unit.content_html} />
                                </div>
                              )}
                              {unit.learning_objectives && unit.learning_objectives.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Objetivos:</p>
                                  <ul className="text-xs text-gray-600 list-disc list-inside">
                                    {unit.learning_objectives.map((obj, idx) => (
                                      <li key={idx}>{obj}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {unit.duration_hours && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Duración: {unit.duration_hours} horas
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Link
                            to={`/teacher/courses/${id}/modules/${unit.id}`}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium"
                          >
                            🎥 Editar Unidad (con Videos)
                          </Link>
                          <Link
                            to={`/teacher/courses/${id}/flashcards?unitId=${unit.id}`}
                          >
                            <Button size="sm" variant="secondary" leftIcon={<IconCards className="w-4 h-4" />}>
                              Flashcards
                            </Button>
                          </Link>
                          <Button size="sm" variant="secondary" onClick={() => handleEditUnit(unit)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDeleteUnit(unit.id)}>
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Sesiones del Curso</h2>
            <Button onClick={handleCreateSession}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Sesión
            </Button>
          </div>

          {sessions.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-500">No hay sesiones creadas</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const sessionUnit = units.find(u => u.id === session.unit_id);
                return (
                  <Card key={session.id}>
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{session.title}</h3>
                            {session.session_type && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                {session.session_type === 'lecture' ? 'Clase' :
                                  session.session_type === 'practice' ? 'Práctica' :
                                    session.session_type === 'lab' ? 'Lab' :
                                      session.session_type === 'exam' ? 'Examen' :
                                        session.session_type === 'discussion' ? 'Discusión' :
                                          session.session_type === 'workshop' ? 'Taller' : 'Otro'}
                              </span>
                            )}
                          </div>
                          {sessionUnit && (
                            <p className="text-xs text-gray-500 mb-1">
                              Unidad {sessionUnit.number}: {sessionUnit.title}
                            </p>
                          )}
                          {session.description && (
                            <p className="text-gray-600 text-sm mt-1">{session.description}</p>
                          )}
                          {session.content_html && (
                            <div className="mt-2 text-sm">
                              <RichTextDisplay content={session.content_html} />
                            </div>
                          )}
                          {session.learning_objectives && session.learning_objectives.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-700 mb-1">Objetivos:</p>
                              <ul className="text-xs text-gray-600 list-disc list-inside">
                                {session.learning_objectives.map((obj, idx) => (
                                  <li key={idx}>{obj}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            {session.starts_at && (
                              <span>Inicio: {new Date(session.starts_at).toLocaleString()}</span>
                            )}
                            {session.duration_minutes && (
                              <span>Duración: {session.duration_minutes} min</span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Link to={`/session/${session.id}`} target="_blank">
                            <Button size="sm" variant="secondary" leftIcon={<IconEye className="w-4 h-4" />}>
                              Ver como Estudiante
                            </Button>
                          </Link>
                          <Link
                            to={`/teacher/courses/${id}/flashcards?sessionId=${session.id}${session.unit_id ? `&unitId=${session.unit_id}` : ''}`}
                          >
                            <Button size="sm" variant="secondary" leftIcon={<IconCards className="w-4 h-4" />}>
                              Flashcards
                            </Button>
                          </Link>
                          <Button size="sm" variant="secondary" onClick={() => handleEditSession(session)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDeleteSession(session.id)}>
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Materiales del Curso</h2>
            <div className="flex gap-2">
              <input
                ref={materialFileInputRef}
                type="file"
                className="hidden"
                onChange={handleSelectMaterialFile}
              />
              <Button
                variant="secondary"
                onClick={() => materialFileInputRef.current?.click()}
                disabled={uploadingMaterial}
              >
                {uploadingMaterial ? 'Subiendo...' : 'Subir archivo'}
              </Button>
              <Button onClick={handleCreateMaterial}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar enlace
              </Button>
            </div>
          </div>

          {materials.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-500">No hay materiales creados</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => {
                const isVideo = material.kind === 'video';
                const transcriptService = new VideoTranscriptService();
                const platform = isVideo && material.url
                  ? (material.video_platform || transcriptService.detectPlatform(material.url)?.name || 'other')
                  : null;
                const videoId = isVideo && material.url && platform
                  ? (material.video_id || transcriptService.detectPlatform(material.url)?.extractId(material.url) || undefined)
                  : undefined;

                return (
                  <Card key={material.id}>
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">{material.title}</h3>
                          <p className="text-gray-600 text-sm mt-1">Tipo: {material.kind}</p>
                          {(material.url || material.metadata?.sourceFileId) && (
                            <p className="text-blue-600 text-sm mt-1 break-all">
                              {material.url || `https://drive.google.com/file/d/${material.metadata?.sourceFileId}/view`}
                            </p>
                          )}
                          {material.mime_type && (
                            <p className="text-xs text-gray-500 mt-1">
                              {material.mime_type} · {material.size_bytes ? `${(material.size_bytes / 1024).toFixed(1)} KB` : 'tamaño desconocido'}
                            </p>
                          )}
                          {material.metadata?.optimized && (
                            <p className="text-xs text-gray-500">
                              {material.metadata.optimized}
                            </p>
                          )}
                          {isVideo && material.transcription_status && (
                            <div className="mt-2">
                              {material.transcription_status === 'completed' && (
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                  ✓ Transcripción disponible
                                </span>
                              )}
                              {material.transcription_status === 'processing' && (
                                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                  ⏳ Extrayendo transcripción...
                                </span>
                              )}
                              {material.transcription_status === 'failed' && (
                                <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                                  ✗ Transcripción no disponible
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button size="sm" variant="secondary" onClick={() => handleEditMaterial(material)}>
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteMaterial(material.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>

                      {/* Preview del video para el docente */}
                      {isVideo && material.url && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Vista Previa del Video:</h4>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <VideoPlayer
                              materialId={material.id}
                              url={material.url}
                              platform={platform || 'other'}
                              videoId={videoId}
                              title={material.title}
                              showProgress={false}
                              transcription={material.transcription}
                              transcriptionStatus={material.transcription_status}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              Así es como los estudiantes verán este video
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          {materialUploadInfo && (
            <p className="text-xs text-gray-500">{materialUploadInfo}</p>
          )}
        </div>
      )}

      {/* Modales de edición */}
      {showUnitModal && course && (
        <UnitEditorModal
          unit={editingUnit}
          courseId={course.id}
          onClose={() => {
            setShowUnitModal(false);
            setEditingUnit(null);
          }}
          onSave={handleSaveUnit}
        />
      )}

      {showSessionModal && course && (
        <SessionEditorModal
          session={editingSession}
          courseId={course.id}
          units={units}
          onClose={() => {
            setShowSessionModal(false);
            setEditingSession(null);
          }}
          onSave={handleSaveSession}
        />
      )}

      {showCourseEditModal && course && (
        <CourseEditModal
          course={course}
          onClose={() => setShowCourseEditModal(false)}
          onSave={async (courseData) => {
            try {
              const updated = await courseService.updateCourse(course.id, courseData);
              setCourse(updated);
              setShowCourseEditModal(false);
            } catch (error) {
              console.error('Error actualizando curso:', error);
              throw error;
            }
          }}
        />
      )}
    </div>
  );
};
