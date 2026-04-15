-- 165_fix_storage_policies.sql
-- Corregir políticas de almacenamiento para course-documents
-- Permitir que usuarios autenticados (profesores) suban archivos

-- Asegurarse de que el bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-documents', 'course-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Delete" ON storage.objects;
DROP POLICY IF EXISTS "Give me access to own folder 1oj01k_0" ON storage.objects;
DROP POLICY IF EXISTS "Give me access to own folder 1oj01k_1" ON storage.objects;
DROP POLICY IF EXISTS "Give me access to own folder 1oj01k_2" ON storage.objects;
DROP POLICY IF EXISTS "Give me access to own folder 1oj01k_3" ON storage.objects;

-- 1. Política de Lectura Pública (para que el frontend pueda descargar/ver)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'course-documents' );

-- 2. Política de Inserción para Usuarios Autenticados
-- Permitir a cualquier usuario autenticado subir archivos a este bucket
-- (Podríamos restringir más, pero por ahora necesitamos que funcione la migración)
CREATE POLICY "Authenticated Users Insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-documents' 
  AND auth.role() = 'authenticated'
);

-- 3. Política de Actualización (opcional, por si necesitan sobrescribir)
CREATE POLICY "Authenticated Users Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-documents' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] != 'private' -- Ejemplo de restricción
);

-- 4. Política de Eliminación (solo el dueño o admin)
CREATE POLICY "Authenticated Users Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-documents' 
  AND auth.role() = 'authenticated'
  AND (owner = auth.uid() OR public.is_admin())
);

-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
