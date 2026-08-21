## Reporte de Evaluacion RAG: Sistema EduSpark-AI

**Fecha:** 2026-03-26  
**Estatus:** Estabilizacion de Recuperacion (impasse identificado)

### 1) Diagnostico del impasse

Se identifico "amnesia de contenido" por concurrencia de tres factores:

1. **Desajuste de IDs**  
   Los chunks de Harrison/Nelson estaban en `course_id = 1` mientras el Tutor consultaba `course_id = 12` (CONAREM 2026).
2. **Restriccion SQL por unidades**  
   La RPC `search_course_content_chunks` excluia materiales globales con `unit_id` o `session_id` en `NULL`.
3. **Contaminacion de busqueda semantica**  
   `RAGAgent.ts` enviaba el prompt de personalidad como query vectorial, en vez de la pregunta clinica limpia.

### 2) Acciones realizadas (fixes)

#### A. Capa de datos (Supabase)

- **Unificacion de datos:** update masivo de chunks medicos de `course_id = 1` a `course_id = 12`.
- **Limpieza de RPCs:** eliminacion de overloads conflictivos y recreacion con parametros por defecto.
- **Blindaje de seguridad:** funciones con `SECURITY DEFINER` y `SET search_path = public`.
- **Apertura global:** ajuste de filtros para permitir recuperacion de materiales globales (`unit_id/session_id = NULL`).

#### B. Capa de orquestacion (Frontend)

- **Prompt purging:** correccion en `RAGAgent.ts` para enviar solo la pregunta limpia al RAG.
- **Trazabilidad:** insercion del log `📊 [RAG_AUDIT]` en `ragService.ts`.
- **Bypass de cache:** deshabilitacion temporal de `responseCache` y detector de `metaQuery` para pruebas diagnosticas.

### 3) Estado actual y hoja de ruta

| Item | Estado | Proximo paso |
|------|--------|--------------|
| Recuperacion tecnica | OK | Verificar `vectorCount > 0` en consola |
| Citacion de paginas | En proceso | Confirmado `pageStart: 65`; validar que el Tutor cite |
| Error 500 en RPC | Resuelto | Mantener firmas estables en PostgREST |
| Busqueda hibrida | Ajustando | Calibrar balance keyword vs embeddings |

### 4) Instrucciones para prueba final

1. Refrescar EduSpark (`F5`).
2. Preguntar: **"Explicame la Afasia segun el material del curso"**.
3. Resultado esperado:
   - menciona Harrison o Nelson,
   - muestra citas bibliograficas,
   - evidencia recuperacion real (incluyendo componente vectorial en auditoria).

### 5) Criterios de cierre del impasse

Se considera cerrado cuando:

- en consola se observe recuperacion estable con `vectorCount > 0`,
- el Tutor cite fuentes y paginas de forma consistente,
- no reaparezca error 500 en RPC durante consultas medicas normales.

---

### 6) Documentacion ampliada (agentes A2A y orquestacion)

Para el detalle de **cambios posteriores** al impasse (extraccion multi-parte Gemini, fallback textual, propagacion `sourceMetadata`, UI de materiales/paginas, efectos React en `TutorVirtualPage`, scripts 178, etc.) ver:

- **`AI_CONTEXT/04_FEATURES/TUTOR_A2A_AGENTES_DOCUMENTACION_2026-03-26.md`**

Ese documento es la referencia operativa del flujo A2A del tutor y el **porque** de cada modificacion en capa de agentes y RAG.

---

Documento consolidado para auditoria interna SCA.
