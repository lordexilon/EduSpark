// pages/TeacherFlashcardsPage.tsx
// Página de gestión de flashcards para docentes

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flashcard, getFlashcardsByCourse, deleteFlashcard } from '@/services/flashcardService';
import { courseService, Course } from '@/services/teacherCourses';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { IconCards, IconPlusCircle, IconEdit, IconTrash, IconBookOpen, IconArrowRight } from '@/components/Common/Icons';

export const TeacherFlashcardsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadCourses();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedCourse) {
      loadFlashcards();
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const userRole = user?.role?.name;
      const isAdminOrCoordinator = userRole === 'admin' || userRole === 'coordinator';
      
      const data = isAdminOrCoordinator
        ? await courseService.getAllCourses()
        : await courseService.getMyCourses(user!.id);
      
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourse(data[0].id);
      }
    } catch (err) {
      setError('Error al cargar los cursos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFlashcards = async () => {
    if (!selectedCourse) return;

    try {
      setLoading(true);
      const data = await getFlashcardsByCourse(selectedCourse);
      setFlashcards(data);
    } catch (err) {
      setError('Error al cargar las flashcards');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFlashcard = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta flashcard? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await deleteFlashcard(id);
      loadFlashcards();
    } catch (err: any) {
      alert('Error al eliminar la flashcard: ' + (err.message || 'Error desconocido'));
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
        <p className="text-text-light">Gestiona las flashcards de tus cursos</p>
      </div>

      {error && (
        <Card className="mb-6 p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {courses.length === 0 ? (
        <Card className="p-12 text-center">
          <IconBookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No tienes cursos disponibles</p>
          <Button variant="primary" onClick={() => navigate('/teacher/courses/new')}>
            <IconPlusCircle className="w-4 h-4 mr-2" />
            Crear Primer Curso
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
              <Button
                variant="primary"
                onClick={() => navigate(`/teacher/courses/${selectedCourse}/flashcards`)}
              >
                <IconPlusCircle className="w-4 h-4 mr-2" />
                Nueva Flashcard
              </Button>
            </div>
          </Card>

          {/* Lista de flashcards */}
          {flashcards.length === 0 ? (
            <Card className="p-12 text-center">
              <IconCards className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">
                No hay flashcards en <strong>{selectedCourseData?.title}</strong>
              </p>
              <Button
                variant="primary"
                onClick={() => navigate(`/teacher/courses/${selectedCourse}/flashcards`)}
              >
                <IconPlusCircle className="w-4 h-4 mr-2" />
                Crear Primera Flashcard
              </Button>
            </Card>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-text-light">
                  {flashcards.length} flashcard{flashcards.length !== 1 ? 's' : ''} en{' '}
                  <strong>{selectedCourseData?.title}</strong>
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/teacher/courses/${selectedCourse}/flashcards`)}
                >
                  <IconArrowRight className="w-4 h-4 mr-2" />
                  Gestionar Flashcards
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {flashcards.slice(0, 6).map((flashcard) => (
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
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-text-light">
                      <div className="flex gap-2">
                        {flashcard.tags && flashcard.tags.length > 0 && (
                          <div className="flex gap-1">
                            {flashcard.tags.slice(0, 2).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">Dificultad: {flashcard.difficulty_level}/5</span>
                        {flashcard.points_value > 0 && (
                          <span className="text-xs">• {flashcard.points_value} pts</span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {flashcards.length > 6 && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/teacher/courses/${selectedCourse}/flashcards`)}
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

