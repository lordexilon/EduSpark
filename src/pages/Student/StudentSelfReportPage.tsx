// pages/StudentSelfReportPage.tsx
// Asesoramiento IA — Panel de análisis inteligente para el estudiante
// Muestra datos reales de participación, uso del Tutor IA, eficiencia y recomendaciones personalizadas

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { courseService, Course, unitService, CourseUnit } from '@/services/teacherCourses';
import { comprehensiveReportService, ComprehensiveStudentData } from '@/services/comprehensiveReportService';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import GamificationScore from '@/components/Features/GamificationScore';
import {
  IconChevronLeft, IconRefreshCw, IconRobot, IconBookOpen,
  IconClipboardCheck, IconTrendingUp, IconCheckCircle,
  IconAlertTriangle, IconCards, IconClock
} from '@/components/Common/Icons';
import ProgressBar from '@/components/Common/ProgressBar';

// ──────────────────────────────────────────────
// Helper mini-components
// ──────────────────────────────────────────────

const StatPill: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  colorClass: string;
  bgClass: string;
}> = ({ icon, label, value, sub, colorClass, bgClass }) => (
  <div className={`${bgClass} rounded-xl p-4 border border-gray-100 dark:border-gray-700 flex flex-col gap-1`}>
    <div className="flex items-center gap-2 mb-1">
      <span className={colorClass}>{icon}</span>
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
    </div>
    <span className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{value}</span>
    {sub && <span className="text-xs text-gray-500 dark:text-gray-400">{sub}</span>}
  </div>
);

