-- Script para asegurar que course_materials existe y tiene datos
-- Ejecutar en Supabase SQL Editor

-- Verificar si la tabla existe
DO $$
BEGIN
    -- Crear tabla si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_materials') THEN
        CREATE TABLE course_materials (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            type VARCHAR(50) DEFAULT 'material',
            difficulty VARCHAR(20) DEFAULT 'intermediate',
            order_index INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Crear índices
        CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON course_materials(course_id);
        CREATE INDEX IF NOT EXISTS idx_course_materials_type ON course_materials(type);
        CREATE INDEX IF NOT EXISTS idx_course_materials_difficulty ON course_materials(difficulty);
        CREATE INDEX IF NOT EXISTS idx_course_materials_active ON course_materials(is_active);
        
        -- Habilitar RLS
        ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
        
        -- Crear políticas RLS solo si no existen
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'course_materials' AND policyname = 'Students can view course materials') THEN
            CREATE POLICY "Students can view course materials" ON course_materials
                FOR SELECT USING (is_active = true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'course_materials' AND policyname = 'Teachers can manage course materials') THEN
            CREATE POLICY "Teachers can manage course materials" ON course_materials
                FOR ALL USING (
                    course_id IN (
                        SELECT id FROM courses WHERE teacher_id = auth.uid()
                    )
                );
        END IF;
        
        RAISE NOTICE 'Tabla course_materials creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla course_materials ya existe';
    END IF;
END $$;

-- Agregar materiales de ejemplo para todos los cursos
INSERT INTO course_materials (course_id, title, content, type, difficulty, order_index)
SELECT 
    c.id as course_id,
    'Introducción a ' || c.title as title,
    'Este es el material de introducción para el curso ' || c.title || '. Aquí encontrarás los conceptos básicos y fundamentales que necesitas conocer.' as content,
    'chapter' as type,
    'beginner' as difficulty,
    1 as order_index
FROM courses c
WHERE NOT EXISTS (
    SELECT 1 FROM course_materials cm 
    WHERE cm.course_id = c.id AND cm.title = 'Introducción a ' || c.title
);

INSERT INTO course_materials (course_id, title, content, type, difficulty, order_index)
SELECT 
    c.id as course_id,
    'Conceptos Avanzados' as title,
    'En esta sección exploraremos conceptos más avanzados del tema, incluyendo ejemplos prácticos y ejercicios.' as content,
    'lesson' as type,
    'intermediate' as difficulty,
    2 as order_index
FROM courses c
WHERE NOT EXISTS (
    SELECT 1 FROM course_materials cm 
    WHERE cm.course_id = c.id AND cm.title = 'Conceptos Avanzados'
);

INSERT INTO course_materials (course_id, title, content, type, difficulty, order_index)
SELECT 
    c.id as course_id,
    'Ejercicios Prácticos' as title,
    'Aquí tienes una serie de ejercicios para practicar lo que has aprendido. Incluye problemas resueltos y ejercicios para resolver.' as content,
    'exercise' as type,
    'advanced' as difficulty,
    3 as order_index
FROM courses c
WHERE NOT EXISTS (
    SELECT 1 FROM course_materials cm 
    WHERE cm.course_id = c.id AND cm.title = 'Ejercicios Prácticos'
);

-- Verificar resultado
SELECT 'course_materials' as tabla, COUNT(*) as registros FROM course_materials;

-- Mostrar materiales por curso
SELECT 
    c.title as curso,
    cm.title as material,
    cm.type as tipo,
    cm.difficulty as dificultad
FROM course_materials cm
JOIN courses c ON c.id = cm.course_id
ORDER BY c.title, cm.order_index;
