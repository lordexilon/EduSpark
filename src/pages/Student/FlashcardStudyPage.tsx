// pages/FlashcardStudyPage.tsx
// Página para estudiantes estudiar flashcards con Spaced Repetition - Mobile-First Responsive 2-Column Layout

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  FlashcardWithProgress,
  getFlashcardsWithProgress,
  getFlashcardsToReview,
  recordFlashcardStudy,
  getFlashcardProgressStats,
} from '@/services/flashcardService';
import {
  courseService,
  Course,
  unitService,
  sessionService,
  CourseUnit,
  Session,
} from '@/services/teacherCourses';
import Button from '@/components/Common/Button';
import Card from '@/components/Common/Card';
import FlashcardCard from '@/components/Features/flashcards/FlashcardCard';
import {
  IconArrowLeft,
  IconBookOpen,
  IconCheckCircle,
  IconClock,
  IconTrendingUp,
  IconX,
} from '@/components/Common/Icons';

export const FlashcardStudyPage: React.FC = () => {
  const { courseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardWithProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studyMode, setStudyMode] = useState<'review' | 'all'>('review');
  const [stats, setStats] = useState({
    total: 0,
    mastered: 0,
    learning: 0,
    new: 0,
    dueToday: 0,
    masteryPercentage: 0,
  });
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    studied: 0,
    correct: 0,
    incorrect: 0,
  });

  useEffect(() => {
    if (courseId && user) {
      loadData();
    }
  }, [courseId, user, studyMode]);

  // Funciones de disponibilidad
  const normalizeDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const isUnitAvailable = (unit: CourseUnit, course: Course): boolean => {
    if (user?.role?.name !== 'student') return true;
    const now = new Date();

    if (unit.available_from && unit.available_until) {
      const start = new Date(unit.available_from);
      const end = new Date(unit.available_until);
      return now >= start && now <= end;
    }
    if (unit.available_from) return now >= new Date(unit.available_from);
    if (unit.available_until) return now <= new Date(unit.available_until);

    if (course?.start_date && course?.end_date) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const courseStart = normalizeDate(course.start_date);
      const courseEnd = normalizeDate(course.end_date);
      return today >= courseStart && today <= courseEnd;
    }
    return true;
  };

  const isSessionAvailable = (session: Session, units: CourseUnit[], course: Course): boolean => {
    if (user?.role?.name !== 'student') return true;
    const now = new Date();

    if (session.unit_id) {
      const parentUnit = units.find((u) => u.id === session.unit_id);
      if (parentUnit && !isUnitAvailable(parentUnit, course)) return false;
    }

    if (session.available_from && session.available_until) {
      const start = new Date(session.available_from);
      const end = new Date(session.available_until);
      return now >= start && now <= end;
    }
    if (session.available_from) return now >= new Date(session.available_from);
    if (session.available_until) return now <= new Date(session.available_until);

    if (session.starts_at && session.ends_at) {
      const start = new Date(session.starts_at);
      const end = new Date(session.ends_at);
      return now >= start && now <= end;
    }

    if (course?.start_date && course?.end_date) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const courseStart = normalizeDate(course.start_date);
      const courseEnd = normalizeDate(course.end_date);
      return today >= courseStart && today <= courseEnd;
    }
    return true;
  };

  const isFlashcardAvailable = (
    flashcard: FlashcardWithProgress,
    units: CourseUnit[],
    sessions: Session[],
    course: Course
  ): boolean => {
    if (user?.role?.name !== 'student') return true;
    const now = new Date();

    if (flashcard.session_id) {
      const parentSession = sessions.find((s) => s.id === flashcard.session_id);
      if (parentSession && !isSessionAvailable(parentSession, units, course)) return false;
    }

    if (flashcard.unit_id) {
      const parentUnit = units.find((u) => u.id === flashcard.unit_id);
      if (parentUnit && !isUnitAvailable(parentUnit, course)) return false;
    }

    if (flashcard.available_from && flashcard.available_until) {
      const start = new Date(flashcard.available_from);
      const end = new Date(flashcard.available_until);
      return now >= start && now <= end;
    }
    if (flashcard.available_from) return now >= new Date(flashcard.available_from);
    if (flashcard.available_until) return now <= new Date(flashcard.available_until);

    return true;
  };

  const loadData = async () => {
    if (!courseId || !user) return;

    try {
      setLoading(true);
      const courseIdNum = parseInt(courseId);

      const [courseData, unitsData, sessionsData] = await Promise.all([
        courseService.getCourse(courseIdNum),
        unitService.getCourseUnits(courseIdNum),
        sessionService.getCourseSessions(courseIdNum),
      ]);

      setCourse(courseData);

      let flashcardsData: FlashcardWithProgress[];
      if (studyMode === 'review') {
        flashcardsData = await getFlashcardsToReview(user.id, courseIdNum);
      } else {
        flashcardsData = await getFlashcardsWithProgress(courseIdNum, user.id);
      }

      const visibleFlashcards = flashcardsData.filter((f) =>
        isFlashcardAvailable(f, unitsData, sessionsData, courseData)
      );

      setFlashcards(visibleFlashcards);

      const statsData = await getFlashcardProgressStats(user.id, courseIdNum);
      setStats(statsData);

      if (visibleFlashcards.length > 0) {
        setCurrentIndex(0);
        setSessionComplete(false);
      } else {
        setSessionComplete(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (quality: number) => {
    if (!user || !flashcards[currentIndex]) return;

    try {
      const flashcard = flashcards[currentIndex];
      await recordFlashcardStudy(user.id, flashcard.id, quality);

      setSessionStats((prev) => ({
        studied: prev.studied + 1,
        correct: prev.correct + (quality >= 3 ? 1 : 0),
        incorrect: prev.incorrect + (quality < 3 ? 1 : 0),
      }));

      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSessionComplete(true);
        await loadData();
      }
    } catch (error) {
      console.error('Error recording answer:', error);
      alert('Error al registrar la respuesta');
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setSessionComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSessionComplete(false);
    setSessionStats({ studied: 0, correct: 0, incorrect: 0 });
    loadData();
  };

  if (loading) {
    return (
      <div className="fsp-loading">
        <div className="fsp-loading-inner">
          <div className="fsp-spinner" />
          <p>Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="fsp-page">
        <Card className="p-8 text-center max-w-lg mx-auto mt-20">
          <p className="text-gray-500 mb-6">Curso no encontrado</p>
          <Button onClick={() => navigate('/my/courses')}>Volver a Mis Cursos</Button>
        </Card>
      </div>
    );
  }

  const currentFlashcard = flashcards[currentIndex];
  const hasMore = currentIndex < flashcards.length - 1;
  const progressPercent =
    flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;

  return (
    <div className="fsp-page-v2">
      {/* ═══ Header Compacto Superior ═══ */}
      <div className="fsp-header-v2">
        <div className="fsp-header-content">
          <div className="fsp-header-left">
            <h1 className="fsp-title-v2">{course.title}</h1>
            <p className="fsp-subtitle-v2">Estudiando Flashcards</p>
          </div>
          <button onClick={() => navigate(`/courses/${courseId}`)} className="fsp-back-btn-v2">
            <IconArrowLeft className="w-4 h-4 mr-2" />
            <span>Volver</span>
          </button>
        </div>
      </div>

      {/* ═══ Layout de Dos Columnas ═══ */}
      <div className="fsp-main-grid">
        {/* COLUMNA IZQUIERDA: Stats y Controles */}
        <aside className="fsp-sidebar">
          <div className="fsp-sticky-sidebar">
            {/* Selector de Modo */}
            <div className="fsp-widget p-1">
              <div className="fsp-mode-switcher">
                <button
                  className={`fsp-mode-btn ${studyMode === 'review' ? 'active' : ''}`}
                  onClick={() => {
                    setStudyMode('review');
                    setCurrentIndex(0);
                    setSessionComplete(false);
                  }}
                >
                  <IconClock className="w-4 h-4" />
                  <span>Revisión ({stats.dueToday})</span>
                </button>
                <button
                  className={`fsp-mode-btn ${studyMode === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setStudyMode('all');
                    setCurrentIndex(0);
                    setSessionComplete(false);
                  }}
                >
                  <IconBookOpen className="w-4 h-4" />
                  <span>Todas ({stats.total})</span>
                </button>
              </div>
            </div>

            {/* Progreso de Sesión */}
            <div className="fsp-widget">
              <div className="fsp-progress-card">
                <div className="fsp-pc-header">
                  <span className="lbl">Progreso sesión</span>
                  <span className="val">
                    {currentIndex + 1} / {flashcards.length}
                  </span>
                </div>
                <div className="fsp-pc-bar">
                  <div className="fsp-pc-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            {/* Mini Stats Grid */}
            <div className="fsp-widget">
              <div className="fsp-mini-stats-grid">
                <div className="m-stat m-stat-blue">
                  <span className="v">{stats.total}</span>
                  <span className="l">Total</span>
                </div>
                <div className="m-stat m-stat-green">
                  <span className="v">{stats.mastered}</span>
                  <span className="l">Dominadas</span>
                </div>
                <div className="m-stat m-stat-yellow">
                  <span className="v">{stats.learning}</span>
                  <span className="l">Aprendiendo</span>
                </div>
                <div className="m-stat m-stat-purple">
                  <span className="v">{stats.masteryPercentage.toFixed(0)}%</span>
                  <span className="l">Dominio</span>
                </div>
              </div>
            </div>

            {/* Session Activity (Solo si ya respondió algunas) */}
            {sessionStats.studied > 0 && !sessionComplete && (
              <div className="fsp-widget">
                <div className="fsp-activity-box">
                  <p className="title">Sesión actual</p>
                  <div className="stats">
                    <span className="ok">
                      <IconCheckCircle className="w-3.5 h-3.5" />
                      {sessionStats.correct}
                    </span>
                    <span className="no">
                      <IconX className="w-3.5 h-3.5" />
                      {sessionStats.incorrect}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* COLUMNA DERECHA: Área de la Tarjeta */}
        <main className="fsp-content-area">
          {sessionComplete ? (
            <div className="fsp-complete-box">
              <div className="icon">
                <IconCheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="title">¡Excelente sesión!</h2>
              <p className="desc">Has terminado de estudiar las flashcards seleccionadas.</p>

              <div className="summary">
                <div className="item">
                  <span className="v">{sessionStats.studied}</span>
                  <span className="l">Estudiadas</span>
                </div>
                <div className="item">
                  <span className="v text-green-600">{sessionStats.correct}</span>
                  <span className="l">Correctas</span>
                </div>
              </div>

              <div className="actions">
                <Button variant="primary" onClick={handleRestart} className="w-full sm:w-auto">
                  Estudiar Otra Vez
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/courses/${courseId}`)}
                  className="w-full sm:w-auto"
                >
                  Volver al Curso
                </Button>
              </div>
            </div>
          ) : flashcards.length === 0 ? (
            <div className="fsp-empty-box">
              <IconBookOpen className="w-16 h-16 text-gray-300 mb-4" />
              <p>No hay flashcards pendientes en este modo.</p>
              <Button variant="secondary" onClick={() => setStudyMode('all')} className="mt-4">
                Ver Todas las Tarjetas
              </Button>
            </div>
          ) : (
            <div className="fsp-card-wrapper">
              <FlashcardCard
                key={currentFlashcard.id}
                flashcard={currentFlashcard}
                progress={currentFlashcard.progress}
                studyMode={true}
                onAnswer={handleAnswer}
              />

              {hasMore && (
                <div className="fsp-skip-zone">
                  <button onClick={handleNext} className="fsp-skip-link">
                    Saltar esta tarjeta →
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ═══ ESTILOS V2 ═══ */}
      <style>{`
        .fsp-page-v2 {
          background-color: #f8faff;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
        }

        /* Header V2 */
        .fsp-header-v2 {
          background: white;
          border-bottom: 1px solid #eef2f8;
          padding: 12px 16px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .fsp-header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .fsp-title-v2 {
          font-size: 1.1rem;
          font-weight: 800;
          color: #1a202c;
          margin: 0;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 200px;
        }
        .fsp-subtitle-v2 {
          font-size: 0.75rem;
          color: #718096;
          margin: 0;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        @media (min-width: 640px) {
          .fsp-title-v2 { font-size: 1.5rem; max-width: 500px; }
          .fsp-subtitle-v2 { font-size: 0.85rem; }
          .fsp-header-v2 { padding: 16px 24px; }
        }

        .fsp-back-btn-v2 {
          display: flex;
          align-items: center;
          padding: 8px 14px;
          border-radius: 12px;
          border: 1.5px solid #edf2f7;
          background: white;
          color: #4a5568;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .fsp-back-btn-v2:hover {
          border-color: #6366f1;
          color: #6366f1;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
        }

        /* Main Grid */
        .fsp-main-grid {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          padding: 16px;
          flex: 1;
        }
        
        @media (min-width: 1024px) {
          .fsp-main-grid {
            grid-template-columns: 320px 1fr;
            padding: 32px 24px;
            gap: 32px;
          }
        }

        /* Sidebar */
        .fsp-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .fsp-sticky-sidebar {
          position: sticky;
          top: 85px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .fsp-widget {
          background: white;
          border-radius: 16px;
          border: 1px solid #edf2f7;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        /* Mode Switcher */
        .fsp-mode-switcher {
          display: flex;
          background: #f7fafc;
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
        }
        .fsp-mode-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 8px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #718096;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .fsp-mode-btn.active {
          background: white;
          color: #6366f1;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        @media (min-width: 640px) {
          .fsp-mode-btn { flex-direction: row; justify-content: center; gap: 8px; font-size: 0.85rem; padding: 12px; }
        }

        /* Progress Card */
        .fsp-pc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .fsp-pc-header .lbl { font-size: 0.75rem; font-weight: 700; color: #4a5568; text-transform: uppercase; letter-spacing: 0.05em; }
        .fsp-pc-header .val { font-size: 1rem; font-weight: 800; color: #6366f1; }
        .fsp-pc-bar { height: 8px; background: #edf2f7; border-radius: 10px; overflow: hidden; }
        .fsp-pc-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); transition: width 0.4s ease; border-radius: 10px; }

        /* Mini Stats Grid */
        .fsp-mini-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .m-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          border-radius: 12px;
          border: 1.5px solid;
        }
        .m-stat .v { font-size: 1.1rem; font-weight: 800; line-height: 1; margin-bottom: 2px; }
        .m-stat .l { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; opacity: 0.8; }
        
        .m-stat-blue { background: #eff6ff; border-color: #dbeafe; color: #1d4ed8; }
        .m-stat-green { background: #f0fdf4; border-color: #dcfce7; color: #15803d; }
        .m-stat-yellow { background: #fffbeb; border-color: #fef3c7; color: #a16207; }
        .m-stat-purple { background: #faf5ff; border-color: #f3e8ff; color: #7c3aed; }

        /* Activity Box */
        .fsp-activity-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .fsp-activity-box .title { font-size: 0.8rem; font-weight: 700; color: #4a5568; margin: 0; }
        .fsp-activity-box .stats { display: flex; gap: 12px; }
        .fsp-activity-box .stats span { display: flex; align-items: center; gap: 4px; font-weight: 800; font-size: 0.85rem; }
        .fsp-activity-box .stats .ok { color: #16a34a; }
        .fsp-activity-box .stats .no { color: #dc2626; }

        /* Content Area */
        .fsp-content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .fsp-card-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Skip Zone */
        .fsp-skip-zone { display: flex; justify-content: center; margin-top: 12px; }
        .fsp-skip-link { 
          font-size: 0.85rem; 
          color: #718096; 
          font-weight: 600; 
          background: transparent; 
          border: none; 
          cursor: pointer; 
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .fsp-skip-link:hover { color: #1a202c; background: #edf2f7; }

        /* Boxes */
        .fsp-complete-box, .fsp-empty-box {
          background: white;
          border-radius: 24px;
          border: 1px solid #edf2f7;
          padding: 40px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.03);
          animation: fsp-fadeIn 0.4s ease-out;
        }
        .fsp-complete-box .title { font-size: 1.5rem; font-weight: 800; color: #1a202c; margin: 16px 0 8px; }
        .fsp-complete-box .desc { font-size: 0.95rem; color: #718096; margin: 0 0 24px; }
        
        .fsp-complete-box .summary { display: flex; gap: 32px; margin-bottom: 32px; }
        .fsp-complete-box .summary .item { display: flex; flex-direction: column; }
        .fsp-complete-box .summary .v { font-size: 2rem; font-weight: 900; }
        .fsp-complete-box .summary .l { font-size: 0.75rem; font-weight: 700; color: #718096; text-transform: uppercase; }
        
        .fsp-complete-box .actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }

        /* Spinner & Loading */
        .fsp-loading { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8faff; }
        .fsp-loading-inner { text-align: center; }
        .fsp-spinner { width: 44px; height: 44px; border: 4px solid #e2e8f0; border-top-color: #6366f1; border-radius: 50%; animation: fsp-spin 0.8s linear infinite; margin-bottom: 16px; }

        @keyframes fsp-spin { to { transform: rotate(360deg); } }
        @keyframes fsp-fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* Adaptabilidad móvil extra */
        @media (max-width: 1023px) {
          .fsp-sidebar {
            order: 2; /* Stats abajo en móvil para priorizar la tarjeta */
          }
          .fsp-content-area {
            order: 1;
            margin-bottom: 12px;
          }
          .fsp-sticky-sidebar {
            position: static;
          }
        }
      `}</style>
    </div>
  );
};
