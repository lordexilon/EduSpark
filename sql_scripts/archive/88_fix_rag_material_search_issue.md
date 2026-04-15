# Diagnóstico y Solución: Tutor Virtual no encuentra material "Manual de atención Neonatal"

## Problema Identificado

El tutor virtual no está relacionando el contenido con el RAG para el material "Manual de atención Neonatal", aunque:
- ✅ El material existe y tiene `rag_status = 'completed'`
- ✅ Los chunks existen y contienen contenido relevante (páginas 301-360, 421-480, 481-506)
- ✅ Los chunks tienen el `course_id` correcto (12)
- ✅ Los chunks tienen el `material_id` correcto en metadata

## Posibles Causas

1. **Función RPC no existe o no funciona**: La función `search_course_content_chunks_text_clean` puede no existir o tener problemas
2. **Material asociado a sesión**: El material puede estar asociado a una sesión, y la búsqueda RAG puede no estar considerando materiales de sesiones correctamente
3. **Metadata incompleto**: Los chunks pueden no tener `sourceFileName` en metadata (aunque esto no debería impedir la búsqueda)

## Solución

### Paso 1: Verificar función RPC

Ejecuta el script `87_verify_rag_search_functionality.sql` para verificar:
- Si la función RPC existe
- Si la función funciona correctamente
- Si los chunks tienen el course_id correcto

### Paso 2: Verificar material asociado a sesión

Si el material está asociado a una sesión, verifica:
- Si los chunks tienen `sessionId` en metadata
- Si la búsqueda RAG está considerando materiales de sesiones

### Paso 3: Probar búsqueda directa

Prueba la función RPC directamente:
```sql
SELECT * FROM public.search_course_content_chunks_text_clean(
  search_query => 'neonatal',
  course_id_param => 12,
  result_limit => 5,
  min_relevance => 0.01
);
```

### Paso 4: Verificar logs del navegador

Abre la consola del navegador (F12) cuando uses el tutor virtual y busca:
- `RAGService - Contenido relevante encontrado`
- `RAGService - Error en búsqueda`
- `RAGService - Función RPC no encontrada`

Estos logs te dirán exactamente qué está pasando.

## Scripts de Diagnóstico

1. `84_diagnose_rag_materials.sql` - Diagnóstico general de materiales RAG
2. `85_verify_neonatal_material_rag.sql` - Verificación específica del material "Neonatal"
3. `86_fix_chunk_metadata_and_verify_material.sql` - Verificación del material específico
4. `87_verify_rag_search_functionality.sql` - Verificación de la función RPC y búsqueda

## Próximos Pasos

1. Ejecuta `87_verify_rag_search_functionality.sql` y comparte los resultados
2. Verifica los logs de la consola del navegador cuando uses el tutor virtual
3. Si la función RPC no existe, necesitaremos crearla o usar una alternativa
4. Si el material está asociado a una sesión, puede que necesitemos ajustar la búsqueda RAG

