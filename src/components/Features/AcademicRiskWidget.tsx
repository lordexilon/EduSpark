// components/Features/AcademicRiskWidget.tsx
// S3-T04 — Panel de riesgo académico para dashboard docente (HU-D03)
// Identifica estudiantes en riesgo: avance < umbral O sin entregas en tareas vencidas.

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/Common/Skeleton';
import { adminReportsText } from '@/constants/adminReportsLabels';
import { useUiLang } from '@/hooks/useUiLang';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RiskStudent {
  student_id: string;
  student_name: string;
  student_email: string;
  course_id: number;
  course_title: string;
  completion_pct: number; // 0–100
  has_overdue_no_submission: boolean;
  risk_level: 'critical' | 'warning'; // critical = <10%, warning = <30% o sin entregas en vencidas
}

interface AcademicRiskWidgetProps {
  courseIds: number[]; // cursos del docente auth
  maxVisible?: number; // cuántos se muestran antes de "ver todos"
}

const RISK_THRESHOLD_CRITICAL = 10; // < 10% → crítico
const RISK_THRESHOLD_WARNING = 30; // 10–30% → advertencia

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

const getAvatarColor = (name: string) => {
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-rose-500', 'bg-pink-500'];
  return colors[name.charCodeAt(0) % colors.length];
};

