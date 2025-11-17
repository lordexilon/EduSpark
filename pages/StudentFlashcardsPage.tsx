// pages/StudentFlashcardsPage.tsx
// Página de flashcards para estudiantes

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FlashcardWithProgress, getFlashcardsWithProgress, getFlashcardProgressStats } from '../services/flashcardService';
import { courseService, Course } from '../services/teacherCourses';
import { courseEnrollmentService } from '../services/academicService';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconCards, IconBookOpen, IconArrowRight, IconCheckCircle, IconClock, IconTrendingUp } from '../components/Icons';

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

  const loadFlashcards = async () => {
    if (!selectedCourse || !user?.id) return;

    try {
      setLoading(true);
      const flashcardsData = await getFlashcardsWithProgress(selectedCourse, user.id);
      setFlashcards(flashcardsData);

      const statsData = await getFlashcardProgressStats(user.id, selectedCourse);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading flashcards:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedCourseData = courses.find((c) => c.id === selectedCourse);

  if (loading && courses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-dark mb-2">Flashcards</h1>
        <p className="text-text-light">Estudia y repasa con flashcards interactivas</p>
      </div>

      {courses.length === 0 ? (
        <Card className="p-12 text-center">
          <IconBookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No estás inscrito en ningún curso</p>
          <Button variant="primary" onClick={() => navigate('/my/courses')}>
            Ver Mis Cursos
          </Button>
        </Card>
      ) : (
        <>
          {/* Selector de curso */}
          <Card className="mb-6 p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-text-dark">Curso:</label>
              <select
                value={selectedCourse || ''}
                onChange={(e) => setSelectedCourse(parseInt(e.target.value))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              {selectedCourse && (
                <Button
                  variant="primary"
                  onClick={() => navigate(`/courses/${selectedCourse}/flashcards`)}
                >
                  <IconArrowRight className="w-4 h-4 mr-2" />
                  Estudiar Flashcards
                </Button>
              )}
            </div>
          </Card>

          {/* Estadísticas */}
          {selectedCourse && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
                <p className="text-xs text-text-light">Total</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.mastered}</p>
                <p className="text-xs text-text-light">Dominadas</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.learning}</p>
                <p className="text-xs text-text-light">Aprendiendo</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.dueToday}</p>
                <p className="text-xs text-text-light">Por Revisar</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {stats.masteryPercentage.toFixed(0)}%
                </p>
                <p className="text-xs text-text-light">Dominio</p>
              </Card>
            </div>
          )}

          {/* Lista de flashcards */}
          {flashcards.length === 0 ? (
            <Card className="p-12 text-center">
              <IconCards className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">
                No hay flashcards disponibles en <strong>{selectedCourseData?.title}</strong>
              </p>
            </Card>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-text-light">
                  {flashcards.length} flashcard{flashcards.length !== 1 ? 's' : ''} en{' '}
                  <strong>{selectedCourseData?.title}</strong>
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/courses/${selectedCourse}/flashcards`)}
                >
                  <IconArrowRight className="w-4 h-4 mr-2" />
                  Comenzar Estudio
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {flashcards.slice(0, 9).map((flashcard) => {
                  const masteryLevel = flashcard.progress?.mastery_level || 0;
                  const masteryColors = {
                    0: 'bg-gray-200',
                    1: 'bg-red-200',
                    2: 'bg-orange-200',
                    3: 'bg-yellow-200',
                    4: 'bg-green-200',
                    5: 'bg-green-400',
                  };

                  return (
                    <Card key={flashcard.id} className="p-4 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-text-dark mb-1">
                            {flashcard.title || 'Sin título'}
                          </h3>
                          <p className="text-xs text-text-light line-clamp-2">
                            {flashcard.front_text || flashcard.back_text}
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full ${
                            masteryColors[masteryLevel as keyof typeof masteryColors] || 'bg-gray-200'
                          }`}
                          title={`Nivel de dominio: ${masteryLevel}/5`}
                        />
                      </div>

                      {flashcard.progress && (
                        <div className="mt-4 text-xs text-text-light">
                          <p>
                            Revisada {flashcard.progress.times_studied} vez
                            {flashcard.progress.times_studied !== 1 ? 'es' : ''}
                          </p>
                          {flashcard.progress.next_review_at && (
                            <p className="text-blue-600">
                              <IconClock className="w-3 h-3 inline mr-1" />
                              Próxima revisión:{' '}
                              {new Date(flashcard.progress.next_review_at).toLocaleDateString('es-ES')}
                            </p>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              {flashcards.length > 9 && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/courses/${selectedCourse}/flashcards`)}
                  >
                    Ver todas las flashcards ({flashcards.length})
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

