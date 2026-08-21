/**
 * Resumen de RA evidenciados por curso (dashboard estudiante).
 * Solo se muestra si al menos un curso activo tiene RA definidos.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { courseEnrollmentService } from '@/services/academicService';
import { courseService } from '@/services/teacherCourses';
import { learningOutcomeService } from '@/services/learningOutcomeService';
import { dashboardStudentText } from '@/constants/courseViewCardLabels';
import { useUiLang } from '@/hooks/useUiLang';

type Row = { courseId: number; title: string; total: number; evidenced: number };

export const StudentLearningOutcomesSummary: React.FC<{ userId: string }> = ({ userId }) => {
  const cardLocale = useUiLang();
  const d = dashboardStudentText[cardLocale];
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) return;
      try {
        const enrollments = await courseEnrollmentService.getStudentEnrollments(userId);
        const active = enrollments.filter((e) => e.status === 'active');
        const ids = active.map((e) => e.course_id);
        if (ids.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }
        const summary = await learningOutcomeService.getCoursesRaSummary(ids, userId);
        const withRa = active.filter((e) => summary[e.course_id]?.total > 0);
        const titles = await Promise.all(
          withRa.map(async (e) => {
            try {
              const c = await courseService.getCourse(e.course_id);
              return { courseId: e.course_id, title: c.title, s: summary[e.course_id] };
            } catch {
              return {
                courseId: e.course_id,
                title: `${d.courseFallback} #${e.course_id}`,
                s: summary[e.course_id],
              };
            }
          })
        );
        const pending: Row[] = titles.map(({ courseId, title, s }) => ({
          courseId,
          title,
          total: s.total,
          evidenced: s.evidenced,
        }));
        if (!cancelled) setRows(pending);
      } catch (err) {
        console.warn('[StudentLearningOutcomesSummary]', err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, cardLocale]);

  if (loading || rows.length === 0) return null;

  return (
    <div
      className="bg-surface rounded-2xl p-5 md:p-6 border-2 border-border shadow-lg shadow-black/5 dark:shadow-black/20"
      data-tutorial="learning-outcomes-summary"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-text-dark dark:text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" aria-hidden>
            workspace_premium
          </span>
          Resultados de aprendizaje
        </h2>
        <p className="text-xs text-text-light max-w-xl">
          Progreso por curso según evaluaciones vinculadas por tu docente.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const pct = r.total > 0 ? Math.round((r.evidenced / r.total) * 100) : 0;
          return (
            <li
              key={r.courseId}
              className="rounded-xl border border-border bg-background/60 dark:bg-brand-dark/30 px-4 py-3 flex flex-col gap-2 min-w-0"
            >
              <p
                className="font-semibold text-text-dark dark:text-gray-100 text-sm truncate"
                title={r.title}
              >
                {r.title}
              </p>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-text-light">
                  {r.evidenced}/{r.total} {d.loDashboardEvidencedSuffix}
                </span>
                <span className="text-xs font-bold text-primary tabular-nums">{pct}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <Link
                to={`/courses/${r.courseId}`}
                className="text-xs font-bold text-primary hover:underline mt-1 inline-flex items-center gap-1"
              >
                {d.loDashboardLink}
                <span aria-hidden>→</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
