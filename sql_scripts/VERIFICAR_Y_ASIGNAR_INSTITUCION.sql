-- =====================================================
-- PASO 1: Verificar información del usuario actual
-- =====================================================
-- Ejecutar esto EN SUPABASE SQL EDITOR mientras estás logueado como admin-campus

SELECT 
  auth.uid() as mi_user_id,
  u.email as mi_email,
  u.first_name || ' ' || u.last_name as mi_nombre,
  r.name as mi_rol,
  ui.institution_id as tengo_institucion_id,
  i.name as nombre_mi_institucion,
  CASE 
    WHEN ui.institution_id IS NULL THEN '❌ NO TIENE INSTITUCIÓN ASIGNADA - ESTE ES EL PROBLEMA'
    ELSE '✅ Tiene institución asignada'
  END as diagnostico
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
LEFT JOIN public.institutions i ON i.id = ui.institution_id
WHERE u.id = auth.uid();

-- =====================================================
-- PASO 2: Ver todas las instituciones disponibles
-- =====================================================

SELECT 
  id,
  name,
  (SELECT COUNT(*) FROM user_institutions WHERE institution_id = institutions.id) as usuarios_count
FROM public.institutions
ORDER BY name;

-- =====================================================
-- PASO 3: Ver cuántos usuarios ve actualmente (con RLS)
-- =====================================================

SELECT 
  COUNT(*) as total_usuarios_que_veo,
  STRING_AGG(DISTINCT COALESCE(i.name, 'Sin institución'), ', ') as instituciones_que_veo
FROM public.users u
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
LEFT JOIN public.institutions i ON i.id = ui.institution_id;

-- =====================================================
-- PASO 4: SOLUCIÓN - Asignar institución al usuario
-- =====================================================
-- IMPORTANTE: Ejecuta esto SOLO si el PASO 1 mostró que NO tienes institución

-- Primero, copia tu user_id del resultado del PASO 1
-- Luego, elige el institution_id del resultado del PASO 2

-- REEMPLAZA ESTOS VALORES:
-- 'TU_USER_ID_AQUI' -> Copia el valor de 'mi_user_id' del PASO 1
-- TU_INSTITUTION_ID_AQUI -> Elige el 'id' de la institución del PASO 2

/*
INSERT INTO public.user_institutions (user_id, institution_id, is_primary, joined_at)
VALUES ('TU_USER_ID_AQUI', TU_INSTITUTION_ID_AQUI, true, NOW())
ON CONFLICT (user_id, institution_id) 
DO UPDATE SET is_primary = true;
*/

-- =====================================================
-- PASO 5: Verificar que funcionó
-- =====================================================
-- Ejecuta esto DESPUÉS de asignar la institución en el PASO 4

/*
-- Verificar mi institución nuevamente
SELECT 
  auth.uid() as mi_user_id,
  public.get_user_institution_id() as mi_institucion_id,
  i.name as nombre_institucion
FROM public.institutions i
WHERE i.id = public.get_user_institution_id();

-- Contar usuarios que puedo ver ahora
SELECT 
  COUNT(*) as usuarios_de_mi_institucion
FROM public.users u
JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
WHERE ui.institution_id = public.get_user_institution_id();
*/
