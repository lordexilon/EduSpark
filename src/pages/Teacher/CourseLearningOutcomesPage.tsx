import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { IconArrowLeft, IconPlus, IconTrash } from '@/components/Common/Icons';
import { courseService, unitService, CourseUnit } from '@/services/teacherCourses';
import { quizService, Assessment } from '@/services/quizService';
import {
  learningOutcomeService,
  LearningOutcome,
  AssessmentLearningOutcomeLink
} from '@/services/learningOutcomeService';
import { supabaseUrl } from '@/lib/supabase';

const BLOOM_OPTIONS = ['', 'recordar', 'comprender', 'aplicar', 'analizar', 'evaluar', 'crear'];

/** PostgREST PGRST205: tabla no expuesta / no existe (migración pendiente en Supabase). */
function isMissingRaTablesError(e: unknown): boolean {
  const o = e as { code?: string; message?: string } | null;
  if (!o) return false;
  if (o.code === 'PGRST205') return true;
  const msg = String(o.message || '');
  return msg.includes('learning_outcomes') && (msg.includes('schema cache') || msg.includes('Could not find'));
}

function linksToMap(links: AssessmentLearningOutcomeLink[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const l of links) {
    if (!m.has(l.assessment_id)) m.set(l.assessment_id, new Set());
    m.get(l.assessment_id)!.add(l.learning_outcome_id);
  }
  return m;
}

