-- Fase B: Resultados de aprendizaje (RA) y vínculo assessment ↔ RA
-- Referencia: AI_CONTEXT/04_FEATURES/RESULTADOS_APRENDIZAJE_MARCOS_COMPETENCIAS_EDUSPARK.md §10
-- Fecha: 2026-03-28

BEGIN;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'courses') THEN
    CREATE TABLE IF NOT EXISTS public.learning_outcomes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
        unit_id UUID REFERENCES public.course_units(id) ON DELETE SET NULL,
        code TEXT NOT NULL,
        statement TEXT NOT NULL,
        bloom_level TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT learning_outcomes_code_course UNIQUE (course_id, code)
    );

    CREATE INDEX IF NOT EXISTS idx_learning_outcomes_course ON public.learning_outcomes(course_id);
    CREATE INDEX IF NOT EXISTS idx_learning_outcomes_unit ON public.learning_outcomes(unit_id);

    COMMENT ON TABLE public.learning_outcomes IS 'Resultados de aprendizaje (RA); alcance curso y opcional unidad (Fase B).';
    COMMENT ON COLUMN public.learning_outcomes.unit_id IS 'NULL = RA a nivel curso; no NULL = desglose por unidad.';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assessments') THEN
    CREATE TABLE IF NOT EXISTS public.assessment_learning_outcomes (
        assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
        learning_outcome_id UUID NOT NULL REFERENCES public.learning_outcomes(id) ON DELETE CASCADE,
        weight NUMERIC(5,2) DEFAULT 1.0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (assessment_id, learning_outcome_id),
        CONSTRAINT assessment_lo_weight CHECK (weight > 0)
    );

    CREATE INDEX IF NOT EXISTS idx_assessment_lo_outcome ON public.assessment_learning_outcomes(learning_outcome_id);

    COMMENT ON TABLE public.assessment_learning_outcomes IS 'Vínculo evaluación → RA (evidencia vía assessment_attempts existentes).';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Integridad: mismo curso en assessment y RA
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_assessment_lo_same_course_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  acourse INTEGER;
  lcourse INTEGER;
BEGIN
  SELECT course_id INTO acourse FROM public.assessments WHERE id = NEW.assessment_id;
  SELECT course_id INTO lcourse FROM public.learning_outcomes WHERE id = NEW.learning_outcome_id;
  IF acourse IS NULL OR lcourse IS NULL OR acourse <> lcourse THEN
    RAISE EXCEPTION 'assessment y learning_outcome deben pertenecer al mismo curso';
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'learning_outcomes') THEN
    DROP TRIGGER IF EXISTS trg_assessment_lo_same_course ON public.assessment_learning_outcomes;
    CREATE TRIGGER trg_assessment_lo_same_course
      BEFORE INSERT OR UPDATE ON public.assessment_learning_outcomes
      FOR EACH ROW
      EXECUTE PROCEDURE public.trg_assessment_lo_same_course_fn();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- RLS (misma lógica que assessments en 20260219_fix_course_management_rls.sql)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'learning_outcomes') THEN
    ALTER TABLE public.learning_outcomes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assessment_learning_outcomes') THEN
    ALTER TABLE public.assessment_learning_outcomes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'learning_outcomes') THEN
    DROP POLICY IF EXISTS "View learning_outcomes" ON public.learning_outcomes;
    CREATE POLICY "View learning_outcomes" ON public.learning_outcomes
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.courses c
          WHERE c.id = learning_outcomes.course_id
          AND (
            public.check_user_access_to_institution(c.institution_id)
            OR c.teacher_id = auth.uid()
            OR public.check_is_enrolled_in_course(c.id)
          )
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'learning_outcomes') THEN
    DROP POLICY IF EXISTS "Manage learning_outcomes" ON public.learning_outcomes;
    CREATE POLICY "Manage learning_outcomes" ON public.learning_outcomes
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.courses c
          JOIN public.users u ON u.id = auth.uid()
          JOIN public.roles r ON u.role_id = r.id
          WHERE c.id = learning_outcomes.course_id
          AND (
            r.name = 'admin'
            OR c.teacher_id = auth.uid()
            OR (
              public.check_user_access_to_institution(c.institution_id)
              AND r.name IN ('admin-campus', 'supervisor', 'coordinator')
            )
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.courses c
          JOIN public.users u ON u.id = auth.uid()
          JOIN public.roles r ON u.role_id = r.id
          WHERE c.id = learning_outcomes.course_id
          AND (
            r.name = 'admin'
            OR c.teacher_id = auth.uid()
            OR (
              public.check_user_access_to_institution(c.institution_id)
              AND r.name IN ('admin-campus', 'supervisor', 'coordinator')
            )
          )
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assessment_learning_outcomes') THEN
    DROP POLICY IF EXISTS "View assessment_learning_outcomes" ON public.assessment_learning_outcomes;
    CREATE POLICY "View assessment_learning_outcomes" ON public.assessment_learning_outcomes
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.assessments a
          JOIN public.courses c ON c.id = a.course_id
          WHERE a.id = assessment_learning_outcomes.assessment_id
          AND (
            public.check_user_access_to_institution(c.institution_id)
            OR c.teacher_id = auth.uid()
            OR public.check_is_enrolled_in_course(c.id)
          )
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assessment_learning_outcomes') THEN
    DROP POLICY IF EXISTS "Manage assessment_learning_outcomes" ON public.assessment_learning_outcomes;
    CREATE POLICY "Manage assessment_learning_outcomes" ON public.assessment_learning_outcomes
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.assessments a
          JOIN public.courses c ON c.id = a.course_id
          JOIN public.users u ON u.id = auth.uid()
          JOIN public.roles r ON u.role_id = r.id
          WHERE a.id = assessment_learning_outcomes.assessment_id
          AND (
            r.name = 'admin'
            OR c.teacher_id = auth.uid()
            OR (
              public.check_user_access_to_institution(c.institution_id)
              AND r.name IN ('admin-campus', 'supervisor', 'coordinator')
            )
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.assessments a
          JOIN public.courses c ON c.id = a.course_id
          JOIN public.users u ON u.id = auth.uid()
          JOIN public.roles r ON u.role_id = r.id
          WHERE a.id = assessment_learning_outcomes.assessment_id
          AND (
            r.name = 'admin'
            OR c.teacher_id = auth.uid()
            OR (
              public.check_user_access_to_institution(c.institution_id)
              AND r.name IN ('admin-campus', 'supervisor', 'coordinator')
            )
          )
        )
      );
  END IF;
END $$;

COMMIT;
