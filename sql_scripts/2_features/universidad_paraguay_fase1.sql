-- =====================================================
-- MIGRACIÓN: Módulos Universidad Paraguay - Fase 1
-- =====================================================
-- Descripción: Agrega soporte para escalas de calificación, 
--              campo year en subjects, y tipos de grado Paraguay
-- Fecha: 2026-02-09
-- =====================================================

-- =====================================================
-- 1. TABLA: grading_scales (Escalas de Calificación)
-- =====================================================
-- Permite configurar escalas 1-5 (UC) o 1-10 (otras) por institución/materia

CREATE TABLE IF NOT EXISTS grading_scales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    -- Configuración de escala
    scale_name VARCHAR(50) NOT NULL DEFAULT 'Escala 1-5',
    min_grade DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    max_grade DECIMAL(4,2) NOT NULL DEFAULT 5.00,
    passing_grade DECIMAL(4,2) NOT NULL DEFAULT 3.00,
    passing_percentage DECIMAL(5,2) NOT NULL DEFAULT 60.00,
    -- Labels opcionales para cada nota
    grade_labels JSONB DEFAULT '["Reprobado", "Insuficiente", "Aceptable", "Bueno", "Excelente"]'::jsonb,
    -- Metadatos
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Constraint: al menos uno de institution_id o subject_id debe estar presente
    CONSTRAINT grading_scales_scope_check CHECK (
        institution_id IS NOT NULL OR subject_id IS NOT NULL
    )
);

-- Índice parcial único: solo una escala por defecto por institución
CREATE UNIQUE INDEX IF NOT EXISTS idx_grading_scales_unique_default 
ON grading_scales(institution_id) 
WHERE is_default = true;

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_grading_scales_institution ON grading_scales(institution_id);
CREATE INDEX IF NOT EXISTS idx_grading_scales_subject ON grading_scales(subject_id);

-- =====================================================
-- 2. AGREGAR CAMPO year A subjects (Año de la Malla)
-- =====================================================

ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS year INTEGER CHECK (year >= 1 AND year <= 10);

-- Migrar datos existentes: calcular year basado en semester
-- Suponiendo 2 semestres por año
UPDATE subjects 
SET year = CEIL(semester::float / 2)
WHERE semester IS NOT NULL AND year IS NULL;

-- Índice para ordenar por año
CREATE INDEX IF NOT EXISTS idx_subjects_year ON subjects(year);

-- =====================================================
-- 3. ACTUALIZAR degree_type EN careers (Tipos Paraguay)
-- =====================================================

-- Primero verificar los valores actuales permitidos
-- Agregar nuevos tipos específicos de Paraguay

-- Si degree_type es VARCHAR, solo documentamos los nuevos valores:
-- 'licenciatura' - Licenciatura (4-5 años)
-- 'medico_cirujano' - Médico Cirujano (6 años)
-- 'ingenieria' - Ingeniería (5 años)
-- 'tecnicatura' - Tecnicatura (2-3 años)
-- 'maestria' - Maestría (2 años)
-- 'doctorado' - Doctorado (3-5 años)
-- 'especializacion' - Especialización Médica (3-4 años)

COMMENT ON COLUMN careers.degree_type IS 
'Tipos de grado válidos para Paraguay:
- licenciatura: Licenciatura (4-5 años)
- medico_cirujano: Médico Cirujano (6 años)  
- ingenieria: Ingeniería (5 años)
- tecnicatura: Tecnicatura (2-3 años)
- maestria: Maestría (2 años)
- doctorado: Doctorado (3-5 años)
- especializacion: Especialización Médica (3-4 años)
- bachelor: (legacy) Equivalente a licenciatura
- master: (legacy) Equivalente a maestria
- doctorate: (legacy) Equivalente a doctorado
- technical: (legacy) Equivalente a tecnicatura';

-- =====================================================
-- 4. AGREGAR grading_scale_id A subject_grading_weights
-- =====================================================

ALTER TABLE subject_grading_weights
ADD COLUMN IF NOT EXISTS grading_scale_id UUID REFERENCES grading_scales(id);

-- =====================================================
-- 5. FUNCIÓN: Convertir porcentaje a nota según escala
-- =====================================================

