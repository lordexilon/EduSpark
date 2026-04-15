-- Migración para Gestión Académica (Carreras y Materias)
-- Fecha: 2026-02-16
-- FIX: Manejo robusto de constraints y creación de índices únicos si faltan

-- 0. Verificar/Crear Tabla Instituciones
CREATE TABLE IF NOT EXISTS public.institutions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Tabla de Carreras
CREATE TABLE IF NOT EXISTS public.careers (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas y CONSTRAINTS (Crucial para ON CONFLICT)
DO $$
BEGIN
    -- Columnas
    ALTER TABLE public.careers ADD COLUMN IF NOT EXISTS duration_semesters INTEGER DEFAULT 10;
    ALTER TABLE public.careers ADD COLUMN IF NOT EXISTS total_credits INTEGER;
    ALTER TABLE public.careers ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES public.institutions(id) ON DELETE CASCADE;

    -- Indices Únicos (Necesarios para ON CONFLICT)
    -- Si ya existe un constraint global 'careers_code_key', podríamos querer borrarlo si choca, 
    -- pero por seguridad creamos el índice compuesto que necesitamos.
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'careers' AND indexname = 'idx_careers_institution_code'
    ) THEN
        CREATE UNIQUE INDEX idx_careers_institution_code ON public.careers (institution_id, code);
    END IF;
    
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- 2. Tabla de Materias (Subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
    id SERIAL PRIMARY KEY,
    career_id INTEGER REFERENCES public.careers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL DEFAULT 0,
    semester INTEGER NOT NULL, -- 1-12
    year INTEGER, -- 1-6
    prerequisite_subject_id INTEGER REFERENCES public.subjects(id),
    is_core BOOLEAN DEFAULT true, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar CONSTRAINT único para subjects
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'subjects' AND indexname = 'idx_subjects_career_code'
    ) THEN
        CREATE UNIQUE INDEX idx_subjects_career_code ON public.subjects (career_id, code);
    END IF;
END $$;

-- 3. Tabla de Matriculación en Carrera
CREATE TABLE IF NOT EXISTS public.career_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    career_id INTEGER NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active',
    current_semester INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, career_id)
);

-- 4. RLS y Políticas
ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_enrollments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'careers' AND policyname = 'Public read careers') THEN
        CREATE POLICY "Public read careers" ON public.careers FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'Public read subjects') THEN
        CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'career_enrollments' AND policyname = 'Students can view own enrollment') THEN
        CREATE POLICY "Students can view own enrollment" ON public.career_enrollments 
            FOR SELECT USING (auth.uid() = student_id);
    END IF;
END $$;

-- 5. SEED DATA: Universidad Demo + Medicina
DO $$
DECLARE
    demo_inst_id INTEGER;
    med_id INTEGER;
BEGIN
    -- 1. Crear Institución Demo
    INSERT INTO public.institutions (name, description)
    VALUES ('Universidad Demo (Paraguay)', 'Institución de prueba para Malla Curricular')
    ON CONFLICT DO NOTHING; -- Requiere unique constraint en name? Si no tiene, se duplicará. Mejor buscar.
    
    -- Select seguro
    SELECT id INTO demo_inst_id FROM public.institutions WHERE name = 'Universidad Demo (Paraguay)' LIMIT 1;
    
    -- Fallback si no existe (por si el insert anterior falló silenciosamente sin unique)
    IF demo_inst_id IS NULL THEN
        INSERT INTO public.institutions (name, description) VALUES ('Universidad Demo (Paraguay)', 'Institución de prueba para Malla Curricular') RETURNING id INTO demo_inst_id;
    END IF;

    -- 2. Crear Carrera vinculada
    -- Ahora REFERENCIAMOS el índice único creado arriba: idx_careers_institution_code
    INSERT INTO public.careers (institution_id, name, code, description, duration_semesters)
    VALUES (demo_inst_id, 'Medicina y Cirugía', 'MED-PY', 'Malla Curricular Medicina - Paraguay', 12)
    ON CONFLICT (institution_id, code) DO UPDATE SET 
        name = EXCLUDED.name,
        duration_semesters = EXCLUDED.duration_semesters
    RETURNING id INTO med_id;

    -- 3. Insertar Materias
    -- AÑO 1
    INSERT INTO public.subjects (career_id, semester, year, code, name, credits) VALUES 
    (med_id, 1, 1, 'ANA101', 'Anatomía Humana I', 8),
    (med_id, 1, 1, 'BIO101', 'Biología Celular y Genética', 6),
    (med_id, 1, 1, 'HIS101', 'Histología y Embriología I', 6),
    (med_id, 1, 1, 'QMC101', 'Química Biológica', 5),
    (med_id, 1, 1, 'FPS101', 'Física Médica', 4),
    (med_id, 2, 1, 'ANA102', 'Anatomía Humana II', 8),
    (med_id, 2, 1, 'HIS102', 'Histología y Embriología II', 6),
    (med_id, 2, 1, 'FIS101', 'Fisiología Humana I', 7),
    (med_id, 2, 1, 'BIO102', 'Bioestadística y Demografía', 4),
    (med_id, 2, 1, 'SOC101', 'Socioantropología Médica', 3)
    ON CONFLICT (career_id, code) DO UPDATE SET name = EXCLUDED.name;

    -- AÑO 2
    INSERT INTO public.subjects (career_id, semester, year, code, name, credits) VALUES 
    (med_id, 3, 2, 'FIS102', 'Fisiología Humana II', 7),
    (med_id, 3, 2, 'MIC101', 'Microbiología y Parasitología I', 6),
    (med_id, 3, 2, 'PAT101', 'Anatomía Patológica I', 6),
    (med_id, 3, 2, 'PSI101', 'Psicología Médica', 4),
    (med_id, 4, 2, 'FAR101', 'Farmacología I', 6),
    (med_id, 4, 2, 'PAT102', 'Anatomía Patológica II', 6),
    (med_id, 4, 2, 'MIC102', 'Microbiología y Parasitología II', 6),
    (med_id, 4, 2, 'FIS103', 'Fisiopatología', 7)
    ON CONFLICT (career_id, code) DO UPDATE SET name = EXCLUDED.name;
    
    -- AÑO 3
    INSERT INTO public.subjects (career_id, semester, year, code, name, credits) VALUES 
    (med_id, 5, 3, 'MED301', 'Semiología Médica', 8),
    (med_id, 5, 3, 'FAR102', 'Farmacología II', 6),
    (med_id, 5, 3, 'IMG101', 'Imagenología', 5),
    (med_id, 6, 3, 'MED302', 'Medicina Interna I', 10),
    (med_id, 6, 3, 'CIR301', 'Técnica Quirúrgica', 6),
    (med_id, 6, 3, 'BIO201', 'Bioética', 3)
    ON CONFLICT (career_id, code) DO UPDATE SET name = EXCLUDED.name;

END $$;
