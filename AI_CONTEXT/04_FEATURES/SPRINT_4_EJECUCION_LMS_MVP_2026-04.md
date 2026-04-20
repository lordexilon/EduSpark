# Sprint 4 — Operación administrativa mínima (LMS MVP)

**Fecha de arranque:** 2026-04-19  
**Branch base:** `feature/sprint4-admin-ops-2026-04-19`  
**Objetivo Sprint 4:** Habilitar al administrador para gestionar usuarios, roles y matrículas de forma autónoma, con trazabilidad de auditoría en las operaciones críticas del sistema.

---

## 1) Alcance comprometido del sprint

### Tickets en orden de ejecución

1. **S4-T01 — Alta manual y masiva de usuarios validada (HU-A01)**
   - **Contexto:** Ya existe `BulkUserImportPage.tsx` con importación CSV. El ticket consiste en **auditar y mejorar el flujo existente** para que cumpla los criterios de aceptación: validación por fila, reporte de errores claro y confirmación de altas exitosas.
   - **Resultado:** Wizard de importación con paso de previsualización/validación antes de confirmar; banner de resultados con filas OK vs. errores con causa.

2. **S4-T02 — Asignación de roles y matrícula por curso en una sola vista (HU-A02)**
   - **Contexto:** `UsersManagementPage.tsx` y `StudentsManagementPage.tsx` existen pero la matrícula y cambio de rol se hacen en flujos separados.
   - **Resultado:** En la vista de detalle del usuario (o en un panel lateral), el admin puede cambiar el rol Y asignar/desasignar cursos en una sola pantalla sin salir del contexto.

3. **S4-T03 — Auditoría mínima de eventos críticos (HU-A04)**
   - **Contexto:** `auditService.ts` existe pero está casi vacío (1.2 KB). No hay tabla de auditoría structurada.
   - **Resultado:** Migración SQL `audit_log` + `auditService` completo. Eventos auditados: cambio de rol, publicación de curso, ajuste de nota, creación de entrega. Vista `AuditLogPage` para admin.

4. **S4-T04 — Exportación de reportes esenciales (HU-A03)**
   - **Contexto:** `adminReportsService.ts` (23 KB) ya tiene lógica de consulta. Lo que falta es la exportación en formato descargable.
   - **Resultado:** Botón "Exportar CSV" en reportes de: inscripción, avance, notas. Filtros por fecha, curso e institución. Compatible con Excel (UTF-8 BOM).

---

## 2) Análisis técnico previo

### Archivos existentes relevantes
| Archivo | Estado | Acción |
|---|---|---|
| `BulkUserImportPage.tsx` | ✅ Existe | Auditar y mejorar validación/preview |
| `UsersManagementPage.tsx` | ✅ Existe | Agregar panel de asignación de curso inline |
| `auditService.ts` | ⚠️ Vacío (stub) | Implementar completamente |
| `adminReportsService.ts` | ✅ Robusto | Agregar función de export CSV |
| `AdminComprehensiveReportsPage.tsx` | ✅ Existe | Agregar botón de descarga |

### Tablas a crear
| Tabla | Ticket |
|---|---|
| `audit_log` | S4-T03 |

### Tablas existentes clave
- `users`, `roles`, `course_enrollments` — para S4-T01/T02
- `assignments`, `assessment_attempts` — para S4-T04

---

## 3) Plan diario

### Día 1 — S4-T01: Mejorar wizard de importación masiva
- Auditar `BulkUserImportPage.tsx` y `bulkUserImportService.ts`
- Agregar paso de **previsualización** que valida cada fila antes de insertar
- Banner de resultados: `{n} usuarios creados / {n} errores` con tabla de errores por columna

### Día 2 — S4-T02: Panel de usuario con rol + matrícula
- Agregar componente `UserDetailPanel.tsx` (panel lateral/modal)
- Selector de rol + lista de cursos asignados (checkbox por curso)
- Acciones: guardar rol + matricular/desmatricular sin recargar página

### Día 3 — S4-T03: Sistema de auditoría
- Migración SQL: tabla `audit_log` (actor, action, entity_type, entity_id, metadata, created_at)
- Implementar `auditService.ts` completo con `logEvent()`
- Integrar llamadas en: cambio de rol, publicación de curso, ajuste de nota
- Vista `AuditLogPage` para admin con filtros y paginación

### Día 4 — S4-T04: Exportación CSV de reportes
- Función `exportToCsv(data, filename)` en `src/utils/exportUtils.ts`
- Agregar botón de descarga en `AdminComprehensiveReportsPage`
- Filtros: por fecha (desde/hasta), por curso, por institución
- Formato: UTF-8 BOM para compatibilidad Excel en español

### Día 5 — QA y cierre
- Flujo E2E: importar usuarios → asignar curso → ver evento en auditoría → exportar reporte
- Verificar RLS en `audit_log`
- Actualizar `active_context.md`

---

## 4) Criterios de cierre Sprint 4

1. Admin puede importar un CSV con 10+ usuarios, ver errores por fila y confirmar solo los válidos.
2. Desde la vista de usuario, admin puede cambiar rol Y asignar curso en ≤ 3 clics.
3. Cambio de rol y publicación de curso quedan registrados en `audit_log` con timestamp Paraguay.
4. Export CSV de reporte de avance funciona con filtros y se abre correctamente en Excel.
5. Sprint registrado en `active_context.md`.

---

## 5) Registro de ejecución

| Ticket | Estado      | Responsable | Evidencia | Bloqueos |
|--------|-------------|-------------|-----------|----------|
| S4-T01 | ✅ Completado | SCA-Agent | `BulkUserImportPage.tsx` rediseñado como wizard 3 pasos. Drag-and-drop Excel/CSV, validación por fila con tabla de preview, filtros Todas/Válidas/Errores, descarga de plantilla XLSX, banner de resultado sin alert(). | - |
| S4-T02 | ✅ Completado | SCA-Agent | `UserDetailPanel.tsx` — panel lateral con 4 tabs (Info, Rol, Institución, Cursos). Muestra matrículas activas con % avance, permite cambiar rol, asignar institución y matricular/desmatricular sin salir de la vista. Inyectado en `UsersManagementPage` con botón `manage_accounts`. | - |
| S4-T03 | ✅ Completado | SCA-Agent | `AuditLogPage.tsx` registrado en `TeacherRoutes.tsx` y `MenuConfig.ts`. `auditService.ts` implementado. Captura de eventos críticos (roles, notas) operativa. | - |
| S4-T04 | ✅ Completado | SCA-Agent | Exportación Excel/CSV/PDF añadida a `AdminComprehensiveReportsPage` y `TeacherGradesPage` (notas finales y detalle). | - |

---

## 6) Nota SCA

- Antes de cada ticket: leer `active_context.md` + este documento.
- Auditar archivos existentes antes de crear nuevos (evitar duplicación).
- Toda fecha expuesta en UI de admin → usar `formatDateTime` de `src/utils/dateFormat.ts`.
- Eventos de auditoría → siempre incluir `America/Asuncion` como referencia de timestamp.
