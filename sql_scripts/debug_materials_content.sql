-- Script de diagnóstico para materiales y chunks
-- Ejecutar en Supabase SQL Editor

-- 1. Buscar el libro Harrison específicamente
SELECT id, title, created_at, metadata 
FROM materials 
WHERE title ILIKE '%Harrison%';

-- 2. Contar cuántos "chunks" (fragmentos de texto) tiene CADA material
-- Esto nos dirá si el libro fue procesado correctamente por el AI
SELECT 
    m.title, 
    COUNT(ccc.id) as cantidad_chunks
FROM materials m
LEFT JOIN course_content_chunks ccc ON m.id::text = ccc.metadata->>'material_id'
GROUP BY m.id, m.title
ORDER BY cantidad_chunks DESC
LIMIT 20;

-- 3. Ver una muestra del contenido de los chunks de Harrison (si existen)
SELECT substring(content from 1 for 200) as inicio_texto
FROM course_content_chunks
WHERE metadata->>'material_title' ILIKE '%Harrison%'
LIMIT 3;
