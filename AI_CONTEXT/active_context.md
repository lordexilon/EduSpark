# CONTEXTO ACTIVO

> **DOCUMENTO DINÁMICO**: Actualizar al inicio y fin de cada sesión.

**Última actualización:** 2026-03-26 (rama snapshot `release/a2a-rag-pgvector-2026-03-26` — A2A, RAG, Supabase/pgvector)
**Fase Actual:** Optimización RAG, despliegue y límites de costo Tutor IA

## Tareas en Curso (WIP)
| Tarea | Estado | Responsable | Notas |
|-------|--------|-------------|-------|
| 🏷️ Snapshot release A2A + RAG + Supabase pgvector | ✅ Completado | Cursor | Rama **`release/a2a-rag-pgvector-2026-03-26`** en `origin`; paquete principal **`0a40871`**. Tutor A2A, `ragService`, worker, SQL `146`/`173`/`174`/`176`/`177`/`178`, Supabase (`generate-course-syllabus`, `get-agent-response`, `get-secure-material`), doc en `AI_CONTEXT/04_FEATURES/`. **Excluido:** `functions/rag-worker/.env.production`, `supabase/.temp/`, logs/build; sin borrados masivos locales. |
| 📚 Agent Skills Cursor (repo EduSpark) | ✅ Completado | Cursor | Canónicos en **`.cursor/skills/<nombre>/SKILL.md`**: `edtech-ux-ui-web-flutter`, `eduspark-ux-ui-flutter`, `eduspark-compliance-regulatory`, `moodle-architect-paraguay-aneaes`. Versionados con git; perfil personal `~/.cursor/skills/` solo como respaldo si falta copia local del repo. Detalle: `AI_CONTEXT/instructions.md` § Agent Skills. |
| 🛠️ Optimización RAG (Harrison/Libros) | ✅ Completado | Antigravity | Implementado búsqueda híbrida (Vector + Keyword) |
| 🚀 Despliegue Cloud Run | ✅ Completado | Antigravity | Frontend actualizado y desplegado en GCP |
| 🗄️ Actualización Supabase RPC | ⏳ Pendiente Usuario | Usuario | Ejecutar `178_hotfix_text_clean_bounded_cte.sql` en SQL Editor si persiste 57014 en `search_course_content_chunks_text_clean` (174 aplica ILIKE sobre toda la tabla). |
| 💰 Control presupuesto Tutor IA (~$50/mes + tracking) | ⏳ SQL pendiente aplicar en BD | Equipo | Script: `sql_scripts/3_tutor_rag/112_control_presupuesto_50usd_mensual.sql` — tablas `tutor_cost_tracking`, `tutor_cost_limits`; RPCs `check_tutor_cost_limit`, `track_tutor_interaction_cost`, `get_user_cost_stats`. Cliente: `src/services/tutorCostService.ts` |