const RiskBadge: React.FC<{ level: 'low' | 'medium' | 'high' }> = ({ level }) => {
  const map = {
    low: { label: 'Riesgo Bajo', cls: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800', icon: 'verified_user' },
    medium: { label: 'Riesgo Moderado', cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', icon: 'warning' },
    high: { label: 'Riesgo Alto', cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800', icon: 'error' },
  };
  const cfg = map[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.cls}`}>
      <span className="material-symbols-outlined text-sm">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
};

// ──────────────────────────────────────────────
// Main Page Component
// ──────────────────────────────────────────────

export const StudentSelfReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [report, setReport] = useState<ComprehensiveStudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── data loading ──
  useEffect(() => {
    if (id && user?.id) loadData();
  }, [id, user?.id]);

  const loadData = async () => {
    if (!id || !user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const courseId = parseInt(id);

      const [courseData, courseUnits] = await Promise.all([
        courseService.getCourse(courseId),
        unitService.getCourseUnits(courseId),
      ]);
      setCourse(courseData);
      setUnits(courseUnits);

      // Promedios del curso para comparación contextual
      const courseReport = await comprehensiveReportService.getCourseComprehensiveReport(courseId);
      const avgProgress = courseReport?.aggregated.averageProgress || 50;
      const avgTutor = courseReport?.correlation.averageTutorUsage || 5;

      const studentReport = await comprehensiveReportService.getStudentComprehensiveReport(
        user.id, courseId, avgProgress, avgTutor
      );

      if (!studentReport) { setError('No se pudo cargar tu asesoramiento'); return; }
      setReport(studentReport);
    } catch (err: any) {
      console.error('Error loading AI advisor data:', err);
      setError(err.message || 'Error al cargar tu asesoramiento');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const formatDate = (d: string | null) => {
    if (!d) return 'Nunca';
    return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // ── Derived data ──
  const derived = useMemo(() => {
    if (!report) return null;
    const { academicProgress: ap, tutorMetrics: tm, insights } = report;
    const hours = Math.floor(ap.timeSpentMinutes / 60);
    const minutes = ap.timeSpentMinutes % 60;
    const timeLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    // Participation grade
    const totalActivities = ap.totalUnits + ap.totalSessions + ap.totalQuizzes + ap.totalFlashcards;
    const completedActivities = ap.completedUnits + ap.completedSessions + ap.completedQuizzes + ap.completedFlashcards;
    const participationPct = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

    let participationGrade: { label: string; color: string; emoji: string };
    if (participationPct >= 80) participationGrade = { label: 'Excelente', color: 'text-green-600', emoji: '🌟' };
    else if (participationPct >= 60) participationGrade = { label: 'Buena', color: 'text-blue-600', emoji: '👍' };
    else if (participationPct >= 30) participationGrade = { label: 'Regular', color: 'text-amber-600', emoji: '⚡' };
    else participationGrade = { label: 'Baja', color: 'text-red-600', emoji: '📌' };

    // Usage pattern label
    const usageMap: Record<string, { label: string; desc: string; color: string }> = {
      'high-usage-high-progress': {
        label: 'Aprovechador Eficiente',
        desc: 'Usas bien el tutor y avanzas a buen ritmo. ¡Sigue así!',
        color: 'text-green-600',
      },
      'high-usage-low-progress': {
        label: 'Necesita Enfoque',
        desc: 'Usas mucho el tutor pero tu progreso es bajo. Revisa tu estrategia de estudio.',
        color: 'text-amber-600',
      },
      'low-usage-high-progress': {
        label: 'Autodidacta',
        desc: 'Avanzas bien sin necesitar mucho al tutor. Podrías usarlo para profundizar más.',
        color: 'text-blue-600',
      },
      'low-usage-low-progress': {
        label: 'En Riesgo',
        desc: 'Bajo uso del tutor y bajo progreso. Te recomendamos activar tu participación.',
        color: 'text-red-600',
      },
    };

    const usageProfile = usageMap[insights.tutorUsageVsProgress] || usageMap['low-usage-low-progress'];

    // Overwrite profile color for low-low if they are just starting (progress < 10) to avoid scaring them
    if (insights.tutorUsageVsProgress === 'low-usage-low-progress' && ap.completionPercentage < 10) {
      usageProfile.label = 'Iniciando';
      usageProfile.color = 'text-gray-600';
    }

    return { ap, tm, insights, hours, minutes, timeLabel, participationPct, participationGrade, usageProfile, completedActivities, totalActivities };
  }, [report]);

  // ──────────────────────────────────────────────
  // Render states
  // ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Analizando tu rendimiento…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
          <div className="p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
            <p className="text-red-800 dark:text-red-300 font-medium">{error}</p>
            <Button onClick={loadData} className="mt-4">Reintentar</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!course || !report || !derived) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card><div className="text-center py-8"><p className="text-gray-600 dark:text-gray-400">No se encontró información</p></div></Card>
      </div>
    );
  }

  const { ap, tm, insights, timeLabel, participationPct, participationGrade, usageProfile, completedActivities, totalActivities } = derived;

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* ═══ HERO HEADER ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 p-6 sm:p-8 text-white">
        {/* bg decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-white"></div>
          <div className="absolute bottom-2 left-12 w-20 h-20 rounded-full bg-white"></div>
        </div>

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl icon-filled">psychology</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">Asesoramiento IA</h1>
              <p className="text-white/80 text-sm mt-0.5">{course.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RiskBadge level={insights.riskLevel} />
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              leftIcon={<IconRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
              className="!bg-white/20 hover:!bg-white/30 !text-white !border-white/30 text-xs"
            >
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </Button>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3">
            <p className="text-white/70 text-[10px] uppercase font-bold tracking-wider">Progreso</p>
            <p className="text-xl font-extrabold">{Math.round(ap.completionPercentage)}%</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3">
            <p className="text-white/70 text-[10px] uppercase font-bold tracking-wider">Participación</p>
            <p className="text-xl font-extrabold">{participationPct}%</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3">
            <p className="text-white/70 text-[10px] uppercase font-bold tracking-wider">Tiempo</p>
            <p className="text-xl font-extrabold">{timeLabel}</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3">
            <p className="text-white/70 text-[10px] uppercase font-bold tracking-wider">Tutor IA</p>
            <p className="text-xl font-extrabold">{tm.totalInteractions} <span className="text-sm font-normal">consultas</span></p>
          </div>
        </div>

        {/* Back link */}
        <Link
          to={`/courses/${id}`}
          className="relative inline-flex items-center gap-1 mt-5 text-white/70 hover:text-white text-xs font-medium transition-colors"
        >
          <IconChevronLeft className="w-4 h-4" /> Volver al Curso
        </Link>
      </div>

      {/* ═══ GRADO DE PARTICIPACIÓN ═══ */}
      <Card className="p-6 dark:bg-gray-800/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">groups</span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Grado de Participación</h2>
          </div>
          <span className={`text-lg font-extrabold ${participationGrade.color}`}>
            {participationGrade.emoji} {participationGrade.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{completedActivities} actividades completadas</span>
            <span>{totalActivities} totales</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${participationPct}%`,
                background: participationPct >= 80 ? 'linear-gradient(90deg, #10b981, #059669)'
                  : participationPct >= 60 ? 'linear-gradient(90deg, #3b82f6, #6366f1)'
                    : participationPct >= 30 ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                      : 'linear-gradient(90deg, #ef4444, #dc2626)',
              }}
            ></div>
          </div>
        </div>

        {/* Detailed metrics grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatPill
            icon={<IconBookOpen className="w-4 h-4" />}
            label="Unidades"
            value={`${ap.completedUnits}/${ap.totalUnits}`}
            sub={ap.totalUnits === 0 ? 'Sin contenido' : ap.completedUnits === ap.totalUnits ? '✅ Completado' : `${ap.totalUnits - ap.completedUnits} pendientes`}
            colorClass="text-blue-600"
            bgClass="bg-blue-50 dark:bg-blue-900/10"
          />
          <StatPill
            icon={<IconCheckCircle className="w-4 h-4" />}
            label="Sesiones"
            value={`${ap.completedSessions}/${ap.totalSessions}`}
            sub={ap.totalSessions === 0 ? 'Sin contenido' : ap.completedSessions === ap.totalSessions ? '✅ Completado' : `${ap.totalSessions - ap.completedSessions} pendientes`}
            colorClass="text-purple-600"
            bgClass="bg-purple-50 dark:bg-purple-900/10"
          />
          <StatPill
            icon={<IconClipboardCheck className="w-4 h-4" />}
            label="Evaluaciones"
            value={`${ap.completedQuizzes}/${ap.totalQuizzes}`}
            sub={ap.totalQuizzes === 0 ? 'Sin contenido' : ap.completedQuizzes === ap.totalQuizzes ? '✅ Completado' : `${ap.totalQuizzes - ap.completedQuizzes} pendientes`}
            colorClass="text-green-600"
            bgClass="bg-green-50 dark:bg-green-900/10"
          />
          <StatPill
            icon={<IconCards className="w-4 h-4" />}
            label="Flashcards"
            value={`${ap.completedFlashcards}/${ap.totalFlashcards}`}
            sub={ap.totalFlashcards === 0 ? 'Sin contenido' : ap.completedFlashcards === ap.totalFlashcards ? '✅ Dominadas' : `${ap.totalFlashcards - ap.completedFlashcards} por dominar`}
            colorClass="text-indigo-600"
            bgClass="bg-indigo-50 dark:bg-indigo-900/10"
          />
        </div>
      </Card>

      {/* ═══ GAMIFICACIÓN ═══ */}
      <GamificationScore
        totalUnits={ap.totalUnits}
        completedUnits={ap.completedUnits}
        totalSessions={ap.totalSessions}
        completedSessions={ap.completedSessions}
        totalQuizzes={ap.totalQuizzes}
        completedQuizzes={ap.completedQuizzes}
        totalFlashcards={ap.totalFlashcards}
        completedFlashcards={ap.completedFlashcards}
        overallProgress={ap.completionPercentage}
      />

      {/* ═══ TWO-COLUMN: Tutor IA + Perfil de Aprendizaje ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Tutor IA ── */}
        <Card className="p-6 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 mb-4">
            <IconRobot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Mi Uso del Tutor IA</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Interacciones totales</span>
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{tm.totalInteractions}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Última consulta</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(tm.lastInteractionDate)}</span>
            </div>

            {tm.lastInteractionDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Hace cuánto</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {(() => {
                    const days = Math.floor((Date.now() - new Date(tm.lastInteractionDate!).getTime()) / 86400000);
                    if (days === 0) return 'Hoy';
                    if (days === 1) return 'Ayer';
                    return `Hace ${days} días`;
                  })()}
                </span>
              </div>
            )}

            {/* Topics */}
            {tm.topicsCovered.length > 0 && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Temas consultados</p>
                <div className="flex flex-wrap gap-1.5">
                  {tm.topicsCovered.map((t, i) => (
                    <span key={i} className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-[11px] font-semibold">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {tm.totalInteractions === 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  💡 <strong>Tip:</strong> El Tutor IA puede ayudarte a entender mejor los conceptos.
                  <button
                    onClick={() => navigate('/tutor')}
                    className="ml-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Ir al Tutor →
                  </button>
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ── Perfil de Aprendizaje ── */}
        <Card className="p-6 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 mb-4">
            <IconTrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tu Perfil de Aprendizaje</h2>
          </div>

          <div className="space-y-4">
            {/* Profile badge */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-2xl text-indigo-500">person_search</span>
                <div>
                  <p className={`text-base font-extrabold ${usageProfile.color}`}>{usageProfile.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{usageProfile.desc}</p>
                </div>
              </div>
            </div>

            {/* Efficiency */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Eficiencia del Tutor</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{insights.efficiency.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${insights.efficiency}%`,
                    background: insights.efficiency > 70 ? '#10b981'
                      : insights.efficiency > 30 ? '#f59e0b' : '#ef4444',
                  }}
                ></div>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                {insights.efficiency > 70
                  ? '✅ Excelente impacto — resuelves tus dudas y avanzas rápido'
                  : insights.efficiency > 30
                    ? '⚠️ Impacto moderado — el tutor te ayuda pero podrías profundizar más'
                    : '💡 Bajo impacto — intenta hacer preguntas más específicas al tutor'}
              </p>
            </div>

            {/* Correlation insight */}
            {insights.tutorUsageVsProgress === 'high-usage-high-progress' && (
              <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
                <div className="flex items-start gap-2">
                  <IconCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-green-800 dark:text-green-300">¡Excelente Correlación! 🎉</p>
                    <p className="text-xs text-green-700 dark:text-green-400">Tu uso del tutor está positivamente correlacionado con tu avance. Sigue así.</p>
                  </div>
                </div>
              </div>
            )}
            {insights.tutorUsageVsProgress === 'high-usage-low-progress' && (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl">
                <div className="flex items-start gap-2">
                  <IconAlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-orange-800 dark:text-orange-300">Revisa tu Estrategia</p>
                    <p className="text-xs text-orange-700 dark:text-orange-400">Usas mucho el tutor pero no avanzas. Intenta preguntas más específicas y completa las actividades pendientes.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ═══ RECOMENDACIONES PERSONALIZADAS ═══ */}
      {insights.recommendedActions.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10 border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 icon-filled">auto_awesome</span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recomendaciones Personalizadas</h2>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-600 text-white uppercase tracking-wider">IA</span>
          </div>

          <div className="space-y-3">
            {insights.recommendedActions.map((action, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-white/70 dark:bg-gray-800/50 rounded-xl border border-indigo-100 dark:border-indigo-800/30"
              >
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{action}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-indigo-200/50 dark:border-indigo-800/30">
            <button
              onClick={() => navigate('/tutor')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">psychology</span>
              Consultar Tutor IA
            </button>
            <button
              onClick={() => navigate(`/courses/${id}/flashcards`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">style</span>
              Estudiar Flashcards
            </button>
            <button
              onClick={() => navigate(`/courses/${id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">school</span>
              Ir al Curso
            </button>
          </div>
        </Card>
      )}

      {/* ═══ PIE INFORMATIVO ═══ */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          <span className="material-symbols-outlined text-xs align-text-bottom">info</span>{' '}
          Este análisis se genera automáticamente a partir de tu actividad en el curso. Los datos se actualizan en tiempo real.
        </p>
      </div>
    </div>
  );
};

export default StudentSelfReportPage;
