# Sprint 1 — Ejecucion operativa (LMS MVP)

**Fecha de arranque:** 2026-04-15  
**Branch base:** `feature/sprint1-kickoff-2026-04-15`  
**Objetivo Sprint 1:** entregar la base de experiencia por rol (estudiante/docente/admin) con foco en usabilidad, permisos y trazabilidad minima.

---

## 1) Alcance comprometido del sprint (1 semana)

### Tickets en orden de ejecucion (maximo 6)

1. **S1-T01 — HU-T01 (RBAC base)**
   - Resultado: rutas/pantallas clave con control de acceso consistente por rol.

2. **S1-T02 — HU-E01 (Home estudiante: 3 acciones clave)**
   - Resultado: dashboard estudiante con `Continuar curso`, `Proxima entrega`, `Progreso`.

3. **S1-T03 — HU-E02 (Progreso visible estudiante)**
   - Resultado: barra/estado de avance por curso y unidad.

4. **S1-T04 — HU-D01 (Flujo guiado docente para actividad)**
   - Resultado: flujo de creacion/publicacion simplificado para docente.

5. **S1-T05 — HU-A02 (Admin: roles + matriculas)**
   - Resultado: administracion basica de asignacion de roles y matriculas.

6. **S1-T06 — HU-T03 (Accesibilidad + i18n baseline)**
   - Resultado: checklist WCAG 2.1 en flujos clave + textos esenciales `es/gn`.

---

## 2) Fuera de alcance en Sprint 1 (para proteger foco)

- Importacion masiva avanzada (HU-A01 completo) si compromete plazos.
- Reportes exportables completos (HU-A03) salvo prototipo minimo.
- Alertas de riesgo docente (HU-D03) salvo indicador simple.
- Instrumentacion analitica completa (HU-T02) mas alla de eventos basicos.

---

## 3) Plan diario (Lun-Vie)

## Dia 1 - Kickoff tecnico y RBAC
- Ejecutar S1-T01.
- Definir matriz rol -> vista -> accion permitida.
- Verificacion: pruebas de acceso rapido por rol.

## Dia 2 - Experiencia estudiante (entrada)
- Ejecutar S1-T02.
- Verificacion: estudiante identifica siguiente accion en <= 10 segundos.

## Dia 3 - Experiencia estudiante (seguimiento)
- Ejecutar S1-T03.
- Verificacion: progreso actualizado al completar actividad.

## Dia 4 - Experiencia docente + admin
- Ejecutar S1-T04 y S1-T05 (alcance minimo viable).
- Verificacion: docente publica actividad; admin asigna rol/matricula.

## Dia 5 - Calidad, accesibilidad y demo interna
- Ejecutar S1-T06.
- QA por rol + ajuste de bugs bloqueantes.
- Registrar cierre y backlog de arrastre.

---

## 4) Prompts listos para usar en Cursor (por ticket)

### Prompt S1-T01 (RBAC)
Implementa `HU-T01` en alcance Sprint 1.
Objetivo: asegurar que rutas y acciones clave respeten rol (estudiante/docente/admin).
Entregables:
1) cambios minimos y seguros,
2) mapa de rutas protegidas,
3) pruebas manuales por rol.
No cambies comportamiento fuera de permisos.
Al final: resumen, riesgos, y pasos de verificacion.

### Prompt S1-T02 (Home estudiante)
Implementa `HU-E01` para Sprint 1.
Objetivo: dashboard estudiante con tres bloques visibles (`Continuar curso`, `Proxima entrega`, `Progreso`) en una sola vista.
Criterio clave: en maximo 2 clics llega al contenido pendiente.
Mantener UI simple, clara y mobile-first.
Al final: resumen, archivos tocados y validacion.

### Prompt S1-T03 (Progreso)
Implementa `HU-E02` para Sprint 1.
Objetivo: mostrar avance por curso/unidad con estado y porcentaje.
Requisito: actualizar estado al completar actividad.
No introducir refactor amplio; solo lo necesario para cumplir la historia.
Entrega evidencia de prueba funcional.

