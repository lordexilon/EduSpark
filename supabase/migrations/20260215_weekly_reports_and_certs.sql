-- Migración para Reportes Semanales y Certificados Digitales

-- 1. Tabla de Reportes Semanales del Tutor
-- Almacena el análisis consolidado hecho por IA una vez a la semana
CREATE TABLE IF NOT EXISTS public.tutor_weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL,
    week_number INTEGER NOT NULL, -- 1-52
    year INTEGER NOT NULL,
    report_json JSONB NOT NULL, -- { summary, strengths, weaknesses, path_forward }
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, course_id, week_number, year)
);

-- RLS para Reportes Semanales
ALTER TABLE public.tutor_weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own weekly reports" ON public.tutor_weekly_reports
    FOR SELECT USING (auth.uid() = student_id);

-- 2. Tabla de Certificados Digitales
CREATE TABLE IF NOT EXISTS public.digital_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL,
    certificate_code TEXT UNIQUE NOT NULL, -- Código de verificación
    issue_date TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB, -- { grade, completion_date, total_hours }
    is_revoked BOOLEAN DEFAULT false,
    
    UNIQUE(student_id, course_id)
);

-- RLS para Certificados
ALTER TABLE public.digital_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can verify a certificate by code" ON public.digital_certificates
    FOR SELECT USING (true); -- Publicly verifiable

CREATE POLICY "Students can view own certificates" ON public.digital_certificates
    FOR SELECT USING (auth.uid() = student_id);

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'courses') THEN
        ALTER TABLE public.tutor_weekly_reports ADD CONSTRAINT fk_tutor_weekly_reports_course
            FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
        ALTER TABLE public.digital_certificates ADD CONSTRAINT fk_digital_certificates_course
            FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
    END IF;
END;
$$;
