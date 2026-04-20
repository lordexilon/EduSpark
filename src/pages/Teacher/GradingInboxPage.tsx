// pages/Teacher/GradingInboxPage.tsx
// S3-T03 — Bandeja de corrección unificada (HU-D02)
// Lista todas las entregas pendientes del docente, con corrección inline + rúbricas.

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { submissionService, AssignmentSubmission } from '@/services/assignments';
import { rubricService, Rubric, RubricSelection } from '@/services/rubricService';
import { courseService, Course } from '@/services/teacherCourses';
import { RubricBuilder } from '@/components/Features/RubricBuilder';
import { RichTextDisplay } from '@/components/Common/RichTextDisplay';
import { Skeleton } from '@/components/Common/Skeleton';
import { formatDateTime } from '@/utils/dateFormat';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface EnrichedSubmission extends AssignmentSubmission {
  student_name: string;
  student_email: string;
  assignment_title: string;
  assignment_max_points: number;
  course_id: number;
  course_title: string;
}

type InboxFilter = 'pending' | 'graded' | 'all';

// ─── Componente principal ─────────────────────────────────────────────────────

const GradingInboxPage: React.FC = () => {
  const { user } = useAuth();

  const [submissions, setSubmissions] = useState<EnrichedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>('pending');

  // Panel lateral de corrección
  const [activeSubmission, setActiveSubmission] = useState<EnrichedSubmission | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Rúbrica
  const [showRubric, setShowRubric] = useState(false);

  // ─── Carga de datos ────────────────────────────────────────────────────────

  const loadInbox = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Cursos del docente
      const courses = await courseService.getMyCourses(user.id);
      if (courses.length === 0) { setSubmissions([]); return; }

      const courseIds = courses.map(c => c.id);
      const courseMap = new Map<number, string>(courses.map(c => [c.id, c.title]));

      // 2. Assignments del docente (batch)
      const { data: assignments, error: aErr } = await supabase
        .from('assignments')
        .select('id, title, max_points, course_id')
        .in('course_id', courseIds);

      if (aErr) throw aErr;
      if (!assignments || assignments.length === 0) { setSubmissions([]); return; }

      const assignmentIds = assignments.map(a => a.id);
      const assignmentMap = new Map(assignments.map(a => [a.id, a]));

      // 3. Submissions (batch) + datos de usuario
      const { data: subs, error: sErr } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          users:student_id (id, first_name, last_name, email)
        `)
        .in('assignment_id', assignmentIds)
        .order('submitted_at', { ascending: false });

      if (sErr) throw sErr;

      const enriched: EnrichedSubmission[] = (subs || []).map((s: any) => {
        const assignment = assignmentMap.get(s.assignment_id)!;
        const u = s.users;
        return {
          ...s,
          student_name: u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email : 'Estudiante',
          student_email: u?.email ?? '',
          assignment_title: assignment?.title ?? '—',
          assignment_max_points: assignment?.max_points ?? 100,
          course_id: assignment?.course_id,
          course_title: courseMap.get(assignment?.course_id) ?? '—',
        };
      });

      setSubmissions(enriched);
    } catch (e: any) {
      setError(e.message || 'Error al cargar la bandeja');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  // ─── Filtrado ──────────────────────────────────────────────────────────────

  const filteredSubmissions = submissions.filter(s => {
    if (filter === 'pending') return s.grade === null || s.grade === undefined;
    if (filter === 'graded')  return s.grade !== null && s.grade !== undefined;
    return true;
  });

  const pendingCount = submissions.filter(s => s.grade === null || s.grade === undefined).length;

  // ─── Seleccionar entrega para corregir ─────────────────────────────────────

  const openSubmission = (sub: EnrichedSubmission) => {
    setActiveSubmission(sub);
    setGradeInput(sub.grade?.toString() ?? '');
    setFeedbackInput(sub.feedback ?? '');
    setShowRubric(false);
    setSaveMsg(null);
  };

  // ─── Guardar nota manualmente ──────────────────────────────────────────────

  const handleSaveGrade = async () => {
    if (!activeSubmission) return;
    const grade = parseFloat(gradeInput);
    if (isNaN(grade) || grade < 0 || grade > activeSubmission.assignment_max_points) {
      setSaveMsg(`Nota inválida (0–${activeSubmission.assignment_max_points})`);
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      await submissionService.gradeSubmission(activeSubmission.id, grade, feedbackInput);
      setSaveMsg('✅ Calificación guardada');
      // Actualizar localmente para no recargar todo
      setSubmissions(prev => prev.map(s =>
        s.id === activeSubmission.id ? { ...s, grade, feedback: feedbackInput } : s
      ));
      setActiveSubmission(prev => prev ? { ...prev, grade, feedback: feedbackInput } : null);
    } catch (e: any) {
      setSaveMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ─── Aplicar rúbrica ───────────────────────────────────────────────────────

  const handleApplyRubric = async (
    rubric: Rubric,
    selections: RubricSelection[],
    scorePercentage: number
  ) => {
    if (!activeSubmission) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      // Calcular puntaje escalado
      const scaledScore = Math.round((scorePercentage / 100) * activeSubmission.assignment_max_points * 10) / 10;

      // Aplicar rúbrica en BD
      await rubricService.applyRubric({
        rubric_id: rubric.id,
        submission_id: activeSubmission.id,
        criteria: rubric.criteria ?? [],
        selections,
        teacher_comment: feedbackInput,
        assignment_max_points: activeSubmission.assignment_max_points,
      });

      // También guardar nota en assignment_submissions
      await submissionService.gradeSubmission(activeSubmission.id, scaledScore, feedbackInput);

      setGradeInput(scaledScore.toString());
      setSubmissions(prev => prev.map(s =>
        s.id === activeSubmission.id ? { ...s, grade: scaledScore, feedback: feedbackInput } : s
      ));
      setActiveSubmission(prev => prev ? { ...prev, grade: scaledScore } : null);
      setShowRubric(false);
      setSaveMsg(`✅ Rúbrica aplicada — ${scaledScore} / ${activeSubmission.assignment_max_points} pts`);
    } catch (e: any) {
      setSaveMsg(`Error al aplicar rúbrica: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers UI ────────────────────────────────────────────────────────────

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getAvatarColor = (name: string) => {
    const colors = ['bg-indigo-500','bg-purple-500','bg-pink-500','bg-cyan-500','bg-emerald-500','bg-amber-500'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-text-dark flex items-center gap-2">
            <span className="material-symbols-outlined text-brand-primary">inbox</span>
            Bandeja de corrección
          </h1>
          <p className="text-sm text-text-light mt-1">
            {pendingCount > 0
              ? <><span className="font-bold text-orange-600">{pendingCount}</span> entregas pendientes de corrección</>
              : '¡Todas las entregas están calificadas! ✅'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['pending','graded','all'] as InboxFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filter === f
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-surface border border-border text-text-light hover:text-text-dark'
              }`}
            >
              {f === 'pending' ? 'Pendientes' : f === 'graded' ? 'Calificadas' : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      <div className={`flex gap-6 items-start ${activeSubmission ? 'flex-col lg:flex-row' : ''}`}>

        {/* ── Lista de entregas ── */}
        <div className={`${activeSubmission ? 'lg:w-5/12 xl:w-4/12' : 'w-full'} space-y-3`}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
              <span className="material-symbols-outlined text-5xl text-text-light opacity-20 block mb-3">
                {filter === 'pending' ? 'task_alt' : 'inbox'}
              </span>
              <p className="text-sm text-text-light">
                {filter === 'pending' ? '¡No hay entregas pendientes!' : 'No hay entregas aún'}
              </p>
            </div>
          ) : (
            filteredSubmissions.map(sub => {
              const isPending = sub.grade === null || sub.grade === undefined;
              const isActive = activeSubmission?.id === sub.id;

              return (
                <button
                  key={sub.id}
                  onClick={() => openSubmission(sub)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all group ${
                    isActive
                      ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                      : 'border-border bg-surface hover:border-brand-primary/40 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`size-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 ${getAvatarColor(sub.student_name)}`}>
                      {getInitials(sub.student_name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-text-dark truncate">{sub.student_name}</p>
                        {isPending
                          ? <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full shrink-0">Pendiente</span>
                          : <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">{sub.grade} / {sub.assignment_max_points}</span>
                        }
                      </div>
                      <p className="text-xs text-text-light truncate">{sub.assignment_title}</p>
                      <p className="text-[10px] text-text-light opacity-60 mt-0.5">{sub.course_title} · {formatDateTime(sub.submitted_at)}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Panel de corrección ── */}
        {activeSubmission && (
          <div className="flex-1 bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">

            {/* Header del panel */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`size-9 rounded-full flex items-center justify-center text-white text-xs font-black ${getAvatarColor(activeSubmission.student_name)}`}>
                  {getInitials(activeSubmission.student_name)}
                </div>
                <div>
                  <p className="text-sm font-bold text-text-dark">{activeSubmission.student_name}</p>
                  <p className="text-xs text-text-light">{activeSubmission.assignment_title} · {activeSubmission.course_title}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubmission(null)}
                className="size-7 flex items-center justify-center rounded-lg text-text-light hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[calc(100vh-14rem)] overflow-y-auto">

              {/* Entregado en */}
              <p className="text-xs text-text-light flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                Entregado: {formatDateTime(activeSubmission.submitted_at)}
              </p>

              {/* Contenido de la entrega */}
              {activeSubmission.text && (
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="text-xs font-bold text-text-light uppercase tracking-wider mb-2">Respuesta del estudiante</p>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-text-dark">
                    <RichTextDisplay content={activeSubmission.text} />
                  </div>
                </div>
              )}

              {activeSubmission.url && (
                <a
                  href={activeSubmission.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-colors text-sm font-semibold text-text-dark"
                >
                  <span className="material-symbols-outlined text-brand-primary text-[20px]">attach_file</span>
                  Ver archivo adjunto
                  <span className="material-symbols-outlined text-text-light text-[16px] ml-auto">open_in_new</span>
                </a>
              )}

              {!activeSubmission.text && !activeSubmission.url && (
                <div className="text-center py-6 text-text-light text-sm">
                  <span className="material-symbols-outlined text-3xl opacity-30 block mb-1">description</span>
                  Sin contenido visible en esta entrega
                </div>
              )}

              {/* Calificación manual */}
              <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-text-dark">Calificación</p>
                  <button
                    onClick={() => setShowRubric(v => !v)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg transition-colors ${
                      showRubric
                        ? 'bg-brand-primary text-white'
                        : 'border border-border text-text-light hover:text-brand-primary hover:border-brand-primary/40'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">rule</span>
                    {showRubric ? 'Cerrar rúbrica' : 'Usar rúbrica'}
                  </button>
                </div>

                {/* Rúbrica inline */}
                {showRubric ? (
                  <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4 max-h-96 overflow-y-auto">
                    <RubricBuilder
                      mode="select"
                      courseId={activeSubmission.course_id}
                      assignmentMaxPoints={activeSubmission.assignment_max_points}
                      onApply={handleApplyRubric}
                      onClose={() => setShowRubric(false)}
                    />
                  </div>
                ) : (
                  // Calificación numérica manual
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max={activeSubmission.assignment_max_points}
                        step="0.5"
                        value={gradeInput}
                        onChange={e => setGradeInput(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-xl border border-border px-4 py-2.5 pr-20 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-light font-semibold">
                        / {activeSubmission.assignment_max_points}
                      </span>
                    </div>
                    {/* Barra de porcentaje */}
                    {gradeInput && !isNaN(parseFloat(gradeInput)) && (
                      <div className="text-sm font-bold text-brand-primary w-12 text-right">
                        {Math.round((parseFloat(gradeInput) / activeSubmission.assignment_max_points) * 100)}%
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback */}
                <textarea
                  value={feedbackInput}
                  onChange={e => setFeedbackInput(e.target.value)}
                  rows={3}
                  placeholder="Escribe tu retroalimentación para el estudiante..."
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-sm bg-white dark:bg-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                />

                {/* Guardar */}
                {!showRubric && (
                  <div className="flex items-center justify-between gap-3">
                    {saveMsg && (
                      <p className={`text-xs font-semibold ${saveMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                        {saveMsg}
                      </p>
                    )}
                    <button
                      onClick={handleSaveGrade}
                      disabled={saving || !gradeInput}
                      className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-brand-primary/90 disabled:opacity-50 transition-all shadow-md shadow-brand-primary/30 active:scale-[0.97]"
                    >
                      {saving
                        ? <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
                        : <><span className="material-symbols-outlined text-[18px]">save</span>Guardar nota</>
                      }
                    </button>
                  </div>
                )}

                {showRubric && saveMsg && (
                  <p className={`text-xs font-semibold ${saveMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                    {saveMsg}
                  </p>
                )}
              </div>

              {/* Link a submissions completas de esa tarea */}
              <Link
                to={`/teacher/assignments/${activeSubmission.assignment_id}/submissions`}
                className="flex items-center gap-1.5 text-xs font-semibold text-text-light hover:text-brand-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Ver todas las entregas de esta tarea
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradingInboxPage;
