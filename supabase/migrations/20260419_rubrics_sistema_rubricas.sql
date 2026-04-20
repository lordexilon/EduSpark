-- ============================================================
-- Migration: 20260419_rubrics_sistema_rubricas.sql
-- S3-T02 Sprint 3 — Rúbricas reutilizables para evaluación docente
-- Proyecto: EduSpark (Supabase / PostgreSQL)
-- ============================================================

-- ─── Tabla de rúbricas ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rubrics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   integer REFERENCES courses(id) ON DELETE SET NULL,  -- null = rúbrica global del docente
  title       text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rubrics IS 'Rúbricas de evaluación reutilizables por docente. Pueden asociarse a un curso o ser globales.';

-- ─── Tabla de criterios ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rubric_criteria (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id   uuid NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  weight      numeric(5,2) NOT NULL DEFAULT 25.00,  -- % sobre 100 (suma de criterios = 100)
  -- Niveles de desempeño (JSONB para flexibilidad)
  -- Estructura esperada: [{ level: 'excelente'|'bueno'|'regular'|'insuficiente', label: text, description: text, score: numeric }]
  levels      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rubric_criteria IS 'Criterios de una rúbrica con sus niveles de desempeño y pesos porcentuales.';

-- ─── Tabla de resultados de rúbrica aplicada ──────────────────────────────────
CREATE TABLE IF NOT EXISTS rubric_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id       uuid NOT NULL REFERENCES rubrics(id) ON DELETE RESTRICT,
  submission_id   uuid NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  graded_by       uuid NOT NULL REFERENCES auth.users(id),
  -- Selecciones del docente: { criterion_id: uuid, selected_level_score: numeric, comment: text }[]
  selections      jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_score     numeric(6,2),       -- calculado en app o trigger
  max_score       numeric(6,2),       -- puntaje máximo posible de la rúbrica
  percentage      numeric(5,2),       -- total_score / max_score * 100
  teacher_comment text,
  graded_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id)              -- una rúbrica por entrega
);

COMMENT ON TABLE rubric_results IS 'Resultado de aplicar una rúbrica a una entrega específica.';

-- ─── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rubrics_teacher_id    ON rubrics(teacher_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_course_id     ON rubrics(course_id);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric ON rubric_criteria(rubric_id);
CREATE INDEX IF NOT EXISTS idx_rubric_results_submission ON rubric_results(submission_id);

-- ─── Trigger: updated_at automático en rubrics ────────────────────────────────
CREATE OR REPLACE FUNCTION update_rubrics_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rubrics_updated_at ON rubrics;
CREATE TRIGGER trg_rubrics_updated_at
  BEFORE UPDATE ON rubrics
  FOR EACH ROW EXECUTE FUNCTION update_rubrics_updated_at();

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE rubrics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_results  ENABLE ROW LEVEL SECURITY;

-- rubrics: docentes ven/crean/editan sus propias rúbricas
CREATE POLICY "rubrics_select_own"   ON rubrics FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "rubrics_insert_own"   ON rubrics FOR INSERT WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "rubrics_update_own"   ON rubrics FOR UPDATE USING (teacher_id = auth.uid());
CREATE POLICY "rubrics_delete_own"   ON rubrics FOR DELETE USING (teacher_id = auth.uid());

-- rubric_criteria: acceso a través de la rúbrica del docente
CREATE POLICY "rubric_criteria_select" ON rubric_criteria FOR SELECT
  USING (EXISTS (SELECT 1 FROM rubrics r WHERE r.id = rubric_id AND r.teacher_id = auth.uid()));
CREATE POLICY "rubric_criteria_insert" ON rubric_criteria FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM rubrics r WHERE r.id = rubric_id AND r.teacher_id = auth.uid()));
CREATE POLICY "rubric_criteria_update" ON rubric_criteria FOR UPDATE
  USING (EXISTS (SELECT 1 FROM rubrics r WHERE r.id = rubric_id AND r.teacher_id = auth.uid()));
CREATE POLICY "rubric_criteria_delete" ON rubric_criteria FOR DELETE
  USING (EXISTS (SELECT 1 FROM rubrics r WHERE r.id = rubric_id AND r.teacher_id = auth.uid()));

-- rubric_results: docente que calificó puede ver/editar; admins también
CREATE POLICY "rubric_results_select" ON rubric_results FOR SELECT USING (graded_by = auth.uid());
CREATE POLICY "rubric_results_insert" ON rubric_results FOR INSERT WITH CHECK (graded_by = auth.uid());
CREATE POLICY "rubric_results_update" ON rubric_results FOR UPDATE USING (graded_by = auth.uid());
