// components/Features/AIInsightsBanner.tsx
// Banner de Perspectiva IA funcional - Analiza datos reales del estudiante y genera recomendaciones

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CourseUnit } from '@/services/teacherCourses';
import { Assessment } from '@/services/quizService';

interface AIInsightsProps {
  courseId: number;
  metrics: {
    units: { completed: number; total: number };
    sessions: { completed: number; total: number };
    quizzes: { completed: number; total: number };
    flashcards: { completed: number; total: number };
  };
  visibleUnits: CourseUnit[];
  completedUnits: Set<string>;
  completedSessions: Set<string>;
  completedQuizzes: Set<string>;
  visibleQuizzesByUnit: Record<string, Assessment[]>;
  generalQuizzes: Assessment[];
  finalExam: Assessment | null;
  progress: number; // enrollment completion %
}

interface Insight {
  type: 'success' | 'warning' | 'info' | 'tip';
  icon: string;
  title: string;
  message: string;
  action?: { label: string; path: string };
}

export const AIInsightsBanner: React.FC<AIInsightsProps> = ({
  courseId,
  metrics,
  visibleUnits,
  completedUnits,
  completedSessions,
  completedQuizzes,
  visibleQuizzesByUnit,
  generalQuizzes,
  finalExam,
  progress,
}) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  // ═══ Motor de Análisis Inteligente ═══
  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];

    const { units, sessions, quizzes, flashcards } = metrics;
    const unitPct = units.total > 0 ? (units.completed / units.total) * 100 : 0;
    const sessionPct = sessions.total > 0 ? (sessions.completed / sessions.total) * 100 : 0;
    const quizPct = quizzes.total > 0 ? (quizzes.completed / quizzes.total) * 100 : 0;
    const flashPct = flashcards.total > 0 ? (flashcards.completed / flashcards.total) * 100 : 0;

    // 1. Detectar la próxima unidad a completar
    const nextUnit = visibleUnits.find((u) => !completedUnits.has(u.id));

    // 2. Detectar quizzes pendientes en unidades ya completadas
    const pendingQuizzesInCompletedUnits: { unit: CourseUnit; quizCount: number }[] = [];
    visibleUnits.forEach((unit) => {
      if (completedUnits.has(unit.id)) {
        const unitQuizzes = visibleQuizzesByUnit[unit.id] || [];
        const pending = unitQuizzes.filter((q) => !completedQuizzes.has(q.id));
        if (pending.length > 0) {
          pendingQuizzesInCompletedUnits.push({ unit, quizCount: pending.length });
        }
      }
    });

    // 3. Verificar quizzes generales pendientes
    const pendingGeneralQuizzes = generalQuizzes.filter((q) => !completedQuizzes.has(q.id));

    // ═══ GENERAR INSIGHTS ═══

    // Insight de progreso general
    if (progress >= 90) {
      result.push({
        type: 'success',
        icon: 'emoji_events',
        title: '¡Casi lo logras!',
        message: `Llevas un ${Math.round(progress)}% del curso. Estás a punto de completarlo. ¡Sigue así!`,
      });
    } else if (progress >= 50) {
      result.push({
        type: 'info',
        icon: 'trending_up',
        title: 'Buen progreso',
        message: `Has completado el ${Math.round(progress)}% del curso. Mantén el ritmo para terminar a tiempo.`,
      });
    } else if (progress > 0 && progress < 25) {
      result.push({
        type: 'tip',
        icon: 'rocket_launch',
        title: 'Recién empezas',
        message: `Llevas un ${Math.round(progress)}% del curso. Te recomendamos dedicar tiempo regular para avanzar más rápido en el contenido.`,
      });
    }

    // Insight sobre siguiente unidad recomendada
    if (nextUnit) {
      result.push({
        type: 'info',
        icon: 'psychology',
        title: `Siguiente paso: ${nextUnit.title}`,
        message: `Según tu avance, te recomendamos continuar con la ${nextUnit.number ? `Unidad ${nextUnit.number}` : 'siguiente unidad'}. ${nextUnit.learning_objectives && nextUnit.learning_objectives.length > 0 ? `Aprenderás sobre: ${nextUnit.learning_objectives[0]}.` : 'Explora el contenido para seguir avanzando.'}`,
      });
    }

    // Insight sobre quizzes pendientes en unidades completadas
    if (pendingQuizzesInCompletedUnits.length > 0) {
      const first = pendingQuizzesInCompletedUnits[0];
      const firstQuiz = (visibleQuizzesByUnit[first.unit.id] || []).find(
        (q) => !completedQuizzes.has(q.id)
      );
      result.push({
        type: 'warning',
        icon: 'assignment_late',
        title: 'Evaluaciones pendientes',
        message: `Completaste la ${first.unit.title || `Unidad ${first.unit.number}`} pero tienes ${first.quizCount} evaluación${first.quizCount > 1 ? 'es' : ''} sin realizar. Te sugerimos resolverla para consolidar tu aprendizaje.`,
        action: firstQuiz ? { label: 'Ir al Quiz', path: `/quiz/${firstQuiz.id}` } : undefined,
      });
    }

    // Insight sobre quizzes generales pendientes
    if (pendingGeneralQuizzes.length > 0 && progress > 30) {
      result.push({
        type: 'tip',
        icon: 'quiz',
        title: 'Quizzes generales disponibles',
        message: `Hay ${pendingGeneralQuizzes.length} evaluación${pendingGeneralQuizzes.length > 1 ? 'es' : ''} general${pendingGeneralQuizzes.length > 1 ? 'es' : ''} del curso que puedes resolver para evaluar tu comprensión global.`,
        action: { label: 'Ver Evaluaciones', path: `/quiz/${pendingGeneralQuizzes[0].id}` },
      });
    }

    // Insight sobre examen final
    if (finalExam && !completedQuizzes.has(finalExam.id)) {
      if (progress >= 70) {
        result.push({
          type: 'warning',
          icon: 'school',
          title: 'Examen Final disponible',
          message: `Has avanzado lo suficiente para intentar el Examen Final "${finalExam.title}". Asegúrate de repasar los temas clave antes de comenzar.`,
          action: { label: 'Ir al Examen', path: `/quiz/${finalExam.id}` },
        });
      }
    } else if (finalExam && completedQuizzes.has(finalExam.id)) {
      result.push({
        type: 'success',
        icon: 'verified',
        title: '¡Examen Final completado!',
        message: 'Has completado el Examen Final de este curso. ¡Excelente trabajo!',
      });
    }

    // Insight sobre flashcards
    if (flashcards.total > 0) {
      if (flashPct < 30 && sessions.completed > 0) {
        result.push({
          type: 'tip',
          icon: 'style',
          title: 'Aprovecha las Flashcards',
          message: `Solo has dominado ${flashcards.completed} de ${flashcards.total} flashcards. Estudiar con repetición espaciada te ayudará a retener mejor los conceptos.`,
          action: { label: 'Estudiar Flashcards', path: `/courses/${courseId}/flashcards` },
        });
      } else if (flashPct >= 80) {
        result.push({
          type: 'success',
          icon: 'auto_awesome',
          title: '¡Excelente dominio de Flashcards!',
          message: `Has dominado ${flashcards.completed} de ${flashcards.total} flashcards (${Math.round(flashPct)}%). Tu retención de conceptos es sobresaliente.`,
        });
      }
    }

    // Insight sobre balance de actividades
    if (sessionPct > 60 && quizPct < 20 && quizzes.total > 0) {
      result.push({
        type: 'warning',
        icon: 'balance',
        title: 'Evalúa lo aprendido',
        message:
          'Has visto muchas sesiones pero pocos quizzes. Realizar las evaluaciones te ayudará a identificar temas que necesitas reforzar.',
      });
    }

    // Si no hay insights relevantes (curso sin progreso o sin contenido)
    if (result.length === 0) {
      result.push({
        type: 'info',
        icon: 'psychology',
        title: '¡Bienvenido al curso!',
        message:
          'Comienza explorando los módulos disponibles. El tutor IA te dará recomendaciones personalizadas a medida que avances.',
      });
    }

    return result;
  }, [
    metrics,
    visibleUnits,
    completedUnits,
    completedQuizzes,
    visibleQuizzesByUnit,
    generalQuizzes,
    finalExam,
    progress,
    courseId,
  ]);

  // Mostrar el insight principal (el más relevante)
  const mainInsight = insights[0];
  const additionalInsights = insights.slice(1);

  const typeStyles: Record<
    string,
    { bg: string; border: string; iconBg: string; iconColor: string; accentColor: string }
  > = {
    success: {
      bg: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10',
      border: 'border-green-200 dark:border-green-800/30',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      accentColor: 'text-green-600 hover:text-green-700 dark:text-green-400',
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10',
      border: 'border-amber-200 dark:border-amber-800/30',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      accentColor: 'text-amber-600 hover:text-amber-700 dark:text-amber-400',
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10',
      border: 'border-blue-200 dark:border-blue-800/30',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      accentColor: 'text-blue-600 hover:text-blue-700 dark:text-blue-400',
    },
    tip: {
      bg: 'bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/10 dark:to-violet-900/10',
      border: 'border-purple-200 dark:border-purple-800/30',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      accentColor: 'text-purple-600 hover:text-purple-700 dark:text-purple-400',
    },
  };

  const renderInsightCard = (insight: Insight, isMain: boolean = false) => {
    const style = typeStyles[insight.type];

    return (
      <div
        className={`relative overflow-hidden rounded-xl ${style.bg} border ${style.border} ${isMain ? 'p-5' : 'p-4'} flex gap-4 items-start transition-all duration-300`}
      >
        {/* Icono */}
        <div className={`p-2 ${style.iconBg} rounded-lg ${style.iconColor} shrink-0`}>
          <span className="material-symbols-outlined icon-filled">{insight.icon}</span>
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={`text-text-dark dark:text-white font-bold ${isMain ? 'text-lg' : 'text-base'} font-display leading-tight`}
            >
              {insight.title}
            </h3>
            {isMain && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 uppercase tracking-wider whitespace-nowrap">
                IA
              </span>
            )}
          </div>
          <p
            className={`text-text-dark dark:text-gray-300 ${isMain ? 'text-sm' : 'text-xs'} leading-relaxed opacity-90`}
          >
            {insight.message}
          </p>

          {/* Acción */}
          {insight.action && (
            <button
              onClick={() => navigate(insight.action!.path)}
              className={`mt-3 text-sm font-bold ${style.accentColor} flex items-center gap-1 transition-colors`}
            >
              {insight.action.label}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          )}
        </div>

        {/* Decoración de fondo */}
        {isMain && (
          <span className="absolute -top-4 -right-4 text-9xl text-brand-primary/5 select-none pointer-events-none material-symbols-outlined">
            auto_awesome
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Insight Principal */}
      {renderInsightCard(mainInsight, true)}

      {/* Insights Adicionales (expandibles) */}
      {additionalInsights.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-gray-500 hover:text-brand-primary transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <span className="material-symbols-outlined text-sm">
              {expanded ? 'expand_less' : 'expand_more'}
            </span>
            {expanded
              ? 'Ocultar recomendaciones'
              : `Ver ${additionalInsights.length} recomendación${additionalInsights.length > 1 ? 'es' : ''} más`}
          </button>

          {expanded && (
            <div className="space-y-2 animate-fade-in">
              {additionalInsights.map((insight, idx) => (
                <React.Fragment key={idx}>{renderInsightCard(insight, false)}</React.Fragment>
              ))}
            </div>
          )}
        </>
      )}

      {/* CTA — Asesoramiento IA completo */}
      <button
        onClick={() => navigate(`/courses/${courseId}/my-report`)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-base icon-filled">psychology</span>
        Asesoramiento IA — Ver análisis completo
        <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </button>
    </div>
  );
};
