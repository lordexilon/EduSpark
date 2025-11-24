// pages/StudentSelfReportPage.tsx
// Página para que estudiantes vean su propio informe comprehensivo

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { courseService, Course } from '../services/teacherCourses';
import { comprehensiveReportService, ComprehensiveStudentData } from '../services/comprehensiveReportService';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import GamificationScore from '../components/GamificationScore';
import { IconChevronLeft, IconRefreshCw, IconRobot, IconBookOpen, IconClipboardCheck, IconTrendingUp, IconCheckCircle, IconAlertTriangle } from '../components/Icons';
import ProgressBar from '../components/ProgressBar';

export const StudentSelfReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [report, setReport] = useState<ComprehensiveStudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && user?.id) {
      loadData();
    }
  }, [id, user?.id]);

  const loadData = async () => {
    if (!id || !user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const courseId = parseInt(id);

      // Cargar curso
      const courseData = await courseService.getCourse(courseId);
      setCourse(courseData);

      // Obtener promedios del curso para comparación
      const courseReport = await comprehensiveReportService.getCourseComprehensiveReport(courseId);
      const averageProgress = courseReport?.aggregated.averageProgress || 50;
      const averageTutorUsage = courseReport?.correlation.averageTutorUsage || 5;

      // Cargar informe del estudiante
      const studentReport = await comprehensiveReportService.getStudentComprehensiveReport(
        user.id,
        courseId,
        averageProgress,
        averageTutorUsage
      );
      
      if (!studentReport) {
        setError('No se pudo cargar tu informe');
        return;
      }

      setReport(studentReport);
    } catch (err: any) {
      console.error('Error loading student self report:', err);
      setError(err.message || 'Error al cargar tu informe');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="bg-red-50 border-red-200">
          <div className="p-4">
            <p className="text-red-800">{error}</p>
            <Button onClick={loadData} className="mt-4">
              Reintentar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!course || !report) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600">No se encontró información</p>
          </div>
        </Card>
      </div>
    );
  }

  const { academicProgress, tutorMetrics, insights } = report;
  const hours = Math.floor(academicProgress.timeSpentMinutes / 60);
  const minutes = academicProgress.timeSpentMinutes % 60;

  // Calcular score para gamificación
  // ⭐ ACTUALIZADO: Incluye flashcards dominadas
  const score = Math.round(
    (academicProgress.completedUnits * 10) + 
    (academicProgress.completedSessions * 5) + 
    (academicProgress.completedQuizzes * 15) +
    (academicProgress.completedFlashcards * 8) + // ⭐ NUEVO: 8 puntos por flashcard dominada
    (tutorMetrics.totalInteractions * 2) // Bonus por usar el tutor
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/courses/${id}`}>
            <Button variant="outline" leftIcon={<IconChevronLeft className="w-4 h-4" />}>
              Volver al Curso
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mi Informe Personal</h1>
            <p className="text-gray-600 mt-1">{course.title}</p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          leftIcon={<IconRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
        >
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>

      {/* Gamificación con Score Mejorado */}
      <GamificationScore
        totalUnits={academicProgress.totalUnits}
        completedUnits={academicProgress.completedUnits}
        totalSessions={academicProgress.totalSessions}
        completedSessions={academicProgress.completedSessions}
        totalQuizzes={academicProgress.totalQuizzes}
        completedQuizzes={academicProgress.completedQuizzes}
        totalFlashcards={academicProgress.totalFlashcards}
        completedFlashcards={academicProgress.completedFlashcards}
        overallProgress={academicProgress.completionPercentage}
      />

      {/* Progreso Académico Detallado */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <IconBookOpen className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Mi Progreso Académico</h2>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <IconBookOpen className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">Unidades</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{academicProgress.completedUnits}</span>
              <span className="text-sm text-gray-500">/ {academicProgress.totalUnits}</span>
            </div>
            <ProgressBar 
              value={(academicProgress.completedUnits / academicProgress.totalUnits) * 100} 
              color="var(--primary)"
              height="h-2"
              className="mt-2"
            />
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <IconBookOpen className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-semibold text-gray-700">Sesiones</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{academicProgress.completedSessions}</span>
              <span className="text-sm text-gray-500">/ {academicProgress.totalSessions}</span>
            </div>
            <ProgressBar 
              value={(academicProgress.completedSessions / academicProgress.totalSessions) * 100} 
              color="var(--primary)"
              height="h-2"
              className="mt-2"
            />
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <IconClipboardCheck className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-gray-700">Quizzes</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{academicProgress.completedQuizzes}</span>
              <span className="text-sm text-gray-500">/ {academicProgress.totalQuizzes}</span>
            </div>
            <ProgressBar 
              value={(academicProgress.completedQuizzes / academicProgress.totalQuizzes) * 100} 
              color="var(--primary)"
              height="h-2"
              className="mt-2"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Tiempo invertido:</span>
            <span className="font-semibold text-gray-900">
              {hours > 0 ? `${hours}h ` : ''}{minutes}m
            </span>
          </div>
        </div>
      </Card>

      {/* Mi Uso del Tutor IA */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <IconRobot className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Mi Uso del Tutor IA</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Interacciones con el Tutor</p>
            <p className="text-2xl font-bold text-gray-900">{tutorMetrics.totalInteractions}</p>
            <p className="text-xs text-gray-500 mt-1">
              {tutorMetrics.totalInteractions === 0 
                ? 'Aún no has usado el tutor'
                : tutorMetrics.totalInteractions === 1
                ? 'Has realizado 1 consulta'
                : `Has realizado ${tutorMetrics.totalInteractions} consultas`
              }
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Última Consulta</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(tutorMetrics.lastInteractionDate)}
            </p>
            {tutorMetrics.lastInteractionDate && (
              <p className="text-xs text-gray-500 mt-1">
                {(() => {
                  const daysAgo = Math.floor(
                    (Date.now() - new Date(tutorMetrics.lastInteractionDate!).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  if (daysAgo === 0) return 'Hoy';
                  if (daysAgo === 1) return 'Hace 1 día';
                  return `Hace ${daysAgo} días`;
                })()}
              </p>
            )}
          </div>
        </div>

        {tutorMetrics.topicsCovered.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-2">Temas que he consultado:</p>
            <div className="flex flex-wrap gap-2">
              {tutorMetrics.topicsCovered.map((topic, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {tutorMetrics.totalInteractions === 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> El Tutor IA puede ayudarte a entender mejor los conceptos del curso. 
              ¡Pruébalo haciendo preguntas sobre el contenido!
            </p>
          </div>
        )}
      </Card>

      {/* Correlación y Eficiencia */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <IconTrendingUp className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Mi Eficiencia</h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Eficiencia del Tutor</span>
              <span className="text-lg font-bold text-gray-900">
                {insights.efficiency.toFixed(1)}% por interacción
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {insights.efficiency > 5 
                ? '✅ Excelente uso del tutor - estás obteniendo buenos resultados'
                : insights.efficiency > 2
                ? '⚠️ Uso moderado - considera consultar más al tutor'
                : '💡 Baja eficiencia - revisa cómo estás usando el tutor'
              }
            </p>
          </div>

          {insights.tutorUsageVsProgress === 'high-usage-high-progress' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <IconCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-green-900 mb-1">
                    ¡Excelente Correlación! 🎉
                  </h4>
                  <p className="text-sm text-green-800">
                    Tu uso del tutor está correlacionado positivamente con tu progreso académico. 
                    Sigue usando el tutor para mantener este buen ritmo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {insights.tutorUsageVsProgress === 'high-usage-low-progress' && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2">
                <IconAlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-orange-900 mb-1">
                    Revisa tu Estrategia
                  </h4>
                  <p className="text-sm text-orange-800">
                    Estás usando mucho el tutor pero tu progreso es bajo. Considera:
                  </p>
                  <ul className="text-sm text-orange-800 mt-2 list-disc list-inside space-y-1">
                    <li>Hacer preguntas más específicas al tutor</li>
                    <li>Revisar el material antes de consultar</li>
                    <li>Completar las unidades y sesiones pendientes</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Recomendaciones Personalizadas */}
      {insights.recommendedActions.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <IconCheckCircle className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Recomendaciones para Ti</h2>
          </div>
          <ul className="space-y-2">
            {insights.recommendedActions.map((action, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-800">
                <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

export default StudentSelfReportPage;

