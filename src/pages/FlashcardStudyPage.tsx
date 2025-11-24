// pages/FlashcardStudyPage.tsx
// Página para estudiantes estudiar flashcards con Spaced Repetition

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  FlashcardWithProgress,
  getFlashcardsWithProgress,
  getFlashcardsToReview,
  recordFlashcardStudy,
  getFlashcardProgressStats,
} from '../services/flashcardService';
import { courseService, Course } from '../services/teacherCourses';
import Button from '../components/Button';
import Card from '../components/Card';
import FlashcardCard from '../components/flashcards/FlashcardCard';
import { IconArrowLeft, IconBookOpen, IconCheckCircle, IconClock, IconTrendingUp, IconX } from '../components/Icons';

export const FlashcardStudyPage: React.FC = () => {
  const { courseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardWithProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studyMode, setStudyMode] = useState<'review' | 'all'>('review'); // 'review' = solo las que necesitan revisión
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

  const loadData = async () => {
    if (!courseId || !user) return;

    try {
      setLoading(true);
      const courseIdNum = parseInt(courseId);

      // Cargar curso
      const courseData = await courseService.getCourse(courseIdNum);
      setCourse(courseData);

      // Cargar flashcards según el modo
      let flashcardsData: FlashcardWithProgress[];
      if (studyMode === 'review') {
        flashcardsData = await getFlashcardsToReview(user.id, courseIdNum);
      } else {
        flashcardsData = await getFlashcardsWithProgress(courseIdNum, user.id);
      }

      setFlashcards(flashcardsData);

      // Cargar estadísticas
      const statsData = await getFlashcardProgressStats(user.id, courseIdNum);
      setStats(statsData);

      // Resetear índice si hay flashcards
      if (flashcardsData.length > 0) {
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

      // Actualizar estadísticas de sesión
      setSessionStats((prev) => ({
        studied: prev.studied + 1,
        correct: prev.correct + (quality >= 3 ? 1 : 0),
        incorrect: prev.incorrect + (quality < 3 ? 1 : 0),
      }));

      // Avanzar a la siguiente flashcard
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Sesión completada
        setSessionComplete(true);
        // Recargar datos para actualizar estadísticas
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <Card>
          <p className="text-center text-gray-600">Curso no encontrado</p>
          <Button onClick={() => navigate('/my/courses')} className="mt-4">
            Volver a Mis Cursos
          </Button>
        </Card>
      </div>
    );
  }

  const currentFlashcard = flashcards[currentIndex];
  const hasMore = currentIndex < flashcards.length - 1;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-text-dark mb-2">Estudiar Flashcards</h1>
            <p className="text-text-light">{course.title}</p>
          </div>
          <Button variant="secondary" onClick={() => navigate(`/courses/${courseId}`)}>
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Volver al Curso
          </Button>
        </div>

        {/* Selector de modo */}
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-text-dark">Modo de estudio:</label>
            <div className="flex gap-2">
              <Button
                variant={studyMode === 'review' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setStudyMode('review');
                  setCurrentIndex(0);
                  setSessionComplete(false);
                }}
              >
                <IconClock className="w-4 h-4 mr-2" />
                Revisión ({stats.dueToday})
              </Button>
              <Button
                variant={studyMode === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setStudyMode('all');
                  setCurrentIndex(0);
                  setSessionComplete(false);
                }}
              >
                <IconBookOpen className="w-4 h-4 mr-2" />
                Todas ({stats.total})
              </Button>
            </div>
          </div>
        </Card>

        {/* Estadísticas generales - Mejoradas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-5 text-center bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all">
            <p className="text-3xl md:text-4xl font-bold text-blue-600 mb-1">{stats.total}</p>
            <p className="text-sm font-semibold text-gray-700">Total</p>
          </Card>
          <Card className="p-5 text-center bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 shadow-lg hover:shadow-xl transition-all">
            <p className="text-3xl md:text-4xl font-bold text-green-600 mb-1">{stats.mastered}</p>
            <p className="text-sm font-semibold text-gray-700">Dominio</p>
          </Card>
          <Card className="p-5 text-center bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 shadow-lg hover:shadow-xl transition-all">
            <p className="text-3xl md:text-4xl font-bold text-yellow-600 mb-1">{stats.learning}</p>
            <p className="text-sm font-semibold text-gray-700">Aprendiendo</p>
          </Card>
          <Card className="p-5 text-center bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 shadow-lg hover:shadow-xl transition-all">
            <p className="text-3xl md:text-4xl font-bold text-indigo-600 mb-1">{stats.new}</p>
            <p className="text-sm font-semibold text-gray-700">Nuevas</p>
          </Card>
          <Card className="p-5 text-center bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all">
            <p className="text-3xl md:text-4xl font-bold text-purple-600 mb-1">
              {stats.masteryPercentage.toFixed(0)}%
            </p>
            <p className="text-sm font-semibold text-gray-700">Dominio</p>
          </Card>
        </div>
      </div>

      {/* Contenido principal */}
      {sessionComplete ? (
        <Card className="p-12 text-center">
          <IconCheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-text-dark mb-4">¡Sesión Completada!</h2>
          <div className="space-y-2 mb-6">
            <p className="text-text-light">
              Estudiaste <strong>{sessionStats.studied}</strong> flashcards
            </p>
            <p className="text-text-light">
              Correctas: <strong className="text-green-600">{sessionStats.correct}</strong> |{' '}
              Incorrectas: <strong className="text-red-600">{sessionStats.incorrect}</strong>
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button variant="primary" onClick={handleRestart}>
              Estudiar Más
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/courses/${courseId}`)}>
              Volver al Curso
            </Button>
          </div>
        </Card>
      ) : flashcards.length === 0 ? (
        <Card className="p-12 text-center">
          <IconBookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">
            {studyMode === 'review'
              ? 'No hay flashcards que necesiten revisión en este momento'
              : 'No hay flashcards disponibles en este curso'}
          </p>
          <Button variant="secondary" onClick={() => navigate(`/courses/${courseId}`)}>
            Volver al Curso
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Progreso - Mejorado */}
          <Card className="p-6 mb-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-bold text-gray-800">
                Progreso de la sesión
              </span>
              <span className="text-xl font-bold text-primary bg-white px-4 py-2 rounded-full shadow-md">
                {currentIndex + 1} de {flashcards.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 h-4 rounded-full transition-all duration-500 shadow-lg relative overflow-hidden"
                style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
              />
            </div>
          </Card>

          {/* Flashcard actual */}
          <FlashcardCard
            flashcard={currentFlashcard}
            progress={currentFlashcard.progress}
            studyMode={true}
            onAnswer={handleAnswer}
          />

          {/* Estadísticas de sesión - Mejoradas */}
          {sessionStats.studied > 0 && (
            <Card className="p-6 bg-gradient-to-r from-gray-50 via-blue-50 to-indigo-50 border-2 border-gray-300 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-base font-bold text-gray-800 mb-3">Esta sesión:</p>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full shadow-sm">
                      <IconCheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-base text-green-700 font-bold">
                        {sessionStats.correct} correctas
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-red-100 px-4 py-2 rounded-full shadow-sm">
                      <IconX className="w-5 h-5 text-red-600" />
                      <span className="text-base text-red-700 font-bold">
                        {sessionStats.incorrect} incorrectas
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-6 bg-white px-6 py-4 rounded-xl shadow-md border-2 border-primary/20">
                  <p className="text-3xl font-bold text-primary mb-1">
                    {sessionStats.studied}
                  </p>
                  <p className="text-sm font-semibold text-gray-600">
                    estudiadas
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Botón para saltar (solo si no está en modo estudio) */}
          {hasMore && (
            <div className="text-center">
              <Button variant="secondary" onClick={handleNext}>
                Saltar esta tarjeta
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