CREATE OR REPLACE FUNCTION convert_percentage_to_grade(
    p_percentage DECIMAL,
    p_scale_id UUID DEFAULT NULL,
    p_subject_id INTEGER DEFAULT NULL,
    p_institution_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_scale grading_scales%ROWTYPE;
    v_grade DECIMAL(4,2);
    v_is_passing BOOLEAN;
    v_grade_label TEXT;
    v_label_index INTEGER;
BEGIN
    -- Obtener la escala aplicable (prioridad: subject > institution > default)
    SELECT * INTO v_scale FROM grading_scales 
    WHERE 
        (p_scale_id IS NOT NULL AND id = p_scale_id) OR
        (p_scale_id IS NULL AND subject_id = p_subject_id) OR
        (p_scale_id IS NULL AND p_subject_id IS NULL AND institution_id = p_institution_id AND is_default = true)
    ORDER BY 
        CASE WHEN subject_id IS NOT NULL THEN 1 ELSE 2 END,
        CASE WHEN is_default THEN 1 ELSE 2 END
    LIMIT 1;
    
    -- Si no hay escala configurada, usar escala por defecto 1-5
    IF v_scale IS NULL THEN
        v_scale.min_grade := 1;
        v_scale.max_grade := 5;
        v_scale.passing_grade := 3;
        v_scale.passing_percentage := 60;
        v_scale.grade_labels := '["Reprobado", "Insuficiente", "Aceptable", "Bueno", "Excelente"]'::jsonb;
    END IF;
    
    -- Calcular nota proporcional
    v_grade := v_scale.min_grade + (p_percentage / 100) * (v_scale.max_grade - v_scale.min_grade);
    v_grade := ROUND(v_grade, 2);
    
    -- Clamp al rango válido
    v_grade := GREATEST(v_scale.min_grade, LEAST(v_scale.max_grade, v_grade));
    
    -- Determinar si aprueba
    v_is_passing := v_grade >= v_scale.passing_grade;
    
    -- Obtener label correspondiente
    v_label_index := FLOOR((v_grade - v_scale.min_grade) / (v_scale.max_grade - v_scale.min_grade) * (jsonb_array_length(v_scale.grade_labels) - 1));
    v_label_index := GREATEST(0, LEAST(jsonb_array_length(v_scale.grade_labels) - 1, v_label_index));
    v_grade_label := v_scale.grade_labels->>v_label_index;
    
    RETURN jsonb_build_object(
        'percentage', p_percentage,
        'grade', v_grade,
        'is_passing', v_is_passing,
        'label', v_grade_label,
        'scale_min', v_scale.min_grade,
        'scale_max', v_scale.max_grade,
        'passing_grade', v_scale.passing_grade
    );
END;
$$;

-- =====================================================
-- 6. INSERTAR ESCALAS POR DEFECTO
-- =====================================================

-- Escala 1-5 (Universidad Católica style)
INSERT INTO grading_scales (
    institution_id, 
    scale_name, 
    min_grade, 
    max_grade, 
    passing_grade, 
    passing_percentage,
    grade_labels,
    is_default
)
SELECT 
    id as institution_id,
    'Escala 1-5 (Paraguay)',
    1.00,
    5.00,
    3.00,
    60.00,
    '["Reprobado (1)", "Insuficiente (2)", "Aceptable (3)", "Bueno (4)", "Distinguido (5)"]'::jsonb,
    true
FROM institutions
WHERE NOT EXISTS (
    SELECT 1 FROM grading_scales gs WHERE gs.institution_id = institutions.id
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;

-- Política de lectura: usuarios pueden ver escalas de su institución
CREATE POLICY grading_scales_select_policy ON grading_scales
    FOR SELECT
    USING (
        grading_scales.institution_id IN (
            SELECT ui.institution_id FROM user_institutions ui WHERE ui.user_id = auth.uid()
        )
        OR
        grading_scales.subject_id IN (
            SELECT s.id FROM subjects s
            JOIN careers c ON s.career_id = c.id
            WHERE c.institution_id IN (
                SELECT ui.institution_id FROM user_institutions ui WHERE ui.user_id = auth.uid()
            )
        )
    );

-- Política de inserción/actualización: solo admin y admin-campus
CREATE POLICY grading_scales_insert_policy ON grading_scales
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('admin', 'admin-campus')
        )
    );

CREATE POLICY grading_scales_update_policy ON grading_scales
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('admin', 'admin-campus')
        )
    );

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Mostrar resumen de cambios
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada:';
    RAISE NOTICE '   - Tabla grading_scales creada';
    RAISE NOTICE '   - Campo year agregado a subjects';
    RAISE NOTICE '   - Tipos de grado Paraguay documentados';
    RAISE NOTICE '   - Función convert_percentage_to_grade creada';
    RAISE NOTICE '   - RLS policies configuradas';
END $$;
