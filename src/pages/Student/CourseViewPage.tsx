// pages/CourseViewPage.tsx
// Vista de curso para estudiantes - Muestra módulos y sesiones organizadas

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { courseService, Course } from '@/services/teacherCourses';
import { unitService, CourseUnit } from '@/services/teacherCourses';
import { sessionService, Session } from '@/services/teacherCourses';
import { materialService, Material } from '@/services/teacherCourses';
import { subjectService, careerService, Subject, Career } from '@/services/academicService';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import Breadcrumbs from '@/components/Common/Breadcrumbs';
import ProgressIndicator from '@/components/Common/ProgressIndicator';
import GamificationScore from '@/components/Features/GamificationScore';
import { IconBookOpen, IconChevronRight, IconCalendar, IconEye, IconRobot, IconClipboardList, IconClipboardCheck, IconClock, IconCards, IconCheck, IconChevronDown, IconChevronUp } from '@/components/Common/Icons';
import { Search, Filter, ArrowUpDown, X, Hash } from 'lucide-react';
import { MaterialDisplay } from '@/components/Features/MaterialDisplay';
import { useAuth } from '@/hooks/useAuth';
import { courseEnrollmentService, CourseEnrollment } from '@/services/academicService';
import { progressService } from '@/services/progressService';
import { quizService, Assessment } from '@/services/quizService';
import { VideoTranscriptService } from '@/services/videoTranscriptService';
import { supabase } from '@/lib/supabase';
import { RichTextDisplay } from '@/components/Common/RichTextDisplay';
import { InteractiveTutorial } from '@/components/Features/InteractiveTutorial';
import { useTutorial } from '@/hooks/useTutorial';
import { courseViewTutorial } from '@/config/tutorialConfigs';
import { HelpCircle } from 'lucide-react';
import { CourseScoreCard } from '@/components/Features/CourseScoreCard';
import { AIInsightsBanner } from '@/components/Features/AIInsightsBanner';
import { getFlashcardsByCourse, getFlashcardsWithProgress } from '@/services/flashcardService';

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
  const [isMaterialsSectionExpanded, setIsMaterialsSectionExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'modules' | 'materials' | 'exercises'>('modules');
  const [rawQuizzesCount, setRawQuizzesCount] = useState<number>(0);

  // Tutorial interactivo - se inicia automáticamente si es la primera vez
  const tutorial = useTutorial({
    tutorialId: 'course-view',
    autoStart: true, // Iniciar automáticamente si no está completado y no marcó "no volver a mostrar"
    showOnFirstVisit: true
  });

  // Estados para búsqueda, ordenamiento y filtros de materiales
  const [materialSearchQuery, setMaterialSearchQuery] = useState<string>('');
  const [materialSortBy, setMaterialSortBy] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'>('name-asc');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string>('all'); // 'all', 'pdf', 'video', 'link', 'other'
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string>('all'); // 'all' o categoría específica
  const [materialHashtagFilter, setMaterialHashtagFilter] = useState<string>('all'); // 'all' o hashtag específico

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

  // Calcular métricas para el ScoreCard
  const scoreMetrics = useMemo(() => {
    // Total de unidades y completadas
    const totalUnits = visibleUnits.length;
    const completedUnitsCount = completedUnits.size;

    // Total de sesiones y completadas (usando visibleSessionsByUnit)
    const allSessions = Object.values(visibleSessionsByUnit).flat();
    const totalSessions = allSessions.length;
    const completedSessionsCount = completedSessions.size;

    // Total de quizzes y completados
    const allQuizzes = [
      ...Object.values(visibleQuizzesByUnit).flat(),
      ...visibleGeneralQuizzes,
      ...(visibleFinalExam ? [visibleFinalExam] : [])
    ];
    const totalQuizzes = allQuizzes.length;
    const completedQuizzesCount = completedQuizzes.size;

    return {
      units: { total: totalUnits, completed: completedUnitsCount },
      sessions: { total: totalSessions, completed: completedSessionsCount },
      quizzes: { total: totalQuizzes, completed: completedQuizzesCount },
      flashcards: { total: totalFlashcards, completed: completedFlashcards }
    };
  }, [visibleUnits, completedUnits, visibleSessionsByUnit, completedSessions, visibleQuizzesByUnit, visibleGeneralQuizzes, visibleFinalExam, completedQuizzes, totalFlashcards, completedFlashcards]);

  // Función auxiliar para detectar si un material es un video
  const isVideoMaterial = useCallback((material: Material): boolean => {
    if (material.kind === 'video') return true;
    if (!material.url) return false;
    const transcriptService = new VideoTranscriptService();
    const platform = transcriptService.detectPlatform(material.url);
    return platform !== null;
  }, []);

  // ==========================================
  // Lógica de Filtrado y Ordenamiento de Materiales
  // ==========================================

  // Obtener materiales generales del curso (sin unidad y sin sesión)
  const generalCourseMaterials = useMemo(() => {
    return materials.filter((material) =>
      !material.unit_id &&
      !material.session_id &&
      material.purpose !== 'rag'
    );
  }, [materials]);

  // Obtener categorías únicas de los materiales (desde category o metadata)
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    generalCourseMaterials.forEach(material => {
      // Priorizar category del material, luego metadata.display_category, luego metadata.category
      const category = material.category ||
        material.metadata?.display_category ||
        material.metadata?.category ||
        'Sin categoría';
      categories.add(category);
    });
    return Array.from(categories).sort();
  }, [generalCourseMaterials]);

  // Obtener hashtags únicos de los materiales (desde metadata.hashtags)
  const availableHashtags = useMemo(() => {
    const hashtags = new Set<string>();
    generalCourseMaterials.forEach(material => {
      const materialHashtags = material.metadata?.hashtags;
      if (Array.isArray(materialHashtags)) {
        materialHashtags.forEach(tag => {
          if (typeof tag === 'string' && tag.trim()) {
            hashtags.add(tag.trim());
          }
        });
      } else if (typeof materialHashtags === 'string' && materialHashtags.trim()) {
        // Si es un string único, también lo agregamos
        hashtags.add(materialHashtags.trim());
      }
    });
    return Array.from(hashtags).sort();
  }, [generalCourseMaterials]);

  // Función auxiliar para obtener hashtags de un material
  const getMaterialHashtags = useCallback((material: Material): string[] => {
    const hashtags = material.metadata?.hashtags;
    if (Array.isArray(hashtags)) {
      return hashtags.filter(tag => typeof tag === 'string' && tag.trim()).map(tag => tag.trim());
    } else if (typeof hashtags === 'string' && hashtags.trim()) {
      return [hashtags.trim()];
    }
    return [];
  }, []);

  // Filtrar y ordenar materiales según búsqueda, filtros y ordenamiento
  const filteredAndSortedMaterials = useMemo(() => {
    let filtered = [...generalCourseMaterials];

    // 1. Filtro por búsqueda (nombre)
    if (materialSearchQuery.trim()) {
      const query = materialSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(material =>
        material.title.toLowerCase().includes(query) ||
        material.metadata?.description?.toLowerCase().includes(query) ||
        material.metadata?.category?.toLowerCase().includes(query)
      );
    }

    // 2. Filtro por tipo
    if (materialTypeFilter !== 'all') {
      if (materialTypeFilter === 'video') {
        filtered = filtered.filter(isVideoMaterial);
      } else {
        filtered = filtered.filter(material => {
          if (materialTypeFilter === 'pdf') return material.kind === 'pdf';
          if (materialTypeFilter === 'link') return material.kind === 'link';
          if (materialTypeFilter === 'other') return material.kind === 'other' || material.kind === 'markdown';
          return true;
        });
      }
    }

    // 3. Filtro por categoría
    if (materialCategoryFilter !== 'all') {
      filtered = filtered.filter(material => {
        const category = material.category ||
          material.metadata?.display_category ||
          material.metadata?.category ||
          'Sin categoría';
        return category === materialCategoryFilter;
      });
    }

    // 4. Filtro por hashtag
    if (materialHashtagFilter !== 'all') {
      filtered = filtered.filter(material => {
        const materialHashtags = getMaterialHashtags(material);
        return materialHashtags.includes(materialHashtagFilter);
      });
    }

    // 5. Ordenamiento
    filtered.sort((a, b) => {
      switch (materialSortBy) {
        case 'name-asc':
          return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
        case 'name-desc':
          return b.title.localeCompare(a.title, 'es', { sensitivity: 'base' });
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [generalCourseMaterials, materialSearchQuery, materialTypeFilter, materialCategoryFilter, materialHashtagFilter, materialSortBy, isVideoMaterial, getMaterialHashtags]);

  // Separar materiales en videos y otros
  const videoMaterials = useMemo(() =>
    filteredAndSortedMaterials.filter(isVideoMaterial),
    [filteredAndSortedMaterials, isVideoMaterial]
  );

  const otherMaterials = useMemo(() =>
    filteredAndSortedMaterials.filter(m => !isVideoMaterial(m)),
    [filteredAndSortedMaterials, isVideoMaterial]
  );

  const recommendedUnitId = useMemo(() => {
    if (visibleUnits.length === 0) return null;
    const nextPending = visibleUnits.find(unit => !completedUnits.has(unit.id));
    return (nextPending || visibleUnits[0]).id;
  }, [visibleUnits, completedUnits]);

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
        setRawQuizzesCount(courseQuizzes.length);

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
          } else if (quiz.session_id) {
            // ⭐ MEJORA: Buscar el unit_id de la sesión para agruparlo correctamente
            let foundUnitId: string | undefined;
            for (const unitId in groupedSessions) {
              if (groupedSessions[unitId].some(s => s.id === quiz.session_id)) {
                foundUnitId = unitId;
                break;
              }
            }

            if (foundUnitId) {
              if (!grouped[foundUnitId]) {
                grouped[foundUnitId] = [];
              }
              grouped[foundUnitId].push(quiz);
            } else {
              general.push(quiz);
            }
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

      {/* Header del Curso - Diseño Premium */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start mb-8 bg-white dark:bg-brand-dark p-6 rounded-xl border border-border shadow-sm">
        <div className="flex-1 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {enrollment && enrollment.status === 'active' && (
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 uppercase tracking-wide">
                En Progreso
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 uppercase tracking-wide flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span> IA Mejorada
            </span>
            {course.code && (
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wide">
                {course.code}
              </span>
            )}
          </div>
          <h1 className="text-text-dark dark:text-white text-3xl lg:text-4xl font-display font-black leading-tight tracking-[-0.033em] mb-3">
            {course.title}
          </h1>
          {course.description && (
            <p className="text-text-light dark:text-gray-400 text-base font-body font-normal leading-normal max-w-2xl mb-4">
              {course.description}
            </p>
          )}

          {/* Información Académica */}
          {(subject || career) && (
            <div className="flex flex-wrap gap-4 text-sm mb-4 text-gray-500">
              {subject && (
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">menu_book</span>
                  <span className="font-medium">{subject.name}</span>
                </div>
              )}
              {career && (
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">school</span>
                  <span className="font-medium">{career.name}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* NUEVO: Score Card (Reemplaza al Stats Grid anterior) */}
      <CourseScoreCard
        score={0} // TODO: Implementar lógica real de puntaje global
        level="Aprendiz" // TODO: Implementar niveles dinámicos
        progress={enrollment?.completion_percentage || 0}
        metrics={{
          units: scoreMetrics.units,
          sessions: scoreMetrics.sessions,
          quizzes: scoreMetrics.quizzes,
          flashcards: scoreMetrics.flashcards
        }}
      />

      {/* Módulos y Sesiones */}
      <div className="space-y-6" data-tutorial="units-section">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Columna Izquierda: Contenido Principal */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* Perspectiva IA - Banner Inteligente Funcional */}
            <AIInsightsBanner
              courseId={parseInt(id!)}
              metrics={scoreMetrics}
              visibleUnits={visibleUnits}
              completedUnits={completedUnits}
              completedSessions={completedSessions}
              completedQuizzes={completedQuizzes}
              visibleQuizzesByUnit={visibleQuizzesByUnit}
              generalQuizzes={visibleGeneralQuizzes}
              finalExam={visibleFinalExam}
              progress={enrollment?.completion_percentage || 0}
            />

            {/* Filtros de Contenido (Tabs) con Colores */}
            <div className="border-b border-border dark:border-gray-700 overflow-x-auto mb-6">
              <div className="flex gap-4 min-w-max p-1">
                <button
                  onClick={() => setActiveTab('modules')}
                  className={`group flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-bold text-sm transition-all duration-200 ${activeTab === 'modules'
                    ? 'border-brand-primary bg-brand-primary/5 text-brand-primary shadow-sm'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${activeTab === 'modules' ? 'icon-filled' : ''}`}>view_module</span>
                  Módulos de Aprendizaje
                </button>
                <button
                  onClick={() => setActiveTab('materials')}
                  className={`group flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-bold text-sm transition-all duration-200 ${activeTab === 'materials'
                    ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-sm'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${activeTab === 'materials' ? 'icon-filled' : ''}`}>folder_open</span>
                  Materiales de Estudio
                </button>
                <button
                  onClick={() => setActiveTab('exercises')}
                  className={`group flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-bold text-sm transition-all duration-200 ${activeTab === 'exercises'
                    ? 'border-purple-500 bg-purple-50 text-purple-600 shadow-sm'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${activeTab === 'exercises' ? 'icon-filled' : ''}`}>quiz</span>
                  Ejercicios Interactivos
                </button>
              </div>
            </div>

            {/* Contenido de Pestañas */}

            {/* 1. Módulos de Aprendizaje */}
            {activeTab === 'modules' && (
              <div className="space-y-4" data-tutorial="units-section">
                {visibleUnits.length === 0 ? (
                  <Card>
                    <div className="text-center py-8">
                      <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">auto_stories</span>
                      <p className="text-gray-600">Este curso aún no tiene módulos definidos o disponibles actualmente.</p>
                    </div>
                  </Card>
                ) : (
                  visibleUnits.map((unit, unitIndex) => {
                    const unitSessions = visibleSessionsByUnit[unit.id] || [];
                    const unitMaterials = materials.filter((material) =>
                      material.unit_id === unit.id &&
                      !material.session_id &&
                      material.purpose !== 'rag'
                    );
                    const isExpanded = expandedUnits.has(unit.id);
                    const isRecommended = unit.id === recommendedUnitId;
                    const isCompleted = completedUnits.has(unit.id);

                    // Definir temas de colores para rotación
                    const UNIT_THEMES = [
                      { activeBorder: 'border-blue-500', border: 'border-l-4 border-l-blue-500', text: 'text-blue-600', bgIcon: 'bg-blue-100 text-blue-600', ring: 'ring-blue-500/20' },
                      { activeBorder: 'border-purple-500', border: 'border-l-4 border-l-purple-500', text: 'text-purple-600', bgIcon: 'bg-purple-100 text-purple-600', ring: 'ring-purple-500/10' },
                      { activeBorder: 'border-emerald-500', border: 'border-l-4 border-l-emerald-500', text: 'text-emerald-600', bgIcon: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-500/20' },
                      { activeBorder: 'border-amber-500', border: 'border-l-4 border-l-amber-500', text: 'text-amber-600', bgIcon: 'bg-amber-100 text-amber-600', ring: 'ring-amber-500/20' },
                      { activeBorder: 'border-rose-500', border: 'border-l-4 border-l-rose-500', text: 'text-rose-600', bgIcon: 'bg-rose-100 text-rose-600', ring: 'ring-rose-500/20' },
                    ];
                    const theme = UNIT_THEMES[unitIndex % UNIT_THEMES.length];

                    return (
                      <div key={unit.id} className={`bg-white dark:bg-brand-dark rounded-xl transition-all duration-200 overflow-hidden ${isExpanded ? `border-2 ${theme.activeBorder} shadow-md` : `border border-border dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 ${theme.border}`}`}>
                        <div
                          className="cursor-pointer p-5 flex items-center justify-between group"
                          onClick={() => toggleUnit(unit.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`size-10 rounded-full flex items-center justify-center shrink-0 border transition-colors ${isCompleted
                              ? 'bg-green-100 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400'
                              : isRecommended
                                ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/30'
                                : `${theme.bgIcon} border-transparent`}`}>
                              {isCompleted ? (
                                <span className="material-symbols-outlined text-[20px]">check</span>
                              ) : (
                                <span className="font-bold text-sm">{unit.number}</span>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`text-base font-bold transition-colors ${isExpanded ? theme.text : 'text-text-dark dark:text-white'} group-hover:${theme.text}`}>
                                  {unit.title}
                                </h3>
                                {isRecommended && !isCompleted && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 uppercase tracking-wide">
                                    Siguiente
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-text-light dark:text-gray-400 flex items-center gap-3">
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">videocam</span> {unitSessions.length} Sesiones</span>
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">description</span> {unitMaterials.length} Recursos</span>
                              </p>
                            </div>
                          </div>

                          <button className={`size-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? `${theme.bgIcon}` : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                            <span className={`material-symbols-outlined transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>
                        </div>

                        {/* Contenido Expandido */}
                        {isExpanded && (
                          <div className="border-t border-border dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 p-4 animate-fade-in">
                            {/* Contenido HTML/Markdown */}
                            <div className="mb-6">
                              {unit.content_html ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  <RichTextDisplay content={unit.content_html} />
                                </div>
                              ) : unit.content_markdown ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                                  {unit.content_markdown}
                                </div>
                              ) : unit.description ? (
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{unit.description}</p>
                              ) : null}
                            </div>

                            {/* Objetivos de Aprendizaje */}
                            {unit.learning_objectives && unit.learning_objectives.length > 0 && (
                              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">target</span>
                                  Objetivos de Aprendizaje
                                </h4>
                                <ul className="space-y-1">
                                  {unit.learning_objectives.map((objective, idx) => (
                                    <li key={idx} className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                                      <span className="text-blue-400 mt-1.5 text-[6px] transform rotate-45">■</span>
                                      {objective}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Lista de Sesiones */}
                            {unitSessions.length > 0 && (
                              <div className="mb-6 space-y-2">
                                {unitSessions.map((session, idx) => (
                                  <Link
                                    key={session.id}
                                    to={`/session/${session.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-brand-dark border border-gray-200 dark:border-gray-700 hover:border-brand-primary hover:shadow-md transition-all group"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="size-8 rounded bg-gray-50 dark:bg-gray-800 text-brand-primary flex items-center justify-center shrink-0 group-hover:bg-brand-primary group-hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-text-dark dark:text-white group-hover:text-brand-primary transition-colors">{session.title}</p>
                                        <p className="text-xs text-text-light dark:text-gray-400">{session.duration_minutes ? `${session.duration_minutes} min` : 'Video Clase'}</p>
                                      </div>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-300 group-hover:text-brand-primary transform group-hover:translate-x-1 transition-all">chevron_right</span>
                                  </Link>
                                ))}
                              </div>
                            )}

                            {/* Evaluaciones (Quizzes) */}
                            {(() => {
                              const foundQuizzes = visibleQuizzesByUnit ? (visibleQuizzesByUnit[unit.id] || []) : [];
                              if (foundQuizzes.length === 0) return null;

                              return (
                                <div className="mb-6">
                                  <h4 className="text-sm font-bold text-text-dark dark:text-white mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-purple-500">assignment</span>
                                    Evaluaciones ({foundQuizzes.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {foundQuizzes.map((quiz) => (
                                      <div
                                        key={quiz.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 hover:border-purple-300 transition-all group"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="size-8 rounded flex items-center justify-center shrink-0 bg-white dark:bg-purple-900/30 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <span className="material-symbols-outlined text-[18px]">quiz</span>
                                          </div>
                                          <div>
                                            <p className="text-sm font-bold text-text-dark dark:text-white group-hover:text-purple-600 transition-colors">{quiz.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-text-light dark:text-gray-400">
                                              <span>{quiz.assessment_type === 'exam' ? 'Examen' : 'Cuestionario'}</span>
                                              {quiz.time_limit && <span>• {quiz.time_limit} min</span>}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          {/* Botón Práctica */}
                                          <Link to={`/quiz/${quiz.id}?mode=practice`} title="Modo Práctica (Sin calificación)">
                                            <button className="text-xs font-bold text-purple-600 bg-white dark:bg-transparent border border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/30 py-1.5 px-3 rounded transition-colors flex items-center gap-1">
                                              <span className="material-symbols-outlined text-[14px]">fitness_center</span>
                                              <span className="hidden sm:inline">Practicar</span>
                                            </button>
                                          </Link>

                                          {/* Botón Iniciar Real */}
                                          <Link to={`/quiz/${quiz.id}`}>
                                            <button className="text-xs font-bold text-white py-1.5 px-3 bg-purple-600 rounded hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-1">
                                              <span>Iniciar</span>
                                              <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                                            </button>
                                          </Link>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Materiales de la Unidad (No sesiones) */}
                            {unitMaterials.length > 0 && (
                              <div className="mb-6">
                                <h4 className="text-sm font-bold text-text-dark dark:text-white mb-2 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px] text-orange-500">folder_open</span>
                                  Recursos Adicionales
                                </h4>
                                <div className="space-y-2 pl-2 border-l-2 border-dashed border-gray-200 dark:border-gray-700">
                                  {unitMaterials.map((material) => (
                                    <div key={material.id} className="pl-4">
                                      <MaterialDisplay material={material} showFullPlayer={false} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Botón Marcar Leído */}
                            {!isCompleted && (
                              <div className="mt-4 flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!user?.id || isCompleted) return;
                                    // Lógica simplificada de marcado (similar a la original)
                                    setMarkingUnit(unit.id);
                                    progressService.completeSession(user.id, unit.id, parseInt(id!), unit.id, { timeSpentMinutes: 15 })
                                      .then(() => {
                                        setCompletedUnits(prev => new Set(prev).add(unit.id));
                                        setMarkingUnit(null);
                                      })
                                      .catch(() => setMarkingUnit(null));
                                  }}
                                  disabled={markingUnit === unit.id}
                                  className="text-xs font-bold text-brand-primary hover:bg-brand-primary/10 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                                >
                                  {markingUnit === unit.id ? 'Procesando...' : 'Marcar como completado'}
                                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 2. Materiales de Estudio (Contenido Unificado) */}
            {activeTab === 'materials' && (
              <div className="space-y-6 animate-fade-in">
                {/* Controles de búsqueda, filtros y ordenamiento */}
                <div className="bg-white dark:bg-brand-dark rounded-xl border border-border dark:border-gray-700 p-4 space-y-4 shadow-sm" data-tutorial="material-filters">
                  {/* Barra de búsqueda */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Buscar material por nombre..."
                      value={materialSearchQuery}
                      onChange={(e) => setMaterialSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm dark:text-white"
                    />
                    {materialSearchQuery && (
                      <button
                        onClick={() => setMaterialSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Filtros y ordenamiento */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <select
                        value={materialTypeFilter}
                        onChange={(e) => setMaterialTypeFilter(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm dark:text-white"
                      >
                        <option value="all">Todos los tipos</option>
                        <option value="pdf">PDF</option>
                        <option value="video">Video</option>
                        <option value="link">Enlace</option>
                        <option value="other">Otros</option>
                      </select>
                    </div>

                    {availableCategories.length > 0 && (
                      <div className="flex items-center gap-2">
                        <select
                          value={materialCategoryFilter}
                          onChange={(e) => setMaterialCategoryFilter(e.target.value)}
                          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm dark:text-white"
                        >
                          <option value="all">Todas las categorías</option>
                          {availableCategories.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {availableHashtags.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <select
                          value={materialHashtagFilter}
                          onChange={(e) => setMaterialHashtagFilter(e.target.value)}
                          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm dark:text-white"
                        >
                          <option value="all">Todos los hashtags</option>
                          {availableHashtags.map(hashtag => (
                            <option key={hashtag} value={hashtag}>#{hashtag}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-2 sm:ml-auto">
                      <ArrowUpDown className="w-4 h-4 text-gray-500" />
                      <select
                        value={materialSortBy}
                        onChange={(e) => setMaterialSortBy(e.target.value as any)}
                        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm dark:text-white"
                      >
                        <option value="name-asc">Nombre (A-Z)</option>
                        <option value="name-desc">Nombre (Z-A)</option>
                        <option value="date-desc">Más recientes</option>
                        <option value="date-asc">Más antiguos</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Lista de Materiales */}
                <div className="space-y-4">
                  {filteredAndSortedMaterials.length === 0 ? (
                    <Card className="p-8 text-center bg-white dark:bg-brand-dark border-border dark:border-gray-700">
                      <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No se encontraron materiales generales en este curso que coincidan con tus filtros.
                      </p>
                      <button
                        onClick={() => {
                          setMaterialSearchQuery('');
                          setMaterialTypeFilter('all');
                          setMaterialCategoryFilter('all');
                          setMaterialHashtagFilter('all');
                        }}
                        className="mt-4 text-brand-primary hover:text-blue-700 text-sm font-bold"
                      >
                        Limpiar filtros
                      </button>
                    </Card>
                  ) : (
                    <>
                      {/* Videos Destacados */}
                      {videoMaterials.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">videocam</span>
                            Videos del Curso ({videoMaterials.length})
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {videoMaterials.map((material) => (
                              <div key={material.id} className="bg-white dark:bg-brand-dark rounded-xl border border-border dark:border-gray-700 p-1 shadow-sm overflow-hidden">
                                <MaterialDisplay
                                  material={material}
                                  showFullPlayer={true}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Documentos y Enlaces */}
                      {otherMaterials.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2 pt-4">
                            <span className="material-symbols-outlined text-[18px]">description</span>
                            Recursos y Documentos ({otherMaterials.length})
                          </h3>
                          <div className="grid grid-cols-1 gap-2">
                            {otherMaterials.map((material) => (
                              <MaterialDisplay
                                key={material.id}
                                material={material}
                                showFullPlayer={false}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 3. Ejercicios Interactivos (Dashboard de Evaluación) */}
            {activeTab === 'exercises' && (
              <div className="space-y-6 animate-fade-in">
                {/* 1. Mazo de Flashcards del Curso */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">Gamificación Activa</span>
                        <span className="material-symbols-outlined text-yellow-300 animate-pulse text-sm icon-filled">stars</span>
                      </div>
                      <h3 className="text-2xl font-black font-display mb-2">Mazo de Flashcards</h3>
                      <p className="text-indigo-100 text-sm max-w-md mb-4">
                        Practica con el sistema de repetición espaciada para memorizar los conceptos clave de todo el curso.
                      </p>

                      {/* Progreso de Flashcards */}
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full transition-all duration-1000"
                            style={{ width: `${totalFlashcards > 0 ? (completedFlashcards / totalFlashcards) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold whitespace-nowrap">{completedFlashcards} / {totalFlashcards} dominadas</span>
                      </div>
                    </div>

                    <Link to={`/flashcards?courseId=${id}`} className="shrink-0">
                      <button className="bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-xl font-bold text-sm shadow-xl transition-all hover:scale-105 flex items-center gap-2">
                        <span className="material-symbols-outlined icon-filled">style</span>
                        Estudiar Ahora
                      </button>
                    </Link>
                  </div>
                  <span className="absolute -bottom-10 -right-10 text-[180px] text-white/10 select-none pointer-events-none material-symbols-outlined rotate-12">cards</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 2. Examen Final (Si existe) */}
                  {visibleFinalExam && (
                    <div className="bg-white dark:bg-brand-dark border-2 border-brand-primary/20 rounded-xl p-5 shadow-sm">
                      <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                        Examen Final del Curso
                      </h4>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-bold text-text-dark dark:text-white mb-1">{visibleFinalExam.title}</p>
                          <p className="text-xs text-text-light dark:text-gray-400 mb-4 leading-relaxed">
                            Esta es la evaluación final. Asegúrate de haber repasado todos los módulos antes de comenzar.
                          </p>
                          <div className="flex flex-wrap gap-3 mb-4">
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">timer</span> {visibleFinalExam.time_limit} min
                            </span>
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">grade</span> {visibleFinalExam.total_points} pts
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          {/* Botón Practicar */}
                          <Link to={`/quiz/${visibleFinalExam.id}?mode=practice`} title="Modo Práctica (Sin calificación)">
                            <button className="w-full bg-white text-brand-primary border border-brand-primary/30 hover:bg-blue-50 px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">fitness_center</span>
                              Practicar
                            </button>
                          </Link>

                          {/* Botón Iniciar Real */}
                          <Link to={`/quiz/${visibleFinalExam.id}`} className="shrink-0">
                            <button className="w-full bg-brand-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-lg">
                              Iniciar Examen
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Resumen de Evaluaciones */}
                  <div className="bg-white dark:bg-brand-dark border border-border dark:border-gray-700 rounded-xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">list_alt</span>
                      Todas las Evaluaciones
                    </h4>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {[
                        ...visibleGeneralQuizzes,
                        ...Object.values(visibleQuizzesByUnit).flat()
                      ]
                        .filter(q => q.id !== visibleFinalExam?.id)
                        .map((quiz) => (
                          <div
                            key={quiz.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-500/50 bg-gray-50/50 dark:bg-gray-900/20 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded bg-white dark:bg-gray-800 text-purple-500 flex items-center justify-center border border-purple-100 dark:border-purple-900/30 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-[18px]">{quiz.assessment_type === 'exam' ? 'assignment' : 'quiz'}</span>
                              </div>
                              <div>
                                <Link to={`/quiz/${quiz.id}`} className="hover:underline decoration-purple-500 underline-offset-2">
                                  <p className="text-sm font-bold text-text-dark dark:text-white group-hover:text-purple-600 transition-colors">{quiz.title}</p>
                                </Link>
                                <p className="text-[10px] text-text-light dark:text-gray-400">
                                  {quiz.questions_count || 0} preguntas • {quiz.assessment_type === 'trivia' ? 'Trivia' : 'Cuestionario'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Botón Practicar */}
                              <Link to={`/quiz/${quiz.id}?mode=practice`} title="Modo Práctica (Sin calificación)">
                                <button className="p-2 rounded-full text-gray-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                                  <span className="material-symbols-outlined text-[20px]">fitness_center</span>
                                </button>
                              </Link>

                              {/* Botón Iniciar */}
                              <Link to={`/quiz/${quiz.id}`} title="Iniciar Evaluación">
                                <button className="p-2 rounded-full text-gray-300 group-hover:text-purple-500 hover:bg-purple-50 transition-colors">
                                  <span className="material-symbols-outlined text-[24px]">play_circle</span>
                                </button>
                              </Link>
                            </div>
                          </div>
                        ))}

                      {visibleGeneralQuizzes.length === 0 && Object.values(visibleQuizzesByUnit).flat().length === 0 && (
                        <div className="text-center py-6">
                          {rawQuizzesCount > 0 ? (
                            <div className="flex flex-col items-center gap-2">
                              <span className="material-symbols-outlined text-amber-500">event_busy</span>
                              <p className="text-xs text-amber-600 font-medium">Hay evaluaciones programadas, pero aún no están disponibles para realizar.</p>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 italic">
                              No hay cuestionarios adicionales disponibles.
                              {user?.role?.name !== 'student' && " (Tip para Docente: verifica que estén publicados y marcados como activos)"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Sidebar (Tutor y Extras) */}
          <div className="lg:col-span-4 flex flex-col gap-6">

            {/* Tutor IA Widget */}
            <div className="flex flex-col rounded-xl overflow-hidden shadow-card border border-border dark:border-gray-700 bg-white dark:bg-brand-dark ring-1 ring-brand-primary/5">
              <div className="bg-gradient-to-r from-brand-primary to-blue-600 p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="size-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">Tutor IA Sparky</h3>
                    <p className="text-blue-100 text-xs flex items-center gap-1">
                      <span className="size-1.5 bg-green-400 rounded-full animate-pulse"></span> En línea
                    </p>
                  </div>
                </div>
                <button className="text-white/80 hover:text-white">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>

              <div className="h-64 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50 dark:bg-[#141d26]">
                {/* Mensaje Bienvenida */}
                <div className="flex items-start gap-2 max-w-[90%]">
                  <div className="size-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mt-1 shrink-0">
                    <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                  </div>
                  <div className="bg-white dark:bg-brand-dark border border-border dark:border-gray-700 p-3 rounded-2xl rounded-tl-none text-sm text-text-dark dark:text-white shadow-sm">
                    <p>¡Hola {user?.user_metadata?.full_name?.split(' ')[0] || 'Estudiante'}! Estoy aquí para ayudarte a entender los temas de este curso. ¿Tienes alguna duda sobre la última clase?</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-brand-dark border-t border-border dark:border-gray-700">
                <Link to={`/tutor?courseId=${id}`}>
                  <button className="w-full bg-brand-primary hover:bg-blue-600 text-white text-sm font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                    Abrir Chat Completo
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </button>
                </Link>
              </div>
            </div>

            {/* Próximo Examen Card */}
            {visibleFinalExam && (
              <div className="bg-white dark:bg-brand-dark rounded-xl border border-border dark:border-gray-700 p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-2 py-0.5 rounded">Importante</span>
                  <span className="material-symbols-outlined text-gray-400">event_note</span>
                </div>
                <h4 className="text-text-dark dark:text-white font-bold text-lg mb-1">{visibleFinalExam.title}</h4>
                <p className="text-text-light dark:text-gray-400 text-sm mb-4">Evaluación Final • {visibleFinalExam.total_points} Puntos</p>
                <Link to={`/quiz/${visibleFinalExam.id}`}>
                  <button className="w-full flex items-center justify-center gap-2 bg-white dark:bg-transparent border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white py-2.5 rounded-lg text-sm font-bold transition-all group">
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span> Comenzar
                  </button>
                </Link>
              </div>
            )}

            {/* Banner App Movil (Promo) */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-bold text-lg mb-1">Aprende donde sea</h4>
                <p className="text-white/80 text-sm mb-3">Descarga nuestra app y lleva tus clases offline.</p>
                <button className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors cursor-not-allowed opacity-80">
                  Próximamente
                </button>
              </div>
              <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl text-white/10 rotate-12">smartphone</span>
            </div>

          </div>
        </div>



        {/* Tutorial Interactivo */}
        <InteractiveTutorial
          config={courseViewTutorial}
          isOpen={tutorial.isOpen}
          onClose={tutorial.closeTutorial}
          onComplete={tutorial.completeTutorial}
          startStep={tutorial.startStep}
        />
      </div>
    </div>
  );
};
