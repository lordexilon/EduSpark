# Control del desarrollo — EduSpark (SCA)

**Propósito:** un solo lugar para **orientar al equipo y a la IA** sobre qué documentos mandan, qué frentes existen y cómo registrar avances sin perder trazabilidad.

**Última actualización:** 2026-04-19

---

## 1. Documentos maestros (orden de lectura)

| Documento | Rol |
|-----------|-----|
| `AI_CONTEXT/instructions.md` | Reglas estrictas para la IA (SCA): Context Bridge, `active_context`, skills. |
| `AI_CONTEXT/active_context.md` | **Estado vivo:** fecha, WIP, cambios técnicos recientes, pendientes usuario/ops, deuda. **Actualizar al cerrar trabajo relevante.** |
| **Este archivo** (`DESARROLLO_CONTROL.md`) | Mapa de frentes, SQL de referencia, cadencia y enlaces a sprints/features. |

Regla de oro: si no está en `active_context.md`, el equipo puede perder el hilo entre sesiones.

---

## 2. Frentes del producto

| Frente | Ubicación en repo | Notas |
|--------|-------------------|--------|
| **Desktop Uploader (Python + EXE)** | `scripts/desktop_uploader/` | **Frente operativo prioritario actual** para procesamiento de PDFs/libros grandes. Ejecutable `EduSparkUploader.exe` y modo dev `python ingest.py`. |
| **Web (React + Vite)** | `src/`, `public/` | Frente en mantenimiento (secundario). Mantener estable sin introducir cambios de alto riesgo mientras se opera por desktop uploader. |
| **Mobile (Flutter)** | `eduspark_mobile/` | Estudiante: nativo; docente: WebView → app web (`RoleGate`). Ver `eduspark_mobile/README.md`. |
| **Supabase** | `supabase/migrations/`, `sql_scripts/` | Migraciones versionadas; scripts operativos por carpeta temática. |
| **Deploy frontend (GCP)** | `cloudbuild.yaml`, `Dockerfile-cloudrun`, `docs/deployment/GUIA_DESPLIEGUE_GOOGLE_CLOUD.md` | Cloud Run: servicio `eduspark-frontend`, región `us-central1`, proyecto `eduspark-py`. Usuario: `gcloud auth login` + permisos IAM. |
| **Tutor / RAG** | `src/modules/tutor/`, `functions/rag-worker/` | Alineado a docs en `AI_CONTEXT/04_FEATURES/`. |

---

## 3. Features y sprint (producto pedagógico)

| Tema | Documento |
|------|-----------|
| RA / evidencias / CONES | `AI_CONTEXT/04_FEATURES/RESULTADOS_APRENDIZAJE_MARCOS_COMPETENCIAS_EDUSPARK.md` §10 |
| Sprint presentación / demo | `AI_CONTEXT/04_FEATURES/SPRINT_PRESENTACION_RA_FASE_A_2026.md` |
| Auditoría CONES/ANEAES | `AI_CONTEXT/04_FEATURES/REPORTE_AUDIT_CONES_ANEAES_EDUSPARK_2026-03-26.md` |
| Roadmap MVP LMS (6 semanas) | `AI_CONTEXT/04_FEATURES/ROADMAP_LMS_MVP_6_SEMANAS_2026-04.md` |
| Historias de usuario MVP LMS | `AI_CONTEXT/04_FEATURES/HISTORIAS_USUARIO_LMS_MVP_2026-04.md` |
| Sprint 1 ejecución operativa | `AI_CONTEXT/04_FEATURES/SPRINT_1_EJECUCION_LMS_MVP_2026-04.md` |
| Sprint 2 ejecución operativa | `AI_CONTEXT/04_FEATURES/SPRINT_2_EJECUCION_LMS_MVP_2026-04.md` |
| Sprint 3 ejecución operativa | `AI_CONTEXT/04_FEATURES/SPRINT_3_EJECUCION_LMS_MVP_2026-04.md` |
| Sprint 4 ejecución operativa | `AI_CONTEXT/04_FEATURES/SPRINT_4_EJECUCION_LMS_MVP_2026-04.md` |
| Sprint 5 reportes y estabilización | `AI_CONTEXT/04_FEATURES/SPRINT_5_EJECUCION_LMS_MVP_2026-04.md` |
| Playbook AI + equipo humano | `AI_CONTEXT/03_GUIAS/PLAYBOOK_AI_HUMANO_DESARROLLO_RAPIDO.md` |

**Migración RA Fase B (referencia):** `supabase/migrations/20260328_learning_outcomes_fase_b.sql`

---

## 4. Cadencia sugerida (control)

1. **Al terminar una tarea con impacto:** actualizar `active_context.md` (fecha, WIP, archivos/SQL tocados).
2. **Nuevo script SQL o RPC:** nombre de archivo + proyecto Supabase en `active_context`.
3. **Antes de release / APK:** revisar WIP, pendientes de usuario y `flutter doctor` / build (mobile).
4. **Cursor / IA:** seguir `.cursor/rules` y leer `instructions.md` + `active_context.md` al reanudar (ver workflow smart_context si aplica).

---

## 5. Pendientes típicos de entorno (no código)

| Tema | Acción |
|------|--------|
| Flutter `pub get` / “Unable to find git” | Instalar **Git for Windows** y dejarlo en el `PATH`; reiniciar terminal/IDE. |
| Mobile contra front local | `flutter run --dart-define=EDUSPARK_WEB_URL=http://<IP>:5173` (emulador Android: `10.0.2.2` como host). |
| RPC RAG timeout 57014 | Evaluar `sql_scripts/5_fixes/178_hotfix_text_clean_bounded_cte.sql` en SQL Editor. |
| Forecast costo IA (2000 alumnos, ratios 30 d) | `180` / `181` en `sql_scripts/4_diagnostics/` (solo diagnostico; **corrida inicial 2026-04-14 en Supabase**; repetir mensualmente o ante cambios de trafico). Doc: `AI_CONTEXT/04_FEATURES/ANALISIS_REALISTA_COSTOS_IA_2000_ALUMNOS_2026-04-14.md`. |

---

## 6. Rama / release de referencia (Tutor A2A / RAG)

- Rama: `release/a2a-rag-pgvector-2026-03-26` (detalle en `active_context.md`).

---

*Documento vivo: actualizar fecha al cambiar procesos o frentes.*
