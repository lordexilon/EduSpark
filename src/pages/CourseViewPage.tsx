// pages/CourseViewPage.tsx
// Vista de curso para estudiantes - Muestra módulos y sesiones organizadas

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { courseService, Course } from '../services/teacherCourses';
import { unitService, CourseUnit } from '../services/teacherCourses';
import { sessionService, Session } from '../services/teacherCourses';
import { materialService, Material } from '../services/teacherCourses';
import { subjectService, careerService, Subject, Career } from '../services/academicService';
import Card from '../components/Card';
import Button from '../components/Button';
import Breadcrumbs from '../components/Breadcrumbs';
import ProgressIndicator from '../components/ProgressIndicator';
import GamificationScore from '../components/GamificationScore';
import { IconBookOpen, IconChevronRight, IconCalendar, IconEye, IconRobot, IconClipboardList, IconClipboardCheck, IconClock, IconCards, IconCheck, IconChevronDown, IconChevronUp } from '../components/Icons';
import { MaterialDisplay } from '../components/MaterialDisplay';
import { useAuth } from '../hooks/useAuth';
import { courseEnrollmentService, CourseEnrollment } from '../services/academicService';
import { progressService } from '../services/progressService';
import { quizService, Assessment } from '../services/quizService';
import { VideoTranscriptService } from '../services/videoTranscriptService';
import { supabase } from '../lib/supabase';
import { RichTextDisplay } from '../components/RichTextDisplay';