## Contexto de Sesión
- **Snapshot estable (A2A / pgvector):** rama **`release/a2a-rag-pgvector-2026-03-26`** en GitHub. Paquete principal de código y artefactos: commit **`0a40871`** (`git show 0a40871`). Pueden existir commits posteriores solo de documentación SCA. `https://github.com/lordexilon/EduSpark/tree/release/a2a-rag-pgvector-2026-03-26`
- **Agent Skills Cursor (proyecto EduSpark):** rutas canónicas `.cursor/skills/eduspark-ux-ui-flutter/SKILL.md`, `.cursor/skills/eduspark-compliance-regulatory/SKILL.md`, `.cursor/skills/edtech-ux-ui-web-flutter/SKILL.md`, `.cursor/skills/moodle-architect-paraguay-aneaes/SKILL.md`. Usar según tipo de tarea (Flutter EduSpark, cumplimiento PY/CONES, UX web/Flutter genérico, Moodle ANEAES); ver tabla en `AI_CONTEXT/instructions.md` § Agent Skills. Skills previos en `feature/multi-institution-landings` (commits `6061987` / `a5a322c`).
- **Documentación A2A / Tutor (referencia principal):** `AI_CONTEXT/04_FEATURES/TUTOR_A2A_AGENTES_DOCUMENTACION_2026-03-26.md` — arquitectura AgentCoordinator + RAGAgent + ContextAgent + RAGService, flujo de mensaje, tabla de cambios con **motivo**, archivos y scripts SQL relacionados.
- Se habilitó la recuperación de materiales globales (chunks con unit_id null).
- Se corrigió el prompt para permitir que el AI use materiales de referencia como Harrison/Nelson en cualquier unidad.
- Se unificó la firma de las funciones de búsqueda en Supabase para soportar embeddings de 512 dimensiones.
- **SCA / smart_context:** El workflow `.agent/workflows/smart_context.md` debe leer `AI_CONTEXT/instructions.md` y este archivo (`AI_CONTEXT/active_context.md`) al reanudar sin saldo en Cursor; conviene refrescar ambos al cerrar una sesión con cambios relevantes.
- Se consolidó auditoría formal del impasse RAG en `AI_CONTEXT/04_FEATURES/REPORTE_EVALUACION_RAG_2026-03-26.md` (causas, fixes, estado y prueba final de cierre).
- Se ajustó `src/modules/tutor/services/ragService.ts` para reforzar citación en salida (`Fuentes` con pág./págs.), exponer `sourceMetadata` y adjuntar `retrievalAudit` (text/vector/combined) en metadata de respuesta.
- Hotfix defensivo aplicado en `ragService.ts`: fallback de búsqueda textual si falla la RPC `search_course_content_chunks_text_clean` (firma alternativa y query directa).
- Script SQL preparado para resolver el 500 de raíz: `sql_scripts/5_fixes/174_hotfix_search_text_clean_rpc_500.sql` (pendiente ejecutar en Supabase SQL Editor).
- Ajuste adicional en `ragService.ts`: limpieza semántica de consulta para búsqueda textual (ej. "afasia") y `match_threshold` vectorial reducido a `-1.0` para evitar `vectorCount=0` por umbral estricto.
- Ajuste de resiliencia: fallback textual ahora evita `ilike` en SQL (que disparaba timeout) y aplica filtrado por keywords en TypeScript sobre lote acotado por curso.
- Ajuste de build en `vite.config.ts`: `manualChunks` migrado a función por dominios (`vendor-*`, `app-services`, `app-pages-*`, `app-tutor-module`) para reducir presión del chunk principal.
- Verificación ejecutada con `npm run build`: build OK, pero persisten warnings de Vite por mezcla de imports dinámicos + estáticos en módulos (`googleOAuthService`, `geminiService`, `flashcardService`, `firestoreService`); requiere refactor de estrategia de imports.
- Refactor aplicado para build warnings: se eliminó mezcla dynamic/static import en `googleCalendarService.ts`, `videoTranscriptService.ts`, `comprehensiveReportService.ts`, `gradingService.ts`, `CourseViewPage.tsx`, `TeacherFlashcardsPage.tsx`, `contentIndexingService.ts`, `FileProcessingPage.tsx` y `MaterialsManagementPage.tsx`.
- Verificación posterior con `npm run build`: desaparecieron warnings de "dynamic import will not move module into another chunk"; permanece solo warning global de chunks > 1000 kB.
- Tutor (`TutorVirtualPage.tsx`): corregido uso de un solo ref mezclando `initKey` (`12-no-module`) con `moduleId` UUID, que provocaba `moduleChanged: true` permanente y ruido en logs; ahora `lastInitKeyRef` + `lastSyncedModuleIdRef`. Sin curso: `console.debug` en DEV en lugar de `warn`.
- RAG (`ragService.ts`): si hay resultados textuales pero vectorial = 0 sin error RPC, se emite `RAG_VECTOR_HINT` con causas probables y ruta al SQL de diagnóstico.
- SQL diagnóstico embeddings: `sql_scripts/4_diagnostics/176_diagnostic_embedding_por_curso.sql` (conteo con/sin embedding por curso + firma RPC).
- Hotfix vectorial aplicado y verificado (2026-03-26): `sql_scripts/5_fixes/177_hotfix_search_course_content_chunks_unificar_rpc.sql` — diagnóstico `176_diagnostic_embedding_por_curso.sql` muestra **una sola** RPC `search_course_content_chunks(query_embedding text, match_threshold double precision, match_count integer, course_id_param integer, p_module_id uuid)`.
- RPC textual timeout (57014): script **`sql_scripts/5_fixes/178_hotfix_text_clean_bounded_cte.sql`** — CTE limita filas antes de ILIKE (sustituye el cuerpo agresivo de `174` si sigue el timeout en producción).
- Cliente `ragService.ts`: ante 57014 no se reintenta la misma RPC con firma corta; fallback directo con `limit(400)`, segunda página `range(400,999)` si el filtro local da 0, y coincidencia **sin acentos** (`normalizeTextForMatch`) para términos como afasia/afasía.
- `TutorVirtualPage.tsx`: dependencias del `useEffect` de inicialización sin el objeto `agentSystem` completo (referencia nueva cada render) + `initializeAgentSystem` estable; evita bucle de logs y re-ejecuciones.
- Tutor respuesta “entrecortada”: `ragService.generateResponse` ahora concatena **todas** las `parts[].text` de Gemini (antes solo `parts[0]`); `maxOutputTokens` 4096; instrucción explícita de no cortar frases a medias; `RAGAgent` deja de reemplazar `.` en perfil auditivo y deja de mutar texto en lectoescritor (evitaba corrupción de markdown).
- Tutor material/páginas: `AgentCoordinator` + `useAgentSystem` propagan `sourceMetadata` al mensaje del asistente; `TutorVirtualPage` muestra bloque **«Información según estos materiales (páginas…)»** y el desplegable «Fuentes» admite ítems string; prompt RAG reforzado para citar material y página en el cuerpo y en sección Fuentes.

## Deuda Técnica (Technical Debt)
| ID | Fecha | Severidad | Descripción |
|----|-------|-----------|-------------|
| TD-02 | 2026-03-25 | Media | El backfill de chunks históricos (asignar unit_id desde metadata) sigue pendiente de ejecutar para grandes volúmenes. |
