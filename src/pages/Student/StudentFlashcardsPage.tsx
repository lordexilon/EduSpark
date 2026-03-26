// pages/StudentFlashcardsPage.tsx
// Página de flashcards para estudiantes - Mobile-First Responsive

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FlashcardWithProgress, getFlashcardsWithProgress, getFlashcardProgressStats } from '@/services/flashcardService';
import { courseService, Course, unitService, sessionService, CourseUnit, Session } from '@/services/teacherCourses';
import { courseEnrollmentService } from '@/services/academicService';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { IconCards, IconBookOpen, IconArrowRight, IconCheckCircle, IconClock, IconTrendingUp } from '@/components/Common/Icons';

export const StudentFlashcardsPage: React.FC = () => {
  const { courseId } = useParams<{ courseId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardWithProgress[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(courseId ? parseInt(courseId) : null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    mastered: 0,
    learning: 0,
    new: 0,
    dueToday: 0,
    masteryPercentage: 0,
  });

  useEffect(() => {
    if (user?.id) {
      loadCourses();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedCourse && user?.id) {
      loadFlashcards();
    }
  }, [selectedCourse, user?.id]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const enrollments = await courseEnrollmentService.getStudentEnrollments(user!.id);
      const courseIds = enrollments.map((e) => e.course_id);

      if (courseIds.length === 0) {
        setCourses([]);
        return;
      }

      const coursesData = await Promise.all(
        courseIds.map((id) => courseService.getCourse(id))
      );

      setCourses(coursesData.filter(Boolean) as Course[]);

      if (!selectedCourse && coursesData.length > 0) {
        setSelectedCourse(coursesData[0].id);
      }
    } catch (err) {
      console.error('Error loading courses:', err);
    } finally {
      setLoading(false);
    }
  };

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
      const parentUnit = units.find(u => u.id === session.unit_id);
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

  const isFlashcardAvailable = (flashcard: FlashcardWithProgress, units: CourseUnit[], sessions: Session[], course: Course): boolean => {
    if (user?.role?.name !== 'student') return true;
    const now = new Date();

    if (flashcard.session_id) {
      const parentSession = sessions.find(s => s.id === flashcard.session_id);
      if (parentSession && !isSessionAvailable(parentSession, units, course)) return false;
    }

    if (flashcard.unit_id) {
      const parentUnit = units.find(u => u.id === flashcard.unit_id);
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

  const loadFlashcards = async () => {
    if (!selectedCourse || !user?.id) return;

    try {
      setLoading(true);

      const [courseData, unitsData, sessionsData, flashcardsData] = await Promise.all([
        courseService.getCourse(selectedCourse),
        unitService.getCourseUnits(selectedCourse),
        sessionService.getCourseSessions(selectedCourse),
        getFlashcardsWithProgress(selectedCourse, user.id)
      ]);

      const visibleFlashcards = flashcardsData.filter(f =>
        isFlashcardAvailable(f, unitsData, sessionsData, courseData)
      );

      setFlashcards(visibleFlashcards);

      const total = visibleFlashcards.length;
      const mastered = visibleFlashcards.filter(f => (f.progress?.mastery_level || 0) >= 5).length;
      const learning = visibleFlashcards.filter(f => (f.progress?.mastery_level || 0) > 0 && (f.progress?.mastery_level || 0) < 5).length;
      const newCards = visibleFlashcards.filter(f => !f.progress).length;
      const dueToday = visibleFlashcards.filter(f =>
        f.progress?.next_review_at && new Date(f.progress.next_review_at) <= new Date()
      ).length;

      setStats({
        total,
        mastered,
        learning,
        new: newCards,
        dueToday,
        masteryPercentage: total > 0 ? (mastered / total) * 100 : 0
      });

    } catch (err) {
      console.error('Error loading flashcards:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedCourseData = courses.find((c) => c.id === selectedCourse);

  const masteryColors: Record<number, string> = {
    0: '#e5e7eb',
    1: '#fecaca',
    2: '#fed7aa',
    3: '#fde68a',
    4: '#bbf7d0',
    5: '#4ade80',
  };

  if (loading && courses.length === 0) {
    return (
      <div className="sfp-loading">
        <div className="sfp-spinner" />
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="sfp-page">
      <div className="sfp-header">
        <h1 className="sfp-title">Flashcards</h1>
        <p className="sfp-subtitle">Estudia y repasa con flashcards interactivas</p>
      </div>

      {courses.length === 0 ? (
        <div className="sfp-empty-state">
          <IconBookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
          <p>No estás inscrito en ningún curso</p>
          <Button variant="primary" onClick={() => navigate('/my/courses')}>
            Ver Mis Cursos
          </Button>
        </div>
      ) : (
        <>
          {/* Selector de curso */}
          <div className="sfp-course-selector">
            <label className="sfp-selector-label">Curso:</label>
            <select
              value={selectedCourse || ''}
              onChange={(e) => setSelectedCourse(parseInt(e.target.value))}
              className="sfp-select"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            {selectedCourse && (
              <button
                onClick={() => navigate(`/courses/${selectedCourse}/flashcards`)}
                className="sfp-study-btn"
              >
                <IconArrowRight className="w-4 h-4" />
                <span className="sfp-study-text">Estudiar</span>
              </button>
            )}
          </div>

          {/* Stats */}
          {selectedCourse && (
            <div className="sfp-stats-scroll">
              <div className="sfp-stats-grid">
                <div className="sfp-stat sfp-stat-blue">
                  <span className="sfp-stat-val">{stats.total}</span>
                  <span className="sfp-stat-lbl">Total</span>
                </div>
                <div className="sfp-stat sfp-stat-green">
                  <span className="sfp-stat-val">{stats.mastered}</span>
                  <span className="sfp-stat-lbl">Dominadas</span>
                </div>
                <div className="sfp-stat sfp-stat-yellow">
                  <span className="sfp-stat-val">{stats.learning}</span>
                  <span className="sfp-stat-lbl">Aprendiendo</span>
                </div>
                <div className="sfp-stat sfp-stat-indigo">
                  <span className="sfp-stat-val">{stats.dueToday}</span>
                  <span className="sfp-stat-lbl">Por Revisar</span>
                </div>
                <div className="sfp-stat sfp-stat-purple">
                  <span className="sfp-stat-val">{stats.masteryPercentage.toFixed(0)}%</span>
                  <span className="sfp-stat-lbl">Dominio</span>
                </div>
              </div>
            </div>
          )}

          {/* Lista de flashcards */}
          {flashcards.length === 0 ? (
            <div className="sfp-empty-state">
              <IconCards className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
              <p>
                No hay flashcards disponibles en <strong>{selectedCourseData?.title}</strong>
              </p>
            </div>
          ) : (
            <>
              <div className="sfp-list-header">
                <p className="sfp-list-count">
                  {flashcards.length} flashcard{flashcards.length !== 1 ? 's' : ''} en{' '}
                  <strong>{selectedCourseData?.title}</strong>
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/courses/${selectedCourse}/flashcards`)}
                >
                  <IconArrowRight className="w-4 h-4 mr-1" />
                  Comenzar
                </Button>
              </div>

              <div className="sfp-cards-grid">
                {flashcards.slice(0, 12).map((flashcard) => {
                  const masteryLevel = flashcard.progress?.mastery_level || 0;

                  return (
                    <div key={flashcard.id} className="sfp-card">
                      <div className="sfp-card-top">
                        <div className="sfp-card-info">
                          <h3 className="sfp-card-title">
                            {flashcard.title || 'Sin título'}
                          </h3>
                          <p className="sfp-card-preview">
                            {flashcard.front_text || flashcard.back_text}
                          </p>
                        </div>
                        <span
                          className="sfp-card-dot"
                          style={{ backgroundColor: masteryColors[masteryLevel] || '#e5e7eb' }}
                          title={`Nivel: ${masteryLevel}/5`}
                        />
                      </div>

                      {flashcard.front_image_url && (
                        <div className="sfp-card-thumb">
                          <img
                            src={flashcard.front_image_url}
                            alt=""
                            className="sfp-card-thumb-img"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {flashcard.progress && (
                        <div className="sfp-card-meta">
                          <span>
                            {flashcard.progress.times_studied} revisión{flashcard.progress.times_studied !== 1 ? 'es' : ''}
                          </span>
                          {flashcard.progress.next_review_at && (
                            <span className="sfp-card-review">
                              <IconClock className="w-3 h-3" />
                              {new Date(flashcard.progress.next_review_at).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {flashcards.length > 12 && (
                <div className="sfp-show-more">
                  <button
                    onClick={() => navigate(`/courses/${selectedCourse}/flashcards`)}
                    className="sfp-show-more-btn"
                  >
                    Ver todas ({flashcards.length})
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══ ESTILOS ═══ */}
      <style>{`
        .sfp-page {
          padding: 12px;
          max-width: 900px;
          margin: 0 auto;
        }
        @media (min-width: 640px) {
          .sfp-page { padding: 20px; }
        }
        @media (min-width: 1024px) {
          .sfp-page { padding: 28px; }
        }

        /* Loading */
        .sfp-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          color: var(--text-light);
          font-size: 0.9rem;
        }
        .sfp-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: sfp-spin 0.8s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes sfp-spin {
          to { transform: rotate(360deg); }
        }

        /* Header */
        .sfp-header {
          margin-bottom: 16px;
        }
        .sfp-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-dark);
          margin: 0 0 4px 0;
        }
        .sfp-subtitle {
          font-size: 0.8rem;
          color: var(--text-light);
          margin: 0;
        }
        @media (min-width: 640px) {
          .sfp-title { font-size: 1.75rem; }
          .sfp-subtitle { font-size: 0.9rem; }
        }

        /* Empty state */
        .sfp-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 40px 16px;
          background: var(--surface);
          border-radius: 16px;
          border: 1.5px solid var(--border);
          text-align: center;
          color: var(--text-light);
          font-size: 0.9rem;
        }

        /* Course selector */
        .sfp-course-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          background: var(--surface);
          border-radius: 14px;
          border: 1.5px solid var(--border);
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        @media (min-width: 640px) {
          .sfp-course-selector {
            flex-wrap: nowrap;
            padding: 14px 18px;
          }
        }
        .sfp-selector-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-dark);
          white-space: nowrap;
        }
        .sfp-select {
          flex: 1;
          min-width: 0;
          padding: 8px 12px;
          border: 1.5px solid var(--border);
          border-radius: 10px;
          font-size: 0.85rem;
          color: var(--text-dark);
          background: var(--background);
          -webkit-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
          background-position: right 8px center;
          background-repeat: no-repeat;
          background-size: 20px;
          padding-right: 32px;
        }
        .sfp-select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .sfp-study-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: white;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
          -webkit-tap-highlight-color: transparent;
        }
        .sfp-study-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }
        .sfp-study-btn:active {
          transform: scale(0.96);
        }
        .sfp-study-text {
          display: none;
        }
        @media (min-width: 480px) {
          .sfp-study-text { display: inline; }
        }

        /* Stats */
        .sfp-stats-scroll {
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          margin: 0 -12px 14px -12px;
          padding: 0 12px;
        }
        .sfp-stats-scroll::-webkit-scrollbar {
          display: none;
        }
        .sfp-stats-grid {
          display: flex;
          gap: 8px;
          min-width: max-content;
        }
        @media (min-width: 640px) {
          .sfp-stats-scroll {
            overflow-x: visible;
            margin: 0 0 14px 0;
            padding: 0;
          }
          .sfp-stats-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            min-width: unset;
          }
        }

        .sfp-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 14px;
          border-radius: 12px;
          min-width: 72px;
          border: 1.5px solid;
          flex-shrink: 0;
        }
        .sfp-stat-val {
          font-size: 1.25rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 2px;
        }
        .sfp-stat-lbl {
          font-size: 0.6rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          opacity: 0.8;
        }
        @media (min-width: 640px) {
          .sfp-stat { padding: 14px 12px; }
          .sfp-stat-val { font-size: 1.5rem; }
          .sfp-stat-lbl { font-size: 0.65rem; }
        }

        .sfp-stat-blue {
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          border-color: #93c5fd;
          color: #1d4ed8;
        }
        .sfp-stat-green {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border-color: #86efac;
          color: #15803d;
        }
        .sfp-stat-yellow {
          background: linear-gradient(135deg, #fffbeb, #fef3c7);
          border-color: #fde68a;
          color: #a16207;
        }
        .sfp-stat-indigo {
          background: linear-gradient(135deg, #eef2ff, #e0e7ff);
          border-color: #a5b4fc;
          color: #4338ca;
        }
        .sfp-stat-purple {
          background: linear-gradient(135deg, #faf5ff, #f3e8ff);
          border-color: #c4b5fd;
          color: #7c3aed;
        }
        
        /* Dark mode overrides for stats blocks */
        html.dark .sfp-stat-blue { background: rgba(29, 78, 216, 0.15); border-color: rgba(59, 130, 246, 0.4); color: #93c5fd; }
        html.dark .sfp-stat-green { background: rgba(21, 128, 61, 0.15); border-color: rgba(34, 197, 94, 0.4); color: #86efac; }
        html.dark .sfp-stat-yellow { background: rgba(161, 98, 7, 0.15); border-color: rgba(234, 179, 8, 0.4); color: #fde047; }
        html.dark .sfp-stat-indigo { background: rgba(67, 56, 202, 0.15); border-color: rgba(99, 102, 241, 0.4); color: #a5b4fc; }
        html.dark .sfp-stat-purple { background: rgba(124, 58, 237, 0.15); border-color: rgba(168, 85, 247, 0.4); color: #d8b4fe; }

        /* List header */
        .sfp-list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .sfp-list-count {
          font-size: 0.8rem;
          color: var(--text-light);
          margin: 0;
        }
        @media (min-width: 640px) {
          .sfp-list-count { font-size: 0.9rem; }
        }

        /* Cards grid */
        .sfp-cards-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 480px) {
          .sfp-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 768px) {
          .sfp-cards-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
        }

        .sfp-card {
          background: var(--surface);
          border-radius: 14px;
          border: 1.5px solid var(--border);
          padding: 14px;
          transition: all 0.2s;
          cursor: default;
        }
        .sfp-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          border-color: var(--primary);
        }

        .sfp-card-top {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 8px;
        }
        .sfp-card-info {
          flex: 1;
          min-width: 0;
        }
        .sfp-card-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-dark);
          margin: 0 0 4px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sfp-card-preview {
          font-size: 0.75rem;
          color: var(--text-light);
          margin: 0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          line-height: 1.4;
        }
        .sfp-card-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 3px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .sfp-card-thumb {
          margin: 8px 0;
          border-radius: 10px;
          overflow: hidden;
          max-height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--background);
        }
        .sfp-card-thumb-img {
          max-width: 100%;
          max-height: 100px;
          object-fit: contain;
        }

        .sfp-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 0.65rem;
          color: var(--text-light);
          padding-top: 8px;
          border-top: 1px solid var(--border);
        }
        .sfp-card-review {
          display: flex;
          align-items: center;
          gap: 3px;
          color: #6366f1;
          font-weight: 600;
        }

        /* Show more */
        .sfp-show-more {
          display: flex;
          justify-content: center;
          margin-top: 16px;
          padding-bottom: 20px;
        }
        .sfp-show-more-btn {
          padding: 10px 24px;
          border-radius: 12px;
          border: 1.5px solid var(--border);
          background: var(--surface);
          color: var(--text-dark);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .sfp-show-more-btn:hover {
          border-color: #6366f1;
          color: #4f46e5;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
        }
      `}</style>
    </div>
  );
};
