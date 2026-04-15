# Tutor virtual: arquitectura A2A y cambios recientes (marzo 2026)

**Fecha:** 2026-03-26  
**Alcance:** Sistema multi-agente del tutor (patrón Agent-to-Agent, A2A), servicio RAG directo, coordinación y UI.  
**Relacionado:** `REPORTE_EVALUACION_RAG_2026-03-26.md` (diagnóstico del impasse RAG previo: curso_id, RPCs, query vectorial).

---

## 1. Qué es el flujo A2A en EduSpark

En este proyecto, “A2A” no es un protocolo externo: es la **orquestación local** donde un **AgentCoordinator** delega en agentes especializados:

| Agente / componente | Rol |
|---------------------|-----|
| **ContextAgent** | Conversación activa, persistencia en memoria/Supabase, ventana de contexto para el RAG. |
| **RAGAgent** | Arma personalización pedagógica y llama a **RAGService** con la **pregunta limpia** del estudiante (no el mega-prompt de personalidad como query de búsqueda). |
| **RAGService** | Recuperación híbrida (texto + vector), construcción del prompt con chunks, llamada a **Gemini** (`generateContent`), formateo de respuesta y metadata (`sources`, `sourceMetadata`, `retrievalAudit`). |
| **VoiceAgent** | Reconocimiento y síntesis de voz cuando está habilitado; el coordinador no bloquea la respuesta de texto esperando el audio. |
| **AgentCoordinator** | Recibe el input del usuario, llama al RAG, aplica `applyStudentProfile` al texto, emite eventos, arma el `AgentResponse` para la UI. |

**Por qué importa documentarlo:** Los fallos visibles (timeout SQL, respuestas cortadas, fuentes genéricas) suelen cruzar **varias capas** (BD, `ragService`, coordinador, hook React). Sin este mapa es fácil “arreglar” solo el síntoma en la UI.

---

## 2. Flujo de un mensaje de texto (resumen)

1. `TutorVirtualPage` → `useAgentSystem.sendMessage` → `coordinator.handleUserInput(text)`.
2. **ContextAgent** guarda el mensaje del usuario y obtiene contexto reciente.
3. **AgentCoordinator** construye `conversationContext` (studentId, courseId, moduleId, pedagogical, profile, mensajes).
4. **RAGAgent.query** enriquece con pedagogía pero **RAGService** usa la pregunta clínica para búsqueda y prompt principal.
5. **RAGService** ejecuta búsqueda textual (RPC o fallback) y vectorial (RPC `search_course_content_chunks`), fusiona chunks, genera respuesta con Gemini.
6. **RAGAgent.processRAGResponse** normaliza `sources` y conserva **sourceMetadata** en `ragResponse.metadata`.
7. **AgentCoordinator** aplica `applyStudentProfile` al string de respuesta, crea el mensaje del asistente con `metadata.sources` y **`metadata.sourceMetadata`**.
8. **useAgentSystem** copia esa metadata al estado React del chat.
9. **TutorVirtualPage** renderiza Markdown + bloque de materiales/páginas + desplegable Fuentes.

---

## 3. Cambios realizados y motivo (por capa)

### 3.1 RAGService (`src/modules/tutor/services/ragService.ts`)

| Cambio | Por qué |
|--------|---------|
| **Concatenar todas las `parts[].text`** de la respuesta Gemini | Solo usar `parts[0]` descartaba texto si el modelo devolvía varias partes → respuestas **entrecortadas** a mitad de frase. |
| **`maxOutputTokens` 4096** | Margen para explicaciones pedagógicas completas; reduce cortes por límite de salida. |
| **Instrucciones de prompt:** párrafos completos; citar material y página en el cuerpo; sección **Fuentes** con formato claro | Alinea la salida del modelo con lo que el estudiante necesita y con la metadata disponible en los encabezados de chunks. |
| **Tras timeout 57014 en RPC textual:** no reintentar la misma RPC con firma corta | El segundo intento repetía un plan SQL pesado y añadía latencia sin beneficio. |
| **Fallback directo:** `limit(400)`, segunda página `range(400,999)`, filtro local con **`normalizeTextForMatch`** (NFD, sin tildes) | El límite 120 y la falta de normalización producían `filtered: 0` con términos como “afasia” vs “afasía” o chunks más antiguos fuera del primer lote. |
| **`sourceMetadata` + `retrievalAudit`** en la respuesta formateada | Trazabilidad y UI: material archivo y páginas por fragmento. |

### 3.2 RAGAgent (`src/modules/tutor/agents/RAGAgent.ts`)

| Cambio | Por qué |
|--------|---------|
| **`addAuditoryElements`:** deja de reemplazar todos los `.` por `...`** | Corrupta el markdown, URLs y lectura; las pausas de TTS deben ir en el pipeline de voz, no en el texto del chat. |
| **`addReadingElements`:** sin mutación del texto | El `replace` anterior usaba mal los argumentos del callback (offset vs “índice de palabra”) y podía alterar el mensaje. |

