-- sql_scripts/storage_policies_institutions.sql
-- Políticas RLS para Supabase Storage - Logos de Instituciones
-- Ejecutar en el SQL Editor de Supabase

-- IMPORTANTE: Las políticas de Storage se crean en el esquema 'storage', no en 'public'

-- 1. Eliminar políticas existentes si existen (para evitar duplicados)
DROP POLICY IF EXISTS "Permitir lectura pública de logos de instituciones" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida de logos de instituciones para admins" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de logos de instituciones" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de logos de instituciones" ON storage.objects;

-- 2. Política para SELECT (leer/descargar archivos) en la carpeta institutions/
-- Permitir a todos los usuarios autenticados ver los logos (público)
CREATE POLICY "Permitir lectura pública de logos de instituciones"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-media' AND
  (storage.foldername(name))[1] = 'institutions'
);

-- 3. Política para INSERT (subir archivos) en la carpeta institutions/
-- Permitir a admins y coordinators subir logos de instituciones
CREATE POLICY "Permitir subida de logos de instituciones para admins"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-media' AND
  (storage.foldername(name))[1] = 'institutions' AND
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
  )
);

-- 4. Política para UPDATE (actualizar archivos) en la carpeta institutions/
-- Permitir a admins y coordinators actualizar logos
CREATE POLICY "Permitir actualización de logos de instituciones"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-media' AND
  (storage.foldername(name))[1] = 'institutions' AND
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
  )
)
WITH CHECK (
  bucket_id = 'course-media' AND
  (storage.foldername(name))[1] = 'institutions' AND
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
  )
);

-- 5. Política para DELETE (eliminar archivos) en la carpeta institutions/
-- Permitir a admins y coordinators eliminar logos
CREATE POLICY "Permitir eliminación de logos de instituciones"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-media' AND
  (storage.foldername(name))[1] = 'institutions' AND
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
  )
);

-- 6. Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (policyname LIKE '%instituci%' OR policyname LIKE '%logo%')
ORDER BY policyname;

