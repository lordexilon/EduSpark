-- 105_update_flashcards_rls_for_coordinators.sql
-- Actualizar políticas RLS para permitir que coordinadores y administradores
-- puedan visualizar y gestionar todas las flashcards
-- Fecha: Enero 2025

-- =====================================================
-- FUNCIONES HELPER (si no existen)
-- =====================================================

-- Función para verificar si es admin o coordinator
CREATE OR REPLACE FUNCTION public.is_admin_or_coordinator()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
  );
$$;

-- =====================================================
-- ACTUALIZAR POLÍTICAS RLS PARA FLASHCARDS
-- =====================================================

-- Eliminar políticas existentes que necesitamos actualizar
DROP POLICY IF EXISTS "Admins can view all flashcards" ON flashcards;
DROP POLICY IF EXISTS "Admins can view all flashcard progress" ON flashcard_progress;

-- Política para que admins y coordinadores puedan ver TODAS las flashcards
CREATE POLICY "Admins and coordinators can view all flashcards"
    ON flashcards FOR SELECT
    USING (public.is_admin_or_coordinator());

-- Política para que admins y coordinadores puedan INSERTAR flashcards en cualquier curso
CREATE POLICY "Admins and coordinators can insert flashcards"
    ON flashcards FOR INSERT
    WITH CHECK (public.is_admin_or_coordinator());

-- Política para que admins y coordinadores puedan ACTUALIZAR cualquier flashcard
CREATE POLICY "Admins and coordinators can update flashcards"
    ON flashcards FOR UPDATE
    USING (public.is_admin_or_coordinator())
    WITH CHECK (public.is_admin_or_coordinator());

-- Política para que admins y coordinadores puedan ELIMINAR cualquier flashcard
CREATE POLICY "Admins and coordinators can delete flashcards"
    ON flashcards FOR DELETE
    USING (public.is_admin_or_coordinator());

-- =====================================================
-- ACTUALIZAR POLÍTICAS RLS PARA FLASHCARD_PROGRESS
-- =====================================================

-- Política para que admins y coordinadores puedan ver TODO el progreso
CREATE POLICY "Admins and coordinators can view all flashcard progress"
    ON flashcard_progress FOR SELECT
    USING (public.is_admin_or_coordinator());

-- Política para que admins y coordinadores puedan INSERTAR progreso (útil para ajustes)
CREATE POLICY "Admins and coordinators can insert flashcard progress"
    ON flashcard_progress FOR INSERT
    WITH CHECK (public.is_admin_or_coordinator());

-- Política para que admins y coordinadores puedan ACTUALIZAR progreso
CREATE POLICY "Admins and coordinators can update flashcard progress"
    ON flashcard_progress FOR UPDATE
    USING (public.is_admin_or_coordinator())
    WITH CHECK (public.is_admin_or_coordinator());

-- Política para que admins y coordinadores puedan ELIMINAR progreso
CREATE POLICY "Admins and coordinators can delete flashcard progress"
    ON flashcard_progress FOR DELETE
    USING (public.is_admin_or_coordinator());

-- =====================================================
-- MEJORAR POLÍTICAS PARA DOCENTES
-- =====================================================

-- Asegurar que los docentes puedan ver TODAS las flashcards de sus cursos
-- (no solo las que crearon ellos)
-- Esta política ya existe, pero la mantenemos para claridad
-- "Teachers can view flashcards in their courses" ya cubre esto

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que las políticas existen
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Lectura'
    WHEN cmd = 'INSERT' THEN 'Inserción'
    WHEN cmd = 'UPDATE' THEN 'Actualización'
    WHEN cmd = 'DELETE' THEN 'Eliminación'
    WHEN cmd = 'ALL' THEN 'Todas las operaciones'
    ELSE cmd
  END as operacion
FROM pg_policies
WHERE tablename IN ('flashcards', 'flashcard_progress')
  AND schemaname = 'public'
  AND (policyname LIKE '%admin%' OR policyname LIKE '%coordinator%' OR policyname LIKE '%teacher%')
ORDER BY tablename, policyname;

-- =====================================================
-- RESUMEN DE PERMISOS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS actualizadas para flashcards';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PERMISOS CONFIGURADOS:';
  RAISE NOTICE '';
  RAISE NOTICE '👨‍💼 ADMINISTRADORES Y COORDINADORES:';
  RAISE NOTICE '   ✅ Pueden VER todas las flashcards';
  RAISE NOTICE '   ✅ Pueden CREAR flashcards en cualquier curso';
  RAISE NOTICE '   ✅ Pueden EDITAR cualquier flashcard';
  RAISE NOTICE '   ✅ Pueden ELIMINAR cualquier flashcard';
  RAISE NOTICE '   ✅ Pueden VER todo el progreso de estudiantes';
  RAISE NOTICE '   ✅ Pueden GESTIONAR el progreso de estudiantes';
  RAISE NOTICE '';
  RAISE NOTICE '👨‍🏫 DOCENTES:';
  RAISE NOTICE '   ✅ Pueden VER todas las flashcards de sus cursos';
  RAISE NOTICE '   ✅ Pueden CREAR flashcards en sus cursos';
  RAISE NOTICE '   ✅ Pueden EDITAR flashcards que crearon';
  RAISE NOTICE '   ✅ Pueden VER el progreso de sus estudiantes';
  RAISE NOTICE '';
  RAISE NOTICE '👨‍🎓 ESTUDIANTES:';
  RAISE NOTICE '   ✅ Pueden VER flashcards de cursos en los que están inscritos';
  RAISE NOTICE '   ✅ Pueden GESTIONAR su propio progreso';
END $$;