const RiskBadge: React.FC<{ level: 'critical' | 'warning'; pct: number }> = ({ level, pct }) => (
  <span
    className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
      level === 'critical'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    }`}
  >
    {pct}%
  </span>
);

// ─── Componente ───────────────────────────────────────────────────────────────

export const AcademicRiskWidget: React.FC<AcademicRiskWidgetProps> = ({
  courseIds,
  maxVisible = 5,
}) => {
  const [students, setStudents] = useState<RiskStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const uiLang = useUiLang();
  const text = adminReportsText[uiLang];

  const loadRisk = useCallback(async () => {
    if (courseIds.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // ── Query 1: Inscripciones con avance bajo (< 30%) ──────────────────────
      const { data: lowProgress, error: lpErr } = await supabase
        .from('course_enrollments')
        .select(
          `
          student_id,
          course_id,
          completion_percentage,
          users:student_id (first_name, last_name, email),
          courses:course_id (title)
        `
        )
        .in('course_id', courseIds)
        .eq('status', 'active')
        .lt('completion_percentage', RISK_THRESHOLD_WARNING);

      if (lpErr) throw lpErr;

      // ── Query 2: Tareas vencidas (due_at < now) ────────────────────────────
      const { data: overdueAssignments, error: oaErr } = await supabase
        .from('assignments')
        .select('id, course_id')
        .in('course_id', courseIds)
        .lt('due_at', new Date().toISOString())
        .not('due_at', 'is', null);

      if (oaErr) throw oaErr;

      // Si hay tareas vencidas, buscar qué estudiantes NO entregaron
      let studentsMissingSubmissions = new Set<string>();
      if (overdueAssignments && overdueAssignments.length > 0) {
        const overdueIds = overdueAssignments.map((a) => a.id);
        const { data: submissions } = await supabase
          .from('assignment_submissions')
          .select('student_id, assignment_id')
          .in('assignment_id', overdueIds);

        // Estudiantes que sí entregaron al menos una
        const submittedStudents = new Set((submissions || []).map((s) => s.student_id));

        // Buscar inscritos en cursos con tareas vencidas que NO entregaron
        const { data: enrolledInOverdue } = await supabase
          .from('course_enrollments')
          .select('student_id')
          .in(
            'course_id',
            overdueAssignments.map((a) => a.course_id)
          )
          .eq('status', 'active');

        (enrolledInOverdue || []).forEach((e) => {
          if (!submittedStudents.has(e.student_id)) {
            studentsMissingSubmissions.add(e.student_id);
          }
        });
      }

      // ── Combinar resultados ─────────────────────────────────────────────────
      const riskMap = new Map<string, RiskStudent>();

      (lowProgress || []).forEach((row: any) => {
        const pct = Math.round(row.completion_percentage ?? 0);
        const key = `${row.student_id}_${row.course_id}`;
        const name = row.users
          ? `${row.users.first_name || ''} ${row.users.last_name || ''}`.trim() || row.users.email
          : 'Estudiante';

        riskMap.set(key, {
          student_id: row.student_id,
          student_name: name,
          student_email: row.users?.email ?? '',
          course_id: row.course_id,
          course_title: row.courses?.title ?? '—',
          completion_pct: pct,
          has_overdue_no_submission: studentsMissingSubmissions.has(row.student_id),
          risk_level: pct < RISK_THRESHOLD_CRITICAL ? 'critical' : 'warning',
        });
      });

      // Ordenar: críticos primero, luego por % ascendente
      const sorted = Array.from(riskMap.values()).sort((a, b) => {
        if (a.risk_level !== b.risk_level) return a.risk_level === 'critical' ? -1 : 1;
        return a.completion_pct - b.completion_pct;
      });

      setStudents(sorted);
    } catch (e) {
      console.error('AcademicRiskWidget error:', e);
    } finally {
      setLoading(false);
    }
  }, [courseIds.join(',')]);

  useEffect(() => {
    loadRisk();
  }, [loadRisk]);

  const visible = expanded ? students : students.slice(0, maxVisible);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-surface/60 backdrop-blur-xl rounded-[2rem] border border-white/20 dark:border-white/5 shadow-2xl p-6 space-y-6">
      {/* Header Premium */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-red-500/10 flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
            <span
              className="material-symbols-outlined text-red-500 text-[24px] relative z-10"
              aria-hidden="true"
            >
              analytics
            </span>
          </div>
          <div>
            <h3 className="text-base font-black text-text-dark tracking-tight leading-none mb-1">
              {text.riskTitle}
            </h3>
            <p className="text-[10px] font-black text-text-light/50 uppercase tracking-[0.1em]">
              Análisis Académico Predictivo
            </p>
          </div>
        </div>
        {!loading && students.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/5 border border-red-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-[11px] font-black text-red-600">{students.length} alertas</span>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/2 rounded-full" />
                <Skeleton className="h-2 w-1/4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : students.length === 0 ? (
        /* Empty state positivo */
        <div className="py-12 text-center rounded-3xl bg-emerald-500/[0.03] border border-emerald-500/10">
          <div className="size-16 mx-auto mb-4 rounded-3xl bg-emerald-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-600 text-[32px] animate-bounce">
              verified_user
            </span>
          </div>
          <h4 className="text-lg font-black text-emerald-700 dark:text-emerald-400 leading-tight">
            {text.allClear}
          </h4>
          <p className="text-xs font-medium text-text-light/60 mt-1">{text.noRiskDesc}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => (
            <div
              key={`${s.student_id}_${s.course_id}`}
              className="group flex items-center gap-4 p-3.5 rounded-[1.25rem] bg-surface/40 hover:bg-white hover:shadow-xl hover:shadow-primary/5 dark:hover:bg-white/5 transition-all duration-300 border border-border"
            >
              {/* Avatar "Crystal" */}
              <Link
                to={`/teacher/courses/${s.course_id}/progress`}
                className={`relative size-11 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0 shadow-lg ${getAvatarColor(s.student_name)} ring-4 ring-white dark:ring-gray-900 group-hover:scale-110 transition-transform`}
              >
                {getInitials(s.student_name)}
                {s.risk_level === 'critical' && (
                  <span className="absolute -top-1 -right-1 size-4 bg-red-600 border-2 border-white dark:border-gray-900 rounded-full flex items-center justify-center">
                    <span className="size-1.5 bg-white rounded-full animate-ping"></span>
                  </span>
                )}
              </Link>

              {/* Info */}
              <Link to={`/teacher/courses/${s.course_id}/progress`} className="flex-1 min-w-0">
                <p className="text-xs font-black text-text-dark truncate group-hover:text-primary transition-colors mb-0.5">
                  {s.student_name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 truncate max-w-[120px]">
                    {s.course_title}
                  </span>
                  {s.has_overdue_no_submission && (
                    <span className="flex items-center gap-0.5 text-[10px] font-black text-orange-600">
                      <span className="material-symbols-outlined text-[12px]">event_busy</span>
                      TAREAS
                    </span>
                  )}
                </div>
              </Link>

              {/* Badges & Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p
                    className={`text-sm font-black italic tracking-tighter ${s.risk_level === 'critical' ? 'text-red-600' : 'text-amber-600'}`}
                  >
                    {s.completion_pct}%
                  </p>
                  <p className="text-[9px] font-black text-text-light/40 uppercase">Avance</p>
                </div>

                <Link
                  to={`/teacher/messages?userId=${s.student_id}`}
                  className="size-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all opacity-0 group-hover:opacity-100"
                  title={text.sendMsg}
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </Link>
              </div>
            </div>
          ))}

          {/* Expandir / ver todos */}
          {students.length > maxVisible && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-full mt-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-text-light/60 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
            >
              {expanded ? `Reducir Vista ↑` : `Ver todos los Alertas (${students.length}) →`}
            </button>
          )}
        </div>
      )}

      {/* Leyenda Premium */}
      {!loading && students.length > 0 && (
        <div className="pt-4 mt-2 border-t border-border flex items-center justify-between text-[9px] font-black text-text-light/50 uppercase tracking-widest">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-red-600" />
              Crítico
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Atención
            </span>
          </div>
          <p>EduSpark Predictor S6</p>
        </div>
      )}
    </div>
  );
};

export default AcademicRiskWidget;