export const CourseViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [sessionsByUnit, setSessionsByUnit] = useState<Record<string, Session[]>>({});
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [career, setCareer] = useState<Career | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [quizzesByUnit, setQuizzesByUnit] = useState<Record<string, Assessment[]>>({});
  const [generalQuizzes, setGeneralQuizzes] = useState<Assessment[]>([]);
  const [finalExam, setFinalExam] = useState<Assessment | null>(null);
  const [completedUnits, setCompletedUnits] = useState<Set<string>>(new Set());
  const [completedSessions, setCompletedSessions] = useState<Set<string>>(new Set());
  const [completedQuizzes, setCompletedQuizzes] = useState<Set<string>>(new Set());
  const [totalFlashcards, setTotalFlashcards] = useState<number>(0);
  const [completedFlashcards, setCompletedFlashcards] = useState<number>(0);
  const [markingUnit, setMarkingUnit] = useState<string | null>(null);
  const [expandedMaterialsGroups, setExpandedMaterialsGroups] = useState<Set<string>>(new Set());

  // ==========================================
  // Lógica de Disponibilidad (Hooks)
  // ==========================================

  const normalizeDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const isUnitAvailable = useCallback((unit: CourseUnit): boolean => {
    if (user?.role?.name !== 'student') return true;
    const now = new Date();

    // 1. Fechas específicas de disponibilidad (prioridad)
    if (unit.available_from && unit.available_until) {
      const start = new Date(unit.available_from);
      const end = new Date(unit.available_until);
      return now >= start && now <= end;
    }
    if (unit.available_from) return now >= new Date(unit.available_from);
    if (unit.available_until) return now <= new Date(unit.available_until);

    // 2. Fechas del curso (fallback)
    if (course?.start_date && course?.end_date) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const courseStart = normalizeDate(course.start_date);
      const courseEnd = normalizeDate(course.end_date);
      return today >= courseStart && today <= courseEnd;
    }

    return true;
  }, [user, course]);

  const isSessionAvailable = useCallback((session: Session): boolean => {
    if (user?.role?.name !== 'student') return true;
    const now = new Date();

    // 1. Validar Unidad Padre
    if (session.unit_id) {
      const parentUnit = units.find(u => u.id === session.unit_id);
      if (parentUnit && !isUnitAvailable(parentUnit)) return false;
    }

    // 2. Fechas específicas de disponibilidad
    if (session.available_from && session.available_until) {
      const start = new Date(session.available_from);
      const end = new Date(session.available_until);
      return now >= start && now <= end;
    }
    if (session.available_from) return now >= new Date(session.available_from);
    if (session.available_until) return now <= new Date(session.available_until);

    // 3. Fechas de "cursada" (compatibilidad)
    if (session.starts_at && session.ends_at) {
      const start = new Date(session.starts_at);
      const end = new Date(session.ends_at);
      return now >= start && now <= end;
    }

    // 4. Fechas del curso
    if (course?.start_date && course?.end_date) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const courseStart = normalizeDate(course.start_date);
      const courseEnd = normalizeDate(course.end_date);
      return today >= courseStart && today <= courseEnd;
    }

    return true;
  }, [user, course, units, isUnitAvailable]);

  const isQuizAvailable = useCallback((quiz: Assessment): boolean => {
    if (user?.role?.name !== 'student') return true;
    const now = new Date();

    // 1. Validar Sesión Padre
    if (quiz.session_id) {
      // Buscar sesión en todas las sesiones cargadas
      const allSessions = Object.values(sessionsByUnit).flat();
      const parentSession = allSessions.find(s => s.id === quiz.session_id);
      if (parentSession && !isSessionAvailable(parentSession)) return false;
    }

    // 2. Validar Unidad Padre
    if (quiz.unit_id) {
      const parentUnit = units.find(u => u.id === quiz.unit_id);
      if (parentUnit && !isUnitAvailable(parentUnit)) return false;
    }

    // 3. Fechas específicas
    if (quiz.available_from && quiz.available_until) {
      const start = new Date(quiz.available_from);
      const end = new Date(quiz.available_until);
      return now >= start && now <= end;
    }
    if (quiz.available_from) return now >= new Date(quiz.available_from);
    if (quiz.available_until) return now <= new Date(quiz.available_until);

    return true;
  }, [user, units, sessionsByUnit, isSessionAvailable, isUnitAvailable]);

  // ==========================================
  // Variables Filtradas para Renderizado
  // ==========================================
  const visibleUnits = useMemo(() => units.filter(isUnitAvailable), [units, isUnitAvailable]);

  const visibleSessionsByUnit = useMemo(() => {
    const filtered: Record<string, Session[]> = {};
    Object.keys(sessionsByUnit).forEach(unitId => {
      filtered[unitId] = sessionsByUnit[unitId].filter(isSessionAvailable);
    });
    return filtered;
  }, [sessionsByUnit, isSessionAvailable]);

  const visibleQuizzesByUnit = useMemo(() => {
    const filtered: Record<string, Assessment[]> = {};
    Object.keys(quizzesByUnit).forEach(unitId => {
      filtered[unitId] = quizzesByUnit[unitId].filter(isQuizAvailable);
    });
    return filtered;
  }, [quizzesByUnit, isQuizAvailable]);

  const visibleGeneralQuizzes = useMemo(() => generalQuizzes.filter(isQuizAvailable), [generalQuizzes, isQuizAvailable]);
  const visibleFinalExam = useMemo(() => finalExam && isQuizAvailable(finalExam) ? finalExam : null, [finalExam, isQuizAvailable]);

  // Efecto para auto-expandir si solo hay una unidad visible
  useEffect(() => {
    if (visibleUnits.length === 1) {
      setExpandedUnits(new Set([visibleUnits[0].id]));
    }
  }, [visibleUnits]);

  useEffect(() => {
    if (id) {
      loadCourseData();
    }
  }, [id]);

  // Cargar progreso de quizzes después de que se hayan cargado los quizzes
  useEffect(() => {
    const loadQuizProgress = async () => {
      if (!user?.id || !id) return;

      try {
        const allQuizIds = [
          ...Object.values(quizzesByUnit).flat().map(q => q.id),
          ...generalQuizzes.map(q => q.id),
          ...(finalExam ? [finalExam.id] : [])
        ].filter(Boolean);

        if (allQuizIds.length > 0) {
          const { data: quizAttemptsData } = await supabase
            .from('assessment_attempts')
            .select('assessment_id')
            .eq('student_id', user.id)
            .in('assessment_id', allQuizIds)
            .in('status', ['submitted', 'graded']);

          if (quizAttemptsData) {
            const completedQuizIds = new Set(quizAttemptsData.map(qa => qa.assessment_id).filter(Boolean));
            setCompletedQuizzes(completedQuizIds);
          }
        }
      } catch (err) {
        console.error('Error loading quiz progress:', err);
      }
    };

    loadQuizProgress();
  }, [user?.id, id, quizzesByUnit, generalQuizzes, finalExam]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const courseId = parseInt(id!);

      const [courseData, unitsData, sessionsData, materialsData] = await Promise.all([
        courseService.getCourse(courseId),
        unitService.getCourseUnits(courseId),
        sessionService.getCourseSessions(courseId),
        materialService.getCourseMaterials(courseId)
      ]);

      setCourse(courseData);
      setUnits(unitsData);
      setMaterials(materialsData);

      // Cargar flashcards del curso
      if (user?.id) {
        try {
          const { getFlashcardsByCourse, getFlashcardsWithProgress } = await import('../services/flashcardService');
          const allFlashcards = await getFlashcardsByCourse(courseId);
          setTotalFlashcards(allFlashcards.length);

          // Obtener flashcards con progreso para contar las dominadas
          if (allFlashcards.length > 0) {
            const flashcardsWithProgress = await getFlashcardsWithProgress(courseId, user.id);
            const masteredCount = flashcardsWithProgress.filter(
              f => f.progress && f.progress.mastery_level >= 4
            ).length;
            setCompletedFlashcards(masteredCount);
          }
        } catch (err) {
          console.warn('Error loading flashcards:', err);
        }
      }

      // Agrupar sesiones por unidad
      const groupedSessions: Record<string, Session[]> = {};
      sessionsData.forEach(session => {
        const unitId = session.unit_id || 'sin-unidad';
        if (!groupedSessions[unitId]) {
          groupedSessions[unitId] = [];
        }
        groupedSessions[unitId].push(session);
      });
      setSessionsByUnit(groupedSessions);

      // Expandir automáticamente la primera unidad
      if (unitsData.length > 0) {
        setExpandedUnits(new Set([unitsData[0].id]));
      }

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

      // Cargar enrollment del estudiante para obtener progreso
      if (user?.id) {
        try {
          const enrollments = await courseEnrollmentService.getStudentEnrollments(user.id);
          const courseEnrollment = enrollments.find(e => e.course_id === courseId);
          if (courseEnrollment) {
            setEnrollment(courseEnrollment);
          }
        } catch (err) {
          console.error('Error loading enrollment:', err);
        }
      }

      // Cargar quizzes publicados del curso
      try {
        const courseQuizzes = await quizService.getCourseAssessments(courseId, ['quiz', 'trivia', 'exam']);

        // Separar quizzes por unidad, generales (sin unidad) y examen final
        const grouped: Record<string, Assessment[]> = {};
        const general: Assessment[] = [];
        let finalExam: Assessment | null = null;

        courseQuizzes.forEach(quiz => {
          // Si es examen final, guardarlo por separado
          if (quiz.is_final_exam && quiz.assessment_type === 'exam') {
            finalExam = quiz;
          } else if (quiz.unit_id) {
            if (!grouped[quiz.unit_id]) {
              grouped[quiz.unit_id] = [];
            }
            grouped[quiz.unit_id].push(quiz);
          } else {
            // Quizzes generales del curso (sin unidad específica y que no sean examen final)
            general.push(quiz);
          }
        });

        setQuizzesByUnit(grouped);
        setGeneralQuizzes(general);
        setFinalExam(finalExam);
      } catch (err) {
        console.error('Error loading quizzes:', err);
      }

      // Cargar progreso de unidades, sesiones y quizzes completados
      if (user?.id) {
        try {
          // Progreso de unidades
          const { data: unitProgressData } = await supabase
            .from('unit_progress')
            .select('unit_id')
            .eq('student_id', user.id)
            .eq('course_id', courseId)
            .eq('is_completed', true);

          if (unitProgressData) {
            const completedUnitIds = new Set(unitProgressData.map(up => up.unit_id));
            setCompletedUnits(completedUnitIds);
          }

          // Progreso de sesiones
          const { data: sessionProgressData } = await supabase
            .from('session_progress')
            .select('session_id')
            .eq('student_id', user.id)
            .eq('course_id', courseId)
            .eq('is_completed', true);

          if (sessionProgressData) {
            const completedSessionIds = new Set(sessionProgressData.map(sp => sp.session_id).filter(Boolean));
            setCompletedSessions(completedSessionIds);
          }

          // Progreso de quizzes - cargar después de que se hayan cargado los quizzes
          // Esto se hará en un useEffect separado
        } catch (err) {
          console.error('Error loading progress:', err);
        }
      }
    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(unitId)) {
        newSet.delete(unitId);
      } else {
        newSet.add(unitId);
      }
      return newSet;
    });
  };

  const toggleMaterialsGroup = (groupId: string) => {
    setExpandedMaterialsGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Función auxiliar para detectar si un material es un video
  const isVideoMaterial = (material: Material): boolean => {
    if (material.kind === 'video') return true;
    if (!material.url) return false;
    const transcriptService = new VideoTranscriptService();
    const platform = transcriptService.detectPlatform(material.url);
    return platform !== null;
  };











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
        <Button onClick={() => navigate('/my/courses')} className="mt-4">
          Volver a Mis Cursos
        </Button>
      </div>
    );
  }

  // ==========================================
  // Variables Filtradas para Renderizado (MOVIDAS AL INICIO)
  // ==========================================


  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Mis Cursos', path: '/my/courses' },
          { label: course.title }
        ]}
      />

      {/* Header del Curso */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
            {course.code && (
              <p className="text-gray-600 mb-3">Código: {course.code}</p>
            )}
            {course.description && (
              <p className="text-gray-700 mb-4">{course.description}</p>
            )}

            {/* Información Académica */}
            {(subject || career) && (
              <div className="flex flex-wrap gap-4 text-sm mt-4">
                {subject && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Materia:</span>
                    <span className="font-medium">{subject.name}</span>
                  </div>
                )}
                {career && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Carrera:</span>
                    <span className="font-medium">{career.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Indicador de Progreso */}
            {enrollment && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <ProgressIndicator
                  value={enrollment.completion_percentage || 0}
                  label="Progreso del Curso"
                  showIcon={true}
                  size="md"
                  showPercentage={true}
                />
                {enrollment.time_spent_minutes > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Tiempo invertido: {Math.round(enrollment.time_spent_minutes / 60)} horas {enrollment.time_spent_minutes % 60} minutos
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-2 ml-4 flex-wrap">
            <Link to={`/assignments?courseId=${course.id}`}>
              <Button variant="secondary" leftIcon={<IconClipboardList className="w-5 h-5" />}>
                Ver Tareas
              </Button>
            </Link>
            <Link to={`/sessions?courseId=${course.id}`}>
              <Button variant="secondary" leftIcon={<IconBookOpen className="w-5 h-5" />}>
                Ver Todas las Sesiones
              </Button>
            </Link>
            <Link to={`/tutor?courseId=${course.id}`}>
              <Button variant="primary" leftIcon={<IconRobot className="w-5 h-5" />}>
                Abrir Tutor
              </Button>
            </Link>
            <Link to={`/courses/${course.id}/flashcards`}>
              <Button variant="secondary" leftIcon={<IconCards className="w-5 h-5" />}>
                Estudiar Flashcards
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Componente de Gamificación con Score */}
      {user && (
        <div className="space-y-4">
          <GamificationScore
            totalUnits={visibleUnits.length}
            completedUnits={completedUnits.size}
            totalSessions={Object.values(visibleSessionsByUnit).flat().length}
            completedSessions={completedSessions.size}
            totalQuizzes={Object.values(visibleQuizzesByUnit).flat().length + visibleGeneralQuizzes.length + (visibleFinalExam ? 1 : 0)}
            completedQuizzes={completedQuizzes.size}
            totalFlashcards={totalFlashcards}
            completedFlashcards={completedFlashcards}
            overallProgress={enrollment?.completion_percentage || 0}
          />
          <div className="flex justify-end">
            <Link
              to={`/courses/${id}/my-report`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <IconRobot className="w-4 h-4" />
              Ver Mi Informe Comprehensivo
            </Link>
          </div>
        </div>
      )}

      {/* Módulos y Sesiones */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Contenido del Curso</h2>

        {visibleUnits.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <IconBookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Este curso aún no tiene módulos definidos o disponibles actualmente.</p>
            </div>
          </Card>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">Total de unidades: {visibleUnits.length}</p>
            {visibleUnits.map((unit, unitIndex) => {
              const unitSessions = visibleSessionsByUnit[unit.id] || [];
              // Excluir materiales asociados a sesiones Y materiales solo para RAG (no mostrar a estudiantes)
              const unitMaterials = materials.filter((material) =>
                material.unit_id === unit.id && 
                !material.session_id &&
                material.purpose !== 'rag' // Excluir materiales solo para RAG
              );
              const isExpanded = expandedUnits.has(unit.id);

              // Colores alternados para cada unidad
              const unitColors = [
                { border: 'border-blue-500', bg: 'bg-blue-50', icon: 'bg-blue-100', text: 'text-blue-700', hover: 'hover:bg-blue-100', borderLight: 'border-blue-200' },
                { border: 'border-purple-500', bg: 'bg-purple-50', icon: 'bg-purple-100', text: 'text-purple-700', hover: 'hover:bg-purple-100', borderLight: 'border-purple-200' },
                { border: 'border-green-500', bg: 'bg-green-50', icon: 'bg-green-100', text: 'text-green-700', hover: 'hover:bg-green-100', borderLight: 'border-green-200' },
                { border: 'border-orange-500', bg: 'bg-orange-50', icon: 'bg-orange-100', text: 'text-orange-700', hover: 'hover:bg-orange-100', borderLight: 'border-orange-200' },
                { border: 'border-indigo-500', bg: 'bg-indigo-50', icon: 'bg-indigo-100', text: 'text-indigo-700', hover: 'hover:bg-indigo-100', borderLight: 'border-indigo-200' },
                { border: 'border-pink-500', bg: 'bg-pink-50', icon: 'bg-pink-100', text: 'text-pink-700', hover: 'hover:bg-pink-100', borderLight: 'border-pink-200' },
              ];
              const colorScheme = unitColors[unitIndex % unitColors.length];

              return (
                <Card key={unit.id} className={`overflow-hidden border-l-4 ${colorScheme.border} shadow-md hover:shadow-lg transition-all duration-200`}>
                  <div
                    className={`cursor-pointer p-5 ${colorScheme.bg} ${colorScheme.hover} transition-colors`}
                    onClick={() => toggleUnit(unit.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex-shrink-0 w-12 h-12 ${colorScheme.icon} rounded-full flex items-center justify-center shadow-sm border-2 ${colorScheme.borderLight}`}>
                          <span className={`${colorScheme.text} font-bold text-lg`}>
                            {unit.number}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <IconBookOpen className={`w-5 h-5 ${colorScheme.text} opacity-70`} />
                            <h3 className={`text-xl font-bold ${colorScheme.text}`}>
                              {unit.title}
                            </h3>
                          </div>
                          {unit.description && (
                            <p className="text-sm text-gray-700 mt-1 line-clamp-2">{unit.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <IconBookOpen className="w-4 h-4" />
                              {unitSessions.length} {unitSessions.length === 1 ? 'sesión' : 'sesiones'}
                            </span>
                            {unitMaterials.length > 0 && (
                              <span className="flex items-center gap-1">
                                <IconClipboardList className="w-4 h-4" />
                                {unitMaterials.length} {unitMaterials.length === 1 ? 'material' : 'materiales'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {completedUnits.has(unit.id) && (
                          <div className={`w-8 h-8 ${colorScheme.icon} rounded-full flex items-center justify-center shadow-sm`}>
                            <IconCheck className={`w-5 h-5 ${colorScheme.text}`} />
                          </div>
                        )}
                        <IconChevronRight
                          className={`w-6 h-6 ${colorScheme.text} transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                        />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 space-y-4">
                      {/* Contenido de la Unidad */}
                      {unit.content_html && (
                        <div className="prose prose-sm max-w-none">
                          <RichTextDisplay content={unit.content_html} />
                        </div>
                      )}
                      {!unit.content_html && unit.content_markdown && (
                        <div className="prose prose-sm max-w-none">
                          <div className="unit-content whitespace-pre-wrap">
                            {unit.content_markdown}
                          </div>
                        </div>
                      )}
                      {!unit.content_html && !unit.content_markdown && unit.description && (
                        <div className="prose prose-sm max-w-none">
                          <p className="text-gray-700">{unit.description}</p>
                        </div>
                      )}

                      {/* Objetivos de Aprendizaje */}
                      {unit.learning_objectives && unit.learning_objectives.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-blue-900 mb-2">
                            Objetivos de Aprendizaje
                          </h4>
                          <ul className="list-disc list-inside space-y-1">
                            {unit.learning_objectives.map((objective, idx) => (
                              <li key={idx} className="text-sm text-blue-800">{objective}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Sesiones - Mejorada jerarquía visual - Ahora aparecen después de los objetivos */}
                      {unitSessions.length > 0 && (
                        <div className="border-l-4 border-blue-300 bg-blue-50/50 rounded-r-lg p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <IconBookOpen className="w-5 h-5 text-blue-600" />
                            <h4 className="text-base font-semibold text-gray-900">
                              Sesiones de esta Unidad ({unitSessions.length})
                            </h4>
                          </div>
                          <p className="text-xs text-gray-600 mb-3">
                            Estas sesiones forman parte de la unidad "{unit.title}". Haz clic en cada una para acceder al contenido.
                          </p>
                          <div className="space-y-2 ml-2">
                            {unitSessions
                              .sort((a, b) => {
                                // Ordenar por order_index si existe, sino por fecha
                                if (a.order_index !== null && b.order_index !== null) {
                                  return a.order_index - b.order_index;
                                }
                                if (a.starts_at && b.starts_at) {
                                  return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
                                }
                                return 0;
                              })
                              .map((session, index) => (
                                <Link
                                  key={session.id}
                                  to={`/session/${session.id}`}
                                  className="block p-3 bg-white border-l-2 border-blue-400 rounded-r-lg hover:border-blue-600 hover:bg-blue-50 transition-all group shadow-sm"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold">
                                          {index + 1}
                                        </span>
                                        <h5 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                                          {session.title}
                                        </h5>
                                      </div>
                                      {session.description && (
                                        <p className="text-xs text-gray-600 line-clamp-2 mb-2 ml-8">
                                          {session.description}
                                        </p>
                                      )}
                                      {session.starts_at && (
                                        <div className="flex items-center gap-1 text-xs text-gray-500 ml-8">
                                          <IconCalendar className="w-3 h-3" />
                                          <span>
                                            {new Date(session.starts_at).toLocaleDateString('es-ES', {
                                              weekday: 'long',
                                              year: 'numeric',
                                              month: 'long',
                                              day: 'numeric'
                                            })}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <IconChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 ml-3" />
                                  </div>
                                </Link>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Botón de "Entendido" */}
                      {(() => {
                        const isCompleted = completedUnits.has(unit.id);
                        const isMarking = markingUnit === unit.id;

                        return (
                          <div className={`border rounded-lg p-4 transition-colors ${isCompleted
                            ? 'bg-green-100 border-green-300'
                            : 'bg-green-50 border-green-200'
                            }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className={`text-sm font-semibold mb-1 flex items-center gap-2 ${isCompleted ? 'text-green-800' : 'text-green-900'
                                  }`}>
                                  {isCompleted && <IconCheck className="w-5 h-5 text-green-600" />}
                                  {isCompleted ? '¡Contenido Leído!' : '¡Contenido Leído!'}
                                </h4>
                                <p className={`text-xs ${isCompleted ? 'text-green-800' : 'text-green-700'
                                  }`}>
                                  {isCompleted
                                    ? 'Esta unidad ya fue marcada como leída. Tu comprensión se evaluará en las actividades y tareas del curso.'
                                    : 'Marca esta unidad como leída. Tu comprensión se evaluará en las actividades y tareas del curso.'
                                  }
                                </p>
                              </div>
                              <button
                                onClick={async () => {
                                  if (!user?.id || isCompleted || isMarking) return;
                                  setMarkingUnit(unit.id);
                                  try {
                                    // Marcar unidad como accedida (método simplificado)
                                    await progressService.completeSession(
                                      user.id,
                                      unit.id,
                                      parseInt(id!),
                                      unit.id,
                                      { timeSpentMinutes: 15 }
                                    );
                                    // Actualizar estado local inmediatamente
                                    setCompletedUnits(prev => new Set(prev).add(unit.id));
                                  } catch (err) {
                                    console.error('Error:', err);
                                    alert('Error al marcar la unidad como leída');
                                  } finally {
                                    setMarkingUnit(null);
                                  }
                                }}
                                disabled={isCompleted || isMarking}
                                className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${isCompleted
                                  ? 'bg-green-500 text-white cursor-not-allowed opacity-75'
                                  : isMarking
                                    ? 'bg-green-400 text-white cursor-wait'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                  }`}
                              >
                                {isMarking ? (
                                  <>
                                    <span className="animate-spin">⏳</span>
                                    Procesando...
                                  </>
                                ) : isCompleted ? (
                                  <>
                                    <IconCheck className="w-4 h-4" />
                                    Leído ✓
                                  </>
                                ) : (
                                  <>
                                    <IconCheck className="w-4 h-4" />
                                    Entendido ✓
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Quizzes/Evaluaciones - Mejorada jerarquía visual */}
                      {(() => {
                        const unitQuizzes = visibleQuizzesByUnit[unit.id] || [];
                        if (unitQuizzes.length === 0) return null;

                        const typeLabels: Record<string, string> = {
                          'quiz': 'Quiz',
                          'trivia': 'Trivia',
                          'exam': 'Examen',
                          'project': 'Proyecto',
                          'assignment': 'Tarea'
                        };
                        const typeColors: Record<string, string> = {
                          'quiz': 'bg-blue-100 text-blue-700 border-blue-300',
                          'trivia': 'bg-purple-100 text-purple-700 border-purple-300',
                          'exam': 'bg-red-100 text-red-700 border-red-300',
                          'project': 'bg-green-100 text-green-700 border-green-300',
                          'assignment': 'bg-yellow-100 text-yellow-700 border-yellow-300'
                        };

                        return (
                          <div className="border-l-4 border-purple-300 bg-purple-50/50 rounded-r-lg p-4 space-y-3 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <IconClipboardCheck className="w-5 h-5 text-purple-600" />
                              <h4 className="text-base font-semibold text-gray-900">
                                Evaluaciones de esta Unidad ({unitQuizzes.length})
                              </h4>
                            </div>
                            <p className="text-xs text-gray-600 mb-3">
                              Estas evaluaciones forman parte de la unidad "{unit.title}". Completa estas actividades para medir tu comprensión del contenido.
                            </p>
                            <div className="space-y-2 ml-2">
                              {unitQuizzes.map((quiz, index) => (
                                <Link
                                  key={quiz.id}
                                  to={`/quiz/${quiz.id}`}
                                  className={`block p-3 bg-white border-l-2 rounded-r-lg hover:shadow-md transition-all group shadow-sm ${typeColors[quiz.assessment_type]?.split(' ')[2] || 'border-gray-300'
                                    } hover:border-opacity-100`}
                                  style={{
                                    borderLeftColor: typeColors[quiz.assessment_type]?.includes('blue') ? '#93c5fd' :
                                      typeColors[quiz.assessment_type]?.includes('purple') ? '#c4b5fd' :
                                        typeColors[quiz.assessment_type]?.includes('red') ? '#fca5a5' :
                                          typeColors[quiz.assessment_type]?.includes('green') ? '#86efac' :
                                            typeColors[quiz.assessment_type]?.includes('yellow') ? '#fde047' : '#d1d5db'
                                  }}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${typeColors[quiz.assessment_type] || 'bg-gray-100 text-gray-700'
                                          }`}>
                                          {index + 1}
                                        </span>
                                        <h5 className="text-sm font-semibold text-gray-900 group-hover:text-purple-700">
                                          {quiz.title}
                                        </h5>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeColors[quiz.assessment_type] || 'bg-gray-100 text-gray-700'
                                          }`}>
                                          {typeLabels[quiz.assessment_type] || quiz.assessment_type}
                                        </span>
                                      </div>
                                      {quiz.description && (
                                        <p className="text-xs text-gray-600 line-clamp-2 mb-2 ml-8">
                                          {quiz.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap ml-8">
                                        {quiz.time_limit && (
                                          <div className="flex items-center gap-1">
                                            <IconClock className="w-3 h-3" />
                                            <span>{quiz.time_limit} min</span>
                                          </div>
                                        )}
                                        {quiz.max_attempts && (
                                          <span>{quiz.max_attempts} intento{quiz.max_attempts > 1 ? 's' : ''}</span>
                                        )}
                                        {quiz.passing_score && (
                                          <span>Aprobar: {quiz.passing_score}%</span>
                                        )}
                                      </div>
                                    </div>
                                    <IconChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0 ml-3" />
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Videos de la Unidad */}
                      {unitMaterials.filter(isVideoMaterial).length > 0 && (
                        <div className="space-y-4 mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Videos ({unitMaterials.filter(isVideoMaterial).length})
                          </h4>
                          <div className="space-y-6">
                            {unitMaterials.filter(isVideoMaterial).map((material) => (
                              <div key={material.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <MaterialDisplay
                                  material={material}
                                  showFullPlayer={true}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Otros Materiales de la Unidad */}
                      {(() => {
                        const otherMaterials = unitMaterials.filter(m => !isVideoMaterial(m));
                        if (otherMaterials.length === 0) return null;

                        const groupId = `unit-${unit.id}-materials`;
                        const isExpanded = expandedMaterialsGroups.has(groupId);
                        const shouldCollapse = otherMaterials.length > 1;

                        return (
                          <div className="space-y-2">
                            <div 
                              className={`flex items-center justify-between ${shouldCollapse ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors' : ''}`}
                              onClick={shouldCollapse ? () => toggleMaterialsGroup(groupId) : undefined}
                            >
                              <h4 className="text-sm font-semibold text-gray-900">
                                Material de la unidad ({otherMaterials.length})
                              </h4>
                              {shouldCollapse && (
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <IconChevronUp className="w-5 h-5 text-gray-600" />
                                  ) : (
                                    <IconChevronDown className="w-5 h-5 text-gray-600" />
                                  )}
                                </div>
                              )}
                            </div>
                            {(isExpanded || !shouldCollapse) && (
                              <div className="space-y-2">
                                {otherMaterials.map((material) => (
                                  <MaterialDisplay
                                    key={material.id}
                                    material={material}
                                    showFullPlayer={false}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </Card>
              );
            })}
          </>
        )
        }

        {/* Sesiones sin módulo asignado */}
        {
          visibleSessionsByUnit['sin-unidad'] && visibleSessionsByUnit['sin-unidad'].length > 0 && (
            <Card>
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Sesiones sin Módulo
                </h3>
                <div className="space-y-2">
                  {visibleSessionsByUnit['sin-unidad'].map((session) => (
                    <Link
                      key={session.id}
                      to={`/session/${session.id}`}
                      className="block p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900">{session.title}</h4>
                          {session.description && (
                            <p className="text-xs text-gray-600 mt-1">{session.description}</p>
                          )}
                        </div>
                        <IconEye className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          )
        }
      </div >

      {/* Evaluaciones Generales del Curso (sin unidad específica) */}
      {
        visibleGeneralQuizzes.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Evaluaciones Generales</h2>
            <div className="space-y-2">
              {visibleGeneralQuizzes.map((quiz) => {
                const typeLabels: Record<string, string> = {
                  'quiz': 'Quiz',
                  'trivia': 'Trivia',
                  'exam': 'Examen',
                  'project': 'Proyecto',
                  'assignment': 'Tarea'
                };
                const typeColors: Record<string, string> = {
                  'quiz': 'bg-blue-100 text-blue-700',
                  'trivia': 'bg-purple-100 text-purple-700',
                  'exam': 'bg-red-100 text-red-700',
                  'project': 'bg-green-100 text-green-700',
                  'assignment': 'bg-yellow-100 text-yellow-700'
                };

                return (
                  <Link
                    key={quiz.id}
                    to={`/quiz/${quiz.id}`}
                    className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <IconClipboardCheck className="w-5 h-5 text-primary flex-shrink-0" />
                          <h4 className="text-base font-semibold text-gray-900 group-hover:text-primary">
                            {quiz.title}
                          </h4>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${typeColors[quiz.assessment_type] || 'bg-gray-100 text-gray-700'}`}>
                            {typeLabels[quiz.assessment_type] || quiz.assessment_type}
                          </span>
                        </div>
                        {quiz.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {quiz.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          {quiz.time_limit && (
                            <div className="flex items-center gap-1">
                              <IconClock className="w-3 h-3" />
                              <span>{quiz.time_limit} minutos</span>
                            </div>
                          )}
                          {quiz.max_attempts && (
                            <span>{quiz.max_attempts} intento{quiz.max_attempts > 1 ? 's' : ''}</span>
                          )}
                          {!quiz.max_attempts && (
                            <span className="text-green-600 font-medium">Intentos ilimitados</span>
                          )}
                          {quiz.passing_score && (
                            <span>Aprobar: {quiz.passing_score}%</span>
                          )}
                        </div>
                      </div>
                      <IconChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0 ml-3" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        )
      }

      {/* Examen Final */}
      {
        visibleFinalExam && visibleFinalExam.is_published && visibleFinalExam.is_active && (
          <Card className="mb-6 border-2 border-red-200 bg-red-50">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <IconClipboardCheck className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-red-900">Examen Final</h2>
                  <p className="text-sm text-red-700 mt-1">
                    Evaluación final del curso
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-red-200 mb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {finalExam.title}
                    </h3>
                    {finalExam.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {finalExam.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {finalExam.time_limit && (
                        <span className="flex items-center gap-1">
                          <IconClock className="w-4 h-4" />
                          {finalExam.time_limit} minutos
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <IconClipboardList className="w-4 h-4" />
                        {finalExam.total_points} puntos
                      </span>
                      {finalExam.passing_score && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          Aprobación: {finalExam.passing_score}%
                        </span>
                      )}
                      {finalExam.max_attempts && (
                        <span className="text-xs text-gray-500">
                          Máximo {finalExam.max_attempts} {finalExam.max_attempts === 1 ? 'intento' : 'intentos'}
                        </span>
                      )}
                    </div>
                    {finalExam.instructions && (
                      <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-1">Instrucciones:</p>
                        <p className="text-xs text-gray-600 whitespace-pre-wrap">
                          {finalExam.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Link to={`/quiz/${finalExam.id}`}>
                <Button
                  variant="primary"
                  className="w-full"
                  leftIcon={<IconClipboardCheck className="w-5 h-5" />}
                >
                  Realizar Examen Final
                </Button>
              </Link>
            </div>
          </Card>
        )
      }

      {/* Materiales generales del curso (sin unidad y sin sesión, excluyendo materiales solo para RAG) */}
      {
        materials.filter((material) => 
          !material.unit_id && 
          !material.session_id && 
          material.purpose !== 'rag' // Excluir materiales solo para RAG
        ).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">Materiales del Curso</h2>

            {/* Videos generales del curso (sin unidad y sin sesión, excluyendo materiales solo para RAG) */}
            {materials.filter((material) => 
              !material.unit_id && 
              !material.session_id && 
              material.purpose !== 'rag' && // Excluir materiales solo para RAG
              isVideoMaterial(material)
            ).length > 0 && (
              <Card className="mb-4">
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Videos del Curso ({materials.filter((material) => 
                      !material.unit_id && 
                      !material.session_id && 
                      material.purpose !== 'rag' && // Excluir materiales solo para RAG
                      isVideoMaterial(material)
                    ).length})
                  </h3>
                  <div className="space-y-6">
                    {materials
                      .filter((material) => 
                        !material.unit_id && 
                        !material.session_id && 
                        material.purpose !== 'rag' && // Excluir materiales solo para RAG
                        isVideoMaterial(material)
                      )
                      .map((material) => (
                        <div key={material.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <MaterialDisplay
                            material={material}
                            showFullPlayer={true}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Otros materiales generales del curso (sin unidad y sin sesión, excluyendo materiales solo para RAG) */}
            {(() => {
              const generalOtherMaterials = materials.filter((material) => 
                !material.unit_id && 
                !material.session_id && 
                material.purpose !== 'rag' && // Excluir materiales solo para RAG
                !isVideoMaterial(material)
              );
              
              if (generalOtherMaterials.length === 0) return null;

              const groupId = 'general-course-materials';
              const isExpanded = expandedMaterialsGroups.has(groupId);
              const shouldCollapse = generalOtherMaterials.length > 1;

              return (
                <Card>
                  <div className="p-4">
                    <div 
                      className={`flex items-center justify-between mb-4 ${shouldCollapse ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-lg -m-2 transition-colors' : ''}`}
                      onClick={shouldCollapse ? () => toggleMaterialsGroup(groupId) : undefined}
                    >
                      <h3 className="text-lg font-semibold text-gray-900">
                        Material del curso ({generalOtherMaterials.length})
                      </h3>
                      {shouldCollapse && (
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <IconChevronUp className="w-5 h-5 text-gray-600" />
                          ) : (
                            <IconChevronDown className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                      )}
                    </div>
                    {(isExpanded || !shouldCollapse) && (
                      <div className="space-y-2">
                        {generalOtherMaterials.map((material) => (
                          <MaterialDisplay
                            key={material.id}
                            material={material}
                            showFullPlayer={false}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}
          </div>
        )
      }
    </div >
  );
};

export default CourseViewPage;


// Force recompile