export const CourseLearningOutcomesPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const cid = courseId ? parseInt(courseId, 10) : NaN;

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [los, setLos] = useState<LearningOutcome[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [linkMap, setLinkMap] = useState<Map<string, Set<string>>>(new Map());

  const [newCode, setNewCode] = useState('');
  const [newStatement, setNewStatement] = useState('');
  const [newBloom, setNewBloom] = useState('');
  const [newUnitId, setNewUnitId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  /** True si en Supabase aún no existen `learning_outcomes` / `assessment_learning_outcomes`. */
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  const load = useCallback(async () => {
    if (!courseId || Number.isNaN(cid)) return;
    setLoading(true);
    setError(null);
    setMigrationNeeded(false);
    try {
      const course = await courseService.getCourse(cid);
      setCourseTitle(course.title);
      const [u, asmt] = await Promise.all([
        unitService.getCourseUnits(cid),
        quizService.getCourseAssessmentsForTeacher(cid)
      ]);
      setUnits(u);
      setAssessments(asmt);

      try {
        const [loList, links] = await Promise.all([
          learningOutcomeService.listByCourse(cid),
          learningOutcomeService.listLinksForCourse(cid)
        ]);
        setLos(loList);
        setLinkMap(linksToMap(links));
      } catch (e: unknown) {
        if (isMissingRaTablesError(e)) {
          setMigrationNeeded(true);
          setLos([]);
          setLinkMap(new Map());
        } else {
          throw e;
        }
      }
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [cid, courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const unitLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of units) {
      map.set(u.id, `U${u.number}: ${u.title}`);
    }
    return map;
  }, [units]);

  const handleAddLo = async () => {
    if (migrationNeeded) {
      setError('Primero aplicá la migración SQL en Supabase (tablas learning_outcomes).');
      return;
    }
    const code = newCode.trim();
    const statement = newStatement.trim();
    if (!code || !statement) {
      setError('Código y enunciado son obligatorios.');
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const created = await learningOutcomeService.create({
        course_id: cid,
        unit_id: newUnitId || null,
        code,
        statement,
        bloom_level: newBloom || null,
        sort_order: los.length,
        is_active: true
      });
      setLos((prev) => [...prev, created].sort((a, b) => a.code.localeCompare(b.code)));
      setNewCode('');
      setNewStatement('');
      setNewBloom('');
      setNewUnitId('');
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'No se pudo crear el RA');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteLo = async (id: string) => {
    if (migrationNeeded) return;
    if (!confirm('¿Eliminar este resultado de aprendizaje? Se quitarán los vínculos con evaluaciones.')) return;
    try {
      await learningOutcomeService.delete(id);
      setLos((prev) => prev.filter((x) => x.id !== id));
      setLinkMap((prev) => {
        const next = new Map(prev);
        for (const [aid, set] of next) {
          set.delete(id);
          next.set(aid, new Set(set));
        }
        return next;
      });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  };

  const toggleLink = async (assessmentId: string, loId: string, checked: boolean) => {
    if (migrationNeeded) return;
    const current = new Map(linkMap);
    const set = new Set(current.get(assessmentId) || []);
    if (checked) set.add(loId);
    else set.delete(loId);
    current.set(assessmentId, set);
    setLinkMap(current);
    setSavingId(assessmentId);
    setError(null);
    try {
      await learningOutcomeService.setLinksForAssessment(assessmentId, [...set]);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Error al guardar vínculos');
      await load();
    } finally {
      setSavingId(null);
    }
  };

  if (!courseId || Number.isNaN(cid)) {
    return (
      <div className="p-6 text-center text-gray-600">Curso no válido</div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button variant="outline" onClick={() => navigate(`/teacher/courses/${courseId}`)} leftIcon={<IconArrowLeft className="w-4 h-4" />}>
            Volver al curso
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">Resultados de aprendizaje</h1>
          <p className="text-gray-600 dark:text-gray-400">{courseTitle}</p>
        </div>
      </div>

      {migrationNeeded && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700 px-4 py-4 text-sm text-amber-950 dark:text-amber-100 space-y-2">
          <p className="font-semibold">Faltan tablas en Supabase (error PGRST205 / 404)</p>
          <p>
            En el proyecto Supabase que usa esta app (<code className="rounded bg-amber-100/80 dark:bg-amber-900/50 px-1 break-all">{supabaseUrl}</code>),
            todavía no está aplicada la migración de Resultados de aprendizaje (debe coincidir con <code className="rounded px-1">VITE_SUPABASE_URL</code> en{' '}
            <code className="rounded px-1">.env</code>).
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Supabase Dashboard → tu proyecto → <strong>SQL Editor</strong> → New query.</li>
            <li>
              Pegá y ejecutá el archivo del repo:{' '}
              <code className="rounded bg-amber-100/80 dark:bg-amber-900/50 px-1 text-xs">
                supabase/migrations/20260328_learning_outcomes_fase_b.sql
              </code>
            </li>
            <li>Recargá esta página (F5).</li>
          </ol>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <Card className={`p-6 ${migrationNeeded ? 'opacity-60 pointer-events-none' : ''}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Nuevo resultado de aprendizaje</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código</label>
            <input
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="RA1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidad (opcional)</label>
            <select
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={newUnitId}
              onChange={(e) => setNewUnitId(e.target.value)}
            >
              <option value="">Todo el curso</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  U{u.number}: {u.title}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enunciado</label>
            <textarea
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm min-h-[80px]"
              value={newStatement}
              onChange={(e) => setNewStatement(e.target.value)}
              placeholder="El estudiante será capaz de..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bloom (opcional)</label>
            <select
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={newBloom}
              onChange={(e) => setNewBloom(e.target.value)}
            >
              {BLOOM_OPTIONS.map((o) => (
                <option key={o || 'none'} value={o}>
                  {o || '—'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleAddLo} disabled={adding} leftIcon={<IconPlus className="w-4 h-4" />}>
            Agregar RA
          </Button>
        </div>
      </Card>

      <Card className={`p-6 ${migrationNeeded ? 'opacity-60 pointer-events-none' : ''}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">RA declarados en el curso</h2>
        {migrationNeeded ? (
          <p className="text-gray-500 text-sm">Las tablas de RA no están disponibles hasta aplicar la migración.</p>
        ) : los.length === 0 ? (
          <p className="text-gray-500 text-sm">Aún no hay RA. Creá al menos uno para vincularlo a evaluaciones.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {los.map((lo) => (
              <li key={lo.id} className="py-4 flex flex-col sm:flex-row sm:justify-between gap-2">
                <div>
                  <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">{lo.code}</span>
                  {lo.unit_id && (
                    <span className="ml-2 text-xs text-gray-500">({unitLabel.get(lo.unit_id) || 'Unidad'})</span>
                  )}
                  {lo.bloom_level && (
                    <span className="ml-2 text-xs uppercase tracking-wide text-gray-400">{lo.bloom_level}</span>
                  )}
                  <p className="text-gray-800 dark:text-gray-200 mt-1">{lo.statement}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteLo(lo.id)}
                  className="self-start text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                >
                  <IconTrash className="w-4 h-4" /> Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className={`p-6 ${migrationNeeded ? 'opacity-60 pointer-events-none' : ''}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Vincular evaluaciones</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Marcá qué RA evidencia cada evaluación publicada. La evidencia de logro se considera al aprobar el instrumento (según reglas del curso).
        </p>
        {assessments.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay evaluaciones en este curso.</p>
        ) : los.length === 0 ? (
          <p className="text-gray-500 text-sm">Creá al menos un RA arriba para habilitar vínculos.</p>
        ) : (
          <div className="space-y-6">
            {assessments.map((a) => (
              <div
                key={a.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{a.title}</span>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {a.assessment_type}
                    </span>
                    {!a.is_published && (
                      <span className="ml-2 text-xs text-amber-600">Borrador</span>
                    )}
                  </div>
                  {savingId === a.id && (
                    <span className="text-xs text-gray-500">Guardando…</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {los.map((lo) => {
                    const checked = linkMap.get(a.id)?.has(lo.id) ?? false;
                    return (
                      <label
                        key={lo.id}
                        className="inline-flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleLink(a.id, lo.id, e.target.checked)}
                          disabled={savingId === a.id}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{lo.code}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