### Prompt S1-T04 (Docente)
Implementa `HU-D01` para Sprint 1.
Objetivo: flujo guiado de creacion/publicacion de actividad docente.
Prioriza reducir pasos y ambiguedad de formularios.
Incluir validaciones de campos obligatorios y feedback claro.
Al final: demo de flujo extremo a extremo.

### Prompt S1-T05 (Admin)
Implementa `HU-A02` para Sprint 1.
Objetivo: asignacion basica de roles y matriculas sin friccion.
Requisitos:
- permisos consistentes con RBAC,
- mensajes de exito/error claros.
No tocar modulos no relacionados.

### Prompt S1-T06 (Accesibilidad+i18n)
Implementa `HU-T03` para Sprint 1.
Objetivo: baseline de accesibilidad (WCAG 2.1) + textos clave en `es` y `gn` para pantallas del sprint.
Checklist minimo: contraste, foco visible, etiquetas y errores legibles.
Entrega lista de validaciones realizadas.

---

## 5) Checklist QA rapido por rol

## Estudiante
- Ve tres acciones principales al ingresar.
- Entiende su progreso sin navegar multiples pantallas.
- Puede continuar curso en 2 clics o menos.

## Docente
- Crea y publica actividad sin bloqueo.
- Campos y errores del formulario son claros.
- La actividad publicada es visible para estudiantes.

## Administrador
- Puede asignar/ajustar rol sin inconsistencias.
- Puede matricular usuario en curso sin pasos ocultos.
- Acciones criticas quedan registradas (si aplica auditoria ya implementada).

## Transversal
- No hay fuga de permisos entre roles.
- Flujo principal funciona en responsive.
- Baseline accesibilidad e idioma validado en pantallas objetivo.

---

## 6) Criterios de cierre Sprint 1

Un ticket Sprint 1 se cierra solo si:
1. Cumple criterios de aceptacion HU vinculada.
2. Tiene verificacion funcional por rol afectado.
3. Se registra en `AI_CONTEXT/active_context.md` (cambio, estado, riesgos).
4. No introduce errores criticos nuevos en flujo principal.

---

## 7) Registro de ejecucion (llenado diario)

| Ticket | Estado | Responsable | Evidencia | Bloqueos |
|--------|--------|-------------|-----------|----------|
| S1-T01 | Completado | Equipo | RBAC centralizado + rutas estudiante sensibles removidas; `npm run build` OK y lints sin errores (2026-04-15) | - |
| S1-T02 | Completado | Equipo | Dashboard estudiante con 3 acciones clave en una sola vista (continuar/próxima entrega/progreso); `npm run build` OK y lints sin errores (2026-04-15) | - |
| S1-T03 | Completado | Equipo | Sección `Progreso por curso` con barra, estado (pendiente/en curso/completado) y próxima fecha límite por curso; `npm run build` OK y lints sin errores (2026-04-15) | - |
| S1-T04 | Completado | Equipo | Flujo guiado en creación/edición de tarea (pasos, validación y mensajes claros); `npm run build` OK y lints sin errores (2026-04-15) | - |
| S1-T05 | Completado | Equipo | Admin: asignación de rol + matrícula por institución + alta con institución obligatoria (excepto rol admin) + acción rápida para asignar institución a usuarios legacy; `npm run build` OK y lints sin errores (2026-04-15) | - |
| S1-T06 | Completado | Equipo | Baseline accesibilidad+i18n: `StudentDashboardPage` con textos esenciales `es/gn` en header y quick actions; `CreateEditAssignmentPage` con textos clave `es/gn`, `aria-live` para errores y resumen de validación, y `aria-invalid`/`aria-describedby` en campos críticos; `npm run build` OK y lints sin errores (2026-04-15) | - |

---

## 8) Nota SCA de ejecucion

- Antes de cada ticket: leer `AI_CONTEXT/instructions.md` + `AI_CONTEXT/active_context.md`.
- Al cerrar cada ticket: actualizar `active_context.md`.
- Mantener cambios pequenos, trazables y con rutas de archivo explicitas.
