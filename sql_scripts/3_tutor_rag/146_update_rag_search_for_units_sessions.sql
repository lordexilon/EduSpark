-- Script 146: Actualizar Búsqueda RAG para respetar Unidades y Sesiones y Trigger de Autollenado
-- =========================================================================================

-- 1. Trigger para auto-completar unit_id y session_id en chunks subidos desde Desktop
CREATE OR REPLACE FUNCTION tf_set_chunk_unit_session_from_material()
RETURNS TRIGGER AS $$
DECLARE
  material_uuid UUID;
  mat_unit_id UUID;
  mat_session_id UUID;
BEGIN
  -- Verificar si el chunk tiene material_id en el metadata pero le faltan unidad/sesión nativas en las columnas
  IF NEW.metadata ? 'material_id' AND (NEW.unit_id IS NULL OR NEW.session_id IS NULL) THEN
    BEGIN
      material_uuid := (NEW.metadata->>'material_id')::UUID;
      
      SELECT unit_id, session_id INTO mat_unit_id, mat_session_id
      FROM materials
      WHERE id = material_uuid;
      
      IF mat_unit_id IS NOT NULL THEN
        NEW.unit_id := mat_unit_id;
      END IF;
      
      IF mat_session_id IS NOT NULL THEN
        NEW.session_id := mat_session_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Si ocurre un error al convertir el UUID o buscar, ignoramos silenciosamente
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger en la tabla de chunks
DROP TRIGGER IF EXISTS tr_set_chunk_unit_session ON course_content_chunks;
CREATE TRIGGER tr_set_chunk_unit_session
BEFORE INSERT OR UPDATE ON course_content_chunks
FOR EACH ROW
EXECUTE FUNCTION tf_set_chunk_unit_session_from_material();


-- 2. Backfill (Actualizar chunks históricos que no tienen unidad/sesión pero tienen material_id)
-- ADVERTENCIA: Esta actualización suele dar error de "Failed to fetch" o "Timeout" en 
-- Supabase Studio si hay más de 50,000 chunks debido a la falta de índices en metadata.
-- Por favor, omite ejecutar este bloque por ahora o ejecútalo mediante la API del backend.
/*
DO $$
BEGIN
  UPDATE course_content_chunks c
  SET 
    unit_id = m.unit_id,
    session_id = m.session_id
  FROM materials m
  WHERE c.metadata->>'material_id' IS NOT NULL 
    AND m.id::text = (c.metadata->>'material_id')
    AND (c.unit_id IS NULL OR c.session_id IS NULL);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error o Timeout actualizando chunks historicos. Ignorando...';
END $$;
*/


-- 3. Nueva firma Vectorial: search_course_content_chunks con p_module_id
-- Eliminar firmas antiguas para no generar conflictos de compatibilidad u overload.
DROP FUNCTION IF EXISTS public.search_course_content_chunks(vector(768), float, int, text) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks(vector(768), double precision, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks(vector(768), double precision, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks(vector(512), double precision, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks(text, double precision, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks(text, double precision, integer, integer) CASCADE;

CREATE OR REPLACE FUNCTION search_course_content_chunks(
  query_embedding text, -- Lo recibimos como texto para mayor compatibilidad de casteo
  match_threshold double precision,
  match_count integer,
  course_id_param integer,
  p_module_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_query vector(512); -- Gemini 2 usa vectores 512
BEGIN
  v_query := query_embedding::vector(512);
  
  RETURN QUERY
  SELECT
    c.id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> v_query) as similarity
  FROM course_content_chunks c
  WHERE 1 - (c.embedding <=> v_query) > match_threshold
  AND c.course_id = course_id_param
  AND (
    p_module_id IS NULL OR 
    c.unit_id = p_module_id OR 
    c.session_id = p_module_id OR
    (c.unit_id IS NULL AND c.session_id IS NULL) -- Materiales de referencia global (ej: Harrison)
  )
  ORDER BY c.embedding <=> v_query ASC
  LIMIT match_count;
END;
$$;


-- 4. Nueva firma Full-Text/Clean: search_course_content_chunks_text_clean con p_module_id
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer, double precision) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer) CASCADE;

CREATE OR REPLACE FUNCTION public.search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 30,
  min_relevance DOUBLE PRECISION DEFAULT 0.001,
  p_module_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  course_id integer,
  content text,
  embedding vector(512),
  metadata jsonb,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ccc.id,
    ccc.course_id,
    ccc.content,
    ccc.embedding,
    ccc.metadata,
    ccc.created_at
  FROM course_content_chunks ccc
  WHERE ccc.course_id = course_id_param
  AND (
    search_query IS NULL OR 
    search_query = '' OR 
    ccc.content ILIKE '%' || search_query || '%' OR 
    (ccc.metadata->>'title') ILIKE '%' || search_query || '%'
  )
  AND (
    p_module_id IS NULL OR 
    ccc.unit_id = p_module_id OR 
    ccc.session_id = p_module_id OR
    (ccc.unit_id IS NULL AND ccc.session_id IS NULL) -- Materiales de referencia global (ej: Harrison)
  )
  ORDER BY 
    CASE 
      WHEN (ccc.metadata->>'title') ILIKE '%' || search_query || '%' THEN 1
      WHEN ccc.content ILIKE '%' || search_query || '%' THEN 2
      ELSE 3 
    END ASC,
    ccc.created_at DESC
  LIMIT result_limit * 2; 
END;
$$;
