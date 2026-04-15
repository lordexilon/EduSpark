# Plan de Verificación y Reprocesamiento de Materiales

**Fecha:** 2025-12-07  
**Objetivo:** Identificar y reprocesar materiales sin metadata de páginas para habilitar referencias bibliográficas precisas en el Tutor IA.

---

## 📋 **FASE 1: DIAGNÓSTICO**

### 1.1 Ejecutar Reporte SQL
**Archivo:** `sql_scripts/reporte_materiales_sin_paginas.sql`

**Qué hace:**
1. **Resumen General:** Cuántos materiales por curso necesitan reprocesamiento
2. **Listado Detallado:** Todos los materiales sin páginas, con:
   - ID del material
   - Título
   - Curso al que pertenece
   - Cantidad de chunks procesados
   - Cuántos tienen/no tienen páginas
3. **Detalle CONAREM:** Específico para course_id = 12
4. **Ejemplos:** Muestra de chunks sin metadata

**Acción:**
```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: sql_scripts/reporte_materiales_sin_paginas.sql
```

---

## 📊 **FASE 2: ANÁLISIS DE RESULTADOS**

### 2.1 Criterios de Priorización
**ALTA PRIORIDAD (reprocesar primero):**
- ✅ Libros de texto principales (ej: Harrison, Farreras, Williams)
- ✅ Materiales con >100 chunks (documentos extensos)
- ✅ Materiales del curso CONAREM INTENSIVO 2026 (course_id = 12)
- ✅ PDFs con fecha de creación antigua (procesados antes de Nov 2025)

**BAJA PRIORIDAD (opcional):**
- ⚠️ Documentos con <10 chunks (presentaciones, resúmenes)
- ⚠️ Materiales de cursos inactivos
- ⚠️ Duplicados

### 2.2 Crear Lista de Reprocesamiento
**Resultado esperado del SQL:**
```
| material_id | title                          | chunks | sin_pagina | prioridad |
|-------------|--------------------------------|--------|------------|-----------|
| 6a695969... | Harrison Tomo 1                | 512    | 512 (100%) | ALTA      |
| 79882510... | Harrison Tomo 2                | 503    | 503 (100%) | ALTA      |
| ...         | ...                            | ...    | ...        | ...       |
```

---

## 🔧 **FASE 3: REPROCESAMIENTO**

### 3.1 Método Manual (UI)
**Para 1-5 materiales:**

1. Ir a `/teacher/materials`
2. Buscar material por nombre
3. Click botón **"Procesar RAG"**
4. Esperar confirmación (1-10 min según tamaño)
5. Verificar en SQL que ahora tiene `pageStart`/`pageEnd`

**Tiempo estimado:**
- PDF <50 páginas: 1-2 minutos
- PDF 100-500 páginas: 3-5 minutos  
- PDF >500 páginas (Harrison): 8-10 minutos

### 3.2 Método Batch (Programático)
**Para >10 materiales (futuro):**

Crear endpoint en backend:
```typescript
// services/ragBatchProcessor.ts
async reprocessMaterialsBatch(materialIds: string[]) {
  for (const id of materialIds) {
    await processMaterialForRAG(id, courseId);
    await sleep(2000); // evitar sobrecarga
  }
}
```

---

## ✅ **FASE 4: VERIFICACIÓN POST-REPROCESAMIENTO**

### 4.1 Script de Verificación
```sql
-- Verificar material específico después de reprocesar
SELECT 
    m.title,
    COUNT(ccc.id) as total_chunks,
    COUNT(CASE WHEN ccc.metadata->>'pageStart' IS NOT NULL THEN 1 END) as con_pagina,
    MIN(ccc.metadata->>'pageStart') as primera_pagina,
    MAX(ccc.metadata->>'pageEnd') as ultima_pagina
FROM materials m
JOIN course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text
WHERE m.id = 'MATERIAL_ID_AQUI'
GROUP BY m.title;
```

### 4.2 Prueba del Tutor IA
1. Ir al chat del tutor
2. Preguntar: "¿Qué dice Harrison sobre hipertensión?"
3. **Verificar que la respuesta incluya:**
   - ✅ Contenido relevante
   - ✅ **"Ver páginas X-Y"** o **"Capítulo Z"**

---

## 📈 **MÉTRICAS DE ÉXITO**

### KPIs a Monitorear:
- ✅ % de materiales con metadata completa: **>90%**
- ✅ Tiempo promedio de reprocesamiento: **<5 min**
- ✅ Respuestas del tutor con referencias: **100%** (para materiales reprocesados)
- ✅ Errores de procesamiento: **<5%**

---

## 🚨 **TROUBLESHOOTING**

### Error: "Job atascado en Processing"
```sql
-- Cancelar job manualmente
UPDATE file_processing_jobs
SET status = 'failed',
    error_message = 'Cancelado para reprocesar',
    updated_at = NOW()
WHERE material_id = 'MATERIAL_ID';
```

### Error: "Token de Google Drive expirado"
1. Ir a `/profile`
2. Desconectar Google Drive
3. Reconectar
4. Reintentar procesamiento

### Error: "Timeout en cloud function"
**Causa:** PDF muy grande (>200 páginas)
**Solución:**
- Dividir PDF en tomos/secciones
- O aumentar timeout de Cloud Function a 9 min (ya configurado)

---

## 📝 **CHECKLIST DE EJECUCIÓN**

- [ ] 1. Ejecutar `reporte_materiales_sin_paginas.sql`
- [ ] 2. Exportar resultados a CSV/Excel
- [ ] 3. Clasificar por prioridad (ALTA/MEDIA/BAJA)
- [ ] 4. Reprocesar materiales ALTA prioridad (Harrison, etc.)
- [ ] 5. Verificar con script de verificación
- [ ] 6. Probar en Tutor IA que devuelve páginas
- [ ] 7. Documentar materiales reprocesados (fecha, usuario)
- [ ] 8. Repetir para prioridad MEDIA
- [ ] 9. Monitorear errores en Cloud Function logs
- [ ] 10. Actualizar este documento con resultados

---

## 🎯 **PRÓXIMOS PASOS RECOMENDADOS**

1. **HOY:** Ejecutar reporte y reprocesar Harrison (2 tomos)
2. **Esta semana:** Reprocesar top 10 materiales más usados
3. **Futuro:** Implementar sistema de batch processing automático
4. **Mejora:** Añadir columna `needs_reprocessing` en tabla `materials`

---

## 📚 **DOCUMENTACIÓN RELACIONADA**

- `AI_CONTEXT/04_FEATURES/RAG_WORKER_SISTEMA_VECTORIZACION.md`
- `sql_scripts/reporte_materiales_sin_paginas.sql`
- `sql_scripts/verify_harrison_chunks.sql`

---

**Status:** 📋 Plan listo para ejecución  
**Owner:** Usuario  
**Última actualización:** 2025-12-07
