// pages/FlashcardStudyPage.tsx
// Página para estudiantes estudiar flashcards con Spaced Repetition

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  flashcardService,
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
import { IconArrowLeft, IconBookOpen, IconCheckCircle, IconClock, IconTrendingUp } from '../components/Icons';

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
          <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
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
                variant={studyMode === 'review' ? 'primary' : 'outline'}
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
                variant={studyMode === 'all' ? 'primary' : 'outline'}
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

        {/* Estadísticas generales */}
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
            <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
            <p className="text-xs text-text-light">Nuevas</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {stats.masteryPercentage.toFixed(0)}%
            </p>
            <p className="text-xs text-text-light">Dominio</p>
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
            <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
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
          <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
            Volver al Curso
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Progreso */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-dark">
                Progreso de la sesión
              </span>
              <span className="text-sm text-text-light">
                {currentIndex + 1} de {flashcards.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
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

          {/* Estadísticas de sesión */}
          {sessionStats.studied > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-dark">Esta sesión:</p>
                  <p className="text-xs text-text-light">
                    {sessionStats.correct} correctas, {sessionStats.incorrect} incorrectas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">
                    {sessionStats.studied} estudiadas
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Botón para saltar (solo si no está en modo estudio) */}
          {hasMore && (
            <div className="text-center">
              <Button variant="outline" onClick={handleNext}>
                Saltar esta tarjeta
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

