-- 98_setup_course_documents_bucket.sql
-- Crea el bucket para documentos (PDF, Excel, Word, etc.) y sus políticas RLS

-- Crear el bucket si no existe
insert into storage.buckets (id, name, public)
values ('course-documents', 'course-documents', false)
on conflict (id) do nothing;

-- Permitir a usuarios autenticados subir archivos al bucket course-documents
create policy if not exists "teachers can upload course documents"
on storage.objects
for insert
with check (
  bucket_id = 'course-documents'
  and auth.role() = 'authenticated'
  and position('courses/' in name) = 1
);

-- Permitir a usuarios autenticados eliminar archivos del bucket
create policy if not exists "teachers can delete course documents"
on storage.objects
for delete
using (
  bucket_id = 'course-documents'
  and auth.role() = 'authenticated'
  and position('courses/' in name) = 1
);

-- Permitir a usuarios autenticados actualizar archivos del bucket
create policy if not exists "teachers can update course documents"
on storage.objects
for update
using (
  bucket_id = 'course-documents'
  and auth.role() = 'authenticated'
  and position('courses/' in name) = 1
)
with check (
  bucket_id = 'course-documents'
  and auth.role() = 'authenticated'
  and position('courses/' in name) = 1
);

-- (Opcional) Permitir lectura pública de los documentos
-- Si quieres que solo usuarios autenticados vean los archivos, cambia auth.role() por 'authenticated'
create policy if not exists "public can read course documents"
on storage.objects
for select
using (bucket_id = 'course-documents');