### 3.3 AgentCoordinator (`src/modules/tutor/agents/AgentCoordinator.ts`)

| Cambio | Por qué |
|--------|---------|
| Incluir **`sourceMetadata`** en `assistantMessage.metadata` y en el **`AgentResponse.metadata`** | Antes solo viajaban `sources` (strings); la UI no podía mostrar de forma estructurada material + página sin duplicar lógica. |

### 3.4 useAgentSystem (`src/modules/tutor/hooks/useAgentSystem.ts`)

| Cambio | Por qué |
|--------|---------|
| Copiar **`sourceMetadata`** y **`contextUsed`** al `ChatMessage` del asistente (texto y voz) | Sin esto, el estado React del tutor perdía la metadata entre coordinador y pantalla. |

### 3.5 TutorVirtualPage (`src/pages/Student/TutorVirtualPage.tsx`)

| Cambio | Por qué |
|--------|---------|
| **`useEffect` de inicialización:** dependencias sin el objeto completo `agentSystem`; usar `initializeAgentSystem` estable | `useAgentSystem` devuelve un **objeto nuevo cada render**; incluirlo en el array disparaba el efecto en bucle (ruido y trabajo innecesario). |
| Bloque visible **“Información según estos materiales (páginas…)”** con deduplicación | El estudiante ve de inmediato de qué PDF/fragmento salió la respuesta cuando hay `pageStart`/`pageEnd` en metadata. |
| Desplegable **Fuentes:** soportar ítems **string** | Las fuentes del RAG son a menudo strings (`"Archivo — pág. N"`); la UI asumía objetos con `id`/`title` y fallaba visualmente. |
| Refs **`lastInitKeyRef` / `lastSyncedModuleIdRef`** (sesiones anteriores) | Evita mezclar la clave `12-no-module` con el UUID de módulo y reinicializaciones falsas. |

### 3.6 Base de datos (Supabase), referencia de scripts

| Script | Objetivo |
|--------|----------|
| `sql_scripts/5_fixes/174_hotfix_search_text_clean_rpc_500.sql` | Firma estable de `search_course_content_chunks_text_clean`; **atención:** cuerpo con `ILIKE` sobre toda la tabla puede provocar **57014** en cursos grandes. |
| `sql_scripts/5_fixes/177_hotfix_search_course_content_chunks_unificar_rpc.sql` | RPC vectorial única con `p_module_id` y embeddings 512. |
| `sql_scripts/5_fixes/178_hotfix_text_clean_bounded_cte.sql` | **Recomendado si hay timeout textual:** CTE acota filas recientes antes de `ILIKE`. |
| `sql_scripts/4_diagnostics/176_diagnostic_embedding_por_curso.sql` | Diagnóstico de chunks con/sin embedding por curso. |

El cliente **no sustituye** la necesidad de desplegar **178** en producción si la RPC textual sigue agotando tiempo.

---

## 4. Tabla de archivos tocados (checklist para revisores)

| Ruta | Tema |
|------|------|
| `src/modules/tutor/services/ragService.ts` | Híbrido RAG, Gemini, prompts, fallback textual, metadata. |
| `src/modules/tutor/agents/RAGAgent.ts` | Query RAG, `processRAGResponse`, personalización sin corromper texto. |
| `src/modules/tutor/agents/AgentCoordinator.ts` | Orquestación, metadata al mensaje y a la respuesta. |
| `src/modules/tutor/hooks/useAgentSystem.ts` | Puente coordinador ↔ estado React. |
| `src/pages/Student/TutorVirtualPage.tsx` | Inicialización, UI de fuentes y resumen de materiales. |
| `sql_scripts/5_fixes/178_hotfix_text_clean_bounded_cte.sql` | Mitigación timeout búsqueda textual. |

---

## 5. Limitaciones conocidas

- **Páginas en UI:** dependen de que los chunks tengan `pageStart` / `pageEnd` (o equivalentes en metadata) en la indexación; si el PDF se fragmentó sin página, solo se mostrará el nombre del material.
- **Caché RAG:** en código puede haber bloques comentados de caché para depuración; revisar antes de releases finales.
- **Presupuesto y límites:** políticas en BD (`check_user_query_limits`, etc.) siguen documentadas en scripts y servicios de costo del tutor.

---

## 6. Mantenimiento

- Tras cambios en firmas RPC o en el contrato `AgentResponse` / `ChatMessage.metadata`, actualizar **este archivo** y una línea de referencia en `AI_CONTEXT/active_context.md`.
- Para incidentes de recuperación (0 resultados, 500, timeout), seguir primero el hilo: **auditoría `RAG_AUDIT` en consola** → RPCs en Supabase → fallback en `ragService` → prompt.

Documento operativo SCA; mantener sincronizado con el código y con los scripts SQL referenciados.
