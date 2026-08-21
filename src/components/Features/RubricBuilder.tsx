// components/Features/RubricBuilder.tsx
// S3-T02 — Constructor y selector de rúbricas reutilizables (HU-D02)
// Permite al docente: crear, editar y seleccionar rúbricas para corregir entregas.

import React, { useState, useEffect, useCallback } from 'react';
import {
  rubricService,
  Rubric,
  RubricCriterion,
  RubricLevel,
  RubricSelection,
  DEFAULT_LEVELS,
} from '@/services/rubricService';

// ─── Tipos de uso del componente ──────────────────────────────────────────────

type RubricBuilderMode =
  | 'manage' // Gestión completa (ver, crear, editar, eliminar rúbricas)
  | 'select'; // Solo selección de rúbrica + aplicación (para pantalla de corrección)

interface RubricBuilderProps {
  mode: RubricBuilderMode;
  courseId?: number;
  /** Modo 'select': callback con la rúbrica seleccionada y las selecciones del docente */
  onApply?: (rubric: Rubric, selections: RubricSelection[], scorePercentage: number) => void;
  /** Modo 'select': puntaje máximo de la tarea para mostrar la escala */
  assignmentMaxPoints?: number;
  /** Callback al cerrar el panel (modo select) */
  onClose?: () => void;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export const RubricBuilder: React.FC<RubricBuilderProps> = ({
  mode,
  courseId,
  onApply,
  assignmentMaxPoints = 100,
  onClose,
}) => {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modo manage
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Modo select
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [selections, setSelections] = useState<RubricSelection[]>([]);
  const [teacherComment, setTeacherComment] = useState('');

  // ─── Carga ──────────────────────────────────────────────────────────────────

  const loadRubrics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await rubricService.getMyRubrics(courseId);
      setRubrics(data);
    } catch (e) {
      setError('No se pudieron cargar las rúbricas');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadRubrics();
  }, [loadRubrics]);

  // ─── Calcular puntaje (modo select) ─────────────────────────────────────────

  const computeScore = (): { percentage: number; scaledScore: number } => {
    if (!selectedRubric?.criteria?.length || selections.length === 0) {
      return { percentage: 0, scaledScore: 0 };
    }
    const maxLevelScore = Math.max(...DEFAULT_LEVELS.map((l) => l.score));
    let total = 0;
    selectedRubric.criteria.forEach((c) => {
      const sel = selections.find((s) => s.criterion_id === c.id);
      if (sel) total += (sel.selected_level_score / maxLevelScore) * c.weight;
    });
    const pct = Math.min(100, Math.max(0, total));
    const scaled = Math.round((pct / 100) * assignmentMaxPoints * 10) / 10;
    return { percentage: pct, scaledScore: scaled };
  };

  const { percentage, scaledScore } = computeScore();

  // ─── Handlers modo select ────────────────────────────────────────────────────

  const handleSelectLevel = (criterionId: string, score: number) => {
    setSelections((prev) => {
      const existing = prev.find((s) => s.criterion_id === criterionId);
      if (existing)
        return prev.map((s) =>
          s.criterion_id === criterionId ? { ...s, selected_level_score: score } : s
        );
      return [...prev, { criterion_id: criterionId, selected_level_score: score }];
    });
  };

  const handleApply = () => {
    if (!selectedRubric || !onApply) return;
    onApply(selectedRubric, selections, percentage);
  };

  const isFullyGraded = selectedRubric?.criteria?.length
    ? selections.length === selectedRubric.criteria.length
    : false;

  // ─── RENDER: Modo Select ──────────────────────────────────────────────────────────────

  if (mode === 'select') {
    return (
      <div className="flex flex-col h-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text-dark flex items-center gap-2">
            <span className="material-symbols-outlined text-brand-primary text-[20px]">grade</span>
            Rúbrica de evaluación
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="size-7 flex items-center justify-center rounded-lg text-text-light hover:text-text-dark hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
          </div>
        ) : rubrics.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-light">
            <span className="material-symbols-outlined text-3xl opacity-30 block mb-2">rule</span>
            No tienes rúbricas creadas. Créalas desde el panel de gestión.
          </div>
        ) : !selectedRubric ? (
          // Lista para seleccionar rúbrica
          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            <p className="text-xs text-text-light mb-3">
              Selecciona una rúbrica para aplicar a esta entrega:
            </p>
            {rubrics.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedRubric(r);
                  setSelections([]);
                }}
                className="w-full text-left p-3 rounded-xl border border-border hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-colors group"
              >
                <p className="font-semibold text-sm text-text-dark group-hover:text-brand-primary">
                  {r.title}
                </p>
                <p className="text-xs text-text-light mt-0.5">
                  {r.criteria?.length ?? 0} criterios
                </p>
              </button>
            ))}
          </div>
        ) : (
          // Grilla de evaluación
          <div className="flex flex-col flex-1 gap-4 overflow-hidden">
            {/* Rúbrica seleccionada encabezado */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedRubric(null)}
                className="size-7 flex items-center justify-center rounded-lg text-text-light hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              </button>
              <div>
                <p className="text-sm font-bold text-text-dark">{selectedRubric.title}</p>
                <p className="text-xs text-text-light">
                  {selectedRubric.criteria?.length} criterios
                </p>
              </div>
            </div>

            {/* Criterios */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {(selectedRubric.criteria ?? []).map((criterion) => {
                const sel = selections.find((s) => s.criterion_id === criterion.id);
                return (
                  <div
                    key={criterion.id}
                    className="rounded-xl border border-border p-3 bg-background/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-text-dark">{criterion.title}</p>
                        {criterion.description && (
                          <p className="text-xs text-text-light">{criterion.description}</p>
                        )}
                      </div>
                      <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                        {criterion.weight}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {(criterion.levels?.length ? criterion.levels : DEFAULT_LEVELS).map(
                        (level) => {
                          const isSelected = sel?.selected_level_score === level.score;
                          return (
                            <button
                              key={level.level}
                              type="button"
                              onClick={() => handleSelectLevel(criterion.id, level.score)}
                              className={`flex flex-col items-center p-2 rounded-lg border text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'border-brand-primary bg-brand-primary text-white shadow-md shadow-brand-primary/30'
                                  : 'border-border hover:border-brand-primary/40 hover:bg-brand-primary/5 text-text-dark'
                              }`}
                            >
                              <span className="text-[10px] uppercase tracking-wider opacity-70">
                                {level.label}
                              </span>
                              <span className="text-base font-black mt-0.5">{level.score}</span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comentario docente */}
            <textarea
              value={teacherComment}
              onChange={(e) => setTeacherComment(e.target.value)}
              placeholder="Comentario general para el estudiante (opcional)..."
              rows={2}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />

            {/* Puntaje calculado + botón aplicar */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
              <div>
                <p className="text-xs text-text-light">Puntaje calculado</p>
                <p className="text-xl font-black text-text-dark">
                  {scaledScore}{' '}
                  <span className="text-sm font-normal text-text-light">
                    / {assignmentMaxPoints} pts
                  </span>
                </p>
                <div className="mt-1 h-1.5 w-32 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-primary rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <button
                onClick={handleApply}
                disabled={!isFullyGraded}
                className="px-4 py-2 text-sm font-bold text-white bg-brand-primary rounded-xl disabled:opacity-50 hover:bg-brand-primary/90 transition-all active:scale-[0.97] shadow-md shadow-brand-primary/30"
              >
                Aplicar rúbrica
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── RENDER: Modo Manage ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-text-dark flex items-center gap-2">
            <span className="material-symbols-outlined text-brand-primary">rule</span>
            Mis Rúbricas
          </h2>
          <p className="text-sm text-text-light">
            Crea y reutiliza rúbricas para estandarizar la evaluación
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-brand-primary/90 transition-all shadow-md shadow-brand-primary/30"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva rúbrica
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Lista de rúbricas */}
          {rubrics.length === 0 && !isCreating && (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
              <span className="material-symbols-outlined text-4xl text-text-light opacity-30">
                rule
              </span>
              <p className="text-sm text-text-light mt-2">
                No tienes rúbricas aún.
                <br />
                Crea tu primera rúbrica para empezar.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rubrics.map((rubric) => (
              <div
                key={rubric.id}
                className="bg-surface border border-border rounded-2xl p-4 hover:border-brand-primary/40 transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-text-dark group-hover:text-brand-primary transition-colors">
                      {rubric.title}
                    </p>
                    {rubric.description && (
                      <p className="text-xs text-text-light mt-0.5 line-clamp-1">
                        {rubric.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingRubric(rubric)}
                      className="size-7 flex items-center justify-center rounded-lg text-text-light hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`¿Eliminar la rúbrica "${rubric.title}"?`)) return;
                        await rubricService.deleteRubric(rubric.id);
                        loadRubrics();
                      }}
                      className="size-7 flex items-center justify-center rounded-lg text-text-light hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs font-semibold bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full">
                    {rubric.criteria?.length ?? 0} criterios
                  </span>
                  {rubric.course_id ? (
                    <span className="text-xs text-text-light">Curso #{rubric.course_id}</span>
                  ) : (
                    <span className="text-xs text-text-light">Global</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Formulario de creación/edición */}
          {(isCreating || editingRubric) && (
            <RubricForm
              rubric={editingRubric}
              courseId={courseId}
              onSave={async () => {
                setIsCreating(false);
                setEditingRubric(null);
                await loadRubrics();
              }}
              onCancel={() => {
                setIsCreating(false);
                setEditingRubric(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

// ─── Subcomponente: Formulario de Rúbrica ─────────────────────────────────────

interface RubricFormProps {
  rubric: Rubric | null;
  courseId?: number;
  onSave: () => void;
  onCancel: () => void;
}

const EMPTY_CRITERION = (): Omit<RubricCriterion, 'id' | 'rubric_id' | 'created_at'> => ({
  title: '',
  description: '',
  order_index: 0,
  weight: 25,
  levels: DEFAULT_LEVELS.map((l) => ({ ...l })),
});

const RubricForm: React.FC<RubricFormProps> = ({ rubric, courseId, onSave, onCancel }) => {
  const [title, setTitle] = useState(rubric?.title ?? '');
  const [description, setDescription] = useState(rubric?.description ?? '');
  const [criteria, setCriteria] = useState<
    Omit<RubricCriterion, 'id' | 'rubric_id' | 'created_at'>[]
  >(
    rubric?.criteria?.map((c) => ({
      title: c.title,
      description: c.description ?? '',
      order_index: c.order_index,
      weight: c.weight,
      levels: c.levels,
    })) ?? [EMPTY_CRITERION()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalWeight = criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const weightOk = Math.abs(totalWeight - 100) < 0.01;

  const addCriterion = () => {
    const perCriterion = criteria.length > 0 ? Math.floor(100 / (criteria.length + 1)) : 100;
    setCriteria((prev) => {
      const updated = prev.map((c) => ({ ...c, weight: perCriterion }));
      return [...updated, { ...EMPTY_CRITERION(), weight: 100 - perCriterion * prev.length }];
    });
  };

  const removeCriterion = (i: number) => {
    setCriteria((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateCriterion = (
    i: number,
    updates: Partial<Omit<RubricCriterion, 'id' | 'rubric_id' | 'created_at'>>
  ) => {
    setCriteria((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...updates } : c)));
  };

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) {
      setError('El título de la rúbrica es obligatorio.');
      return;
    }
    if (criteria.some((c) => !c.title.trim())) {
      setError('Todos los criterios deben tener un título.');
      return;
    }
    if (!weightOk) {
      setError(`La suma de los pesos debe ser 100%. Actualmente: ${totalWeight.toFixed(1)}%`);
      return;
    }

    setSaving(true);
    try {
      let rubricId: string;
      if (rubric) {
        await rubricService.updateRubric(rubric.id, { title, description, course_id: courseId });
        rubricId = rubric.id;
      } else {
        const created = await rubricService.createRubric({
          title,
          description,
          course_id: courseId ?? null,
        });
        rubricId = created.id;
      }
      await rubricService.replaceCriteria(
        rubricId,
        criteria.map((c, i) => ({ ...c, order_index: i }))
      );
      onSave();
    } catch (e: any) {
      setError(e.message || 'Error al guardar la rúbrica');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface border-2 border-brand-primary/30 rounded-2xl p-5 space-y-5 shadow-lg">
      <h3 className="text-base font-bold text-text-dark">
        {rubric ? 'Editar rúbrica' : 'Nueva rúbrica'}
      </h3>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-red-500 shrink-0">error</span>
          {error}
        </div>
      )}

      {/* Título y descripción */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-text-dark mb-1">
            Nombre de la rúbrica *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Rúbrica de ensayo argumentativo"
            className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-dark mb-1">
            Descripción (opcional)
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe el propósito de la rúbrica"
            className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
          />
        </div>
      </div>

      {/* Criterios */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-text-dark">Criterios de evaluación</p>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${weightOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          >
            Σ pesos: {totalWeight.toFixed(0)}%
          </span>
        </div>

        <div className="space-y-3">
          {criteria.map((criterion, i) => (
            <div key={i} className="rounded-xl border border-border p-3 bg-background/50 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      value={criterion.title}
                      onChange={(e) => updateCriterion(i, { title: e.target.value })}
                      placeholder="Nombre del criterio *"
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={criterion.weight}
                      onChange={(e) =>
                        updateCriterion(i, { weight: parseFloat(e.target.value) || 0 })
                      }
                      min="1"
                      max="100"
                      className="w-full rounded-lg border border-border px-3 py-1.5 pr-8 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-light">
                      %
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeCriterion(i)}
                  disabled={criteria.length <= 1}
                  className="size-7 flex items-center justify-center rounded-lg text-text-light hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-[16px]">remove_circle</span>
                </button>
              </div>
              <input
                value={criterion.description}
                onChange={(e) => updateCriterion(i, { description: e.target.value })}
                placeholder="Descripción del criterio (opcional)"
                className="w-full rounded-lg border border-border px-3 py-1.5 text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-primary/40 text-text-light"
              />
              {/* Preview niveles */}
              <div className="grid grid-cols-4 gap-1">
                {DEFAULT_LEVELS.map((l) => (
                  <div
                    key={l.level}
                    className="text-center p-1.5 rounded-lg bg-muted text-[10px] font-semibold text-text-light"
                  >
                    <span className="block text-base font-black text-text-dark">{l.score}</span>
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addCriterion}
          className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:text-brand-primary/80 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Agregar criterio
        </button>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-3 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-semibold text-text-light hover:text-text-dark border border-border rounded-xl hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !weightOk}
          className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-brand-primary/90 disabled:opacity-50 transition-all shadow-md shadow-brand-primary/30"
        >
          {saving ? (
            <>
              <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">save</span>Guardar rúbrica
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RubricBuilder;
