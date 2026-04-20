# Sprint 5: Reportes Detallados y Estabilización Técnica

**Fecha:** 2026-04-19  
**Objetivo:** Completar la suite de reportes esenciales y asegurar la estabilidad operativa del LMS antes del piloto final.

---

## 1. Planificación de Tareas (Backlog Sprint 5)

| ID | Tarea | Prioridad | Estimación | Estado |
|----|-------|-----------|------------|--------|
| S5-T01 | **Reporte de Matrículación y Finalización** | Alta | 1 día | ✅ Completado |
| S5-T02 | **Hardening Técnico (UX & Error Handling)** | Media | 2 días | ✅ Completado |
| S5-T03 | **Refinamiento de Alertas de Riesgo Académico** | Media | 1 día | ✅ Completado |
| S5-T04 | **QA de Accesibilidad e i18n (es/gn)** | Alta | 1 día | ✅ Completado |

---

## 2. Detalle de Implementación

### S5-T01: Reporte de Matrículación y Finalización (HU-A03)
**Objetivo:** Permitir a los administradores descargar la lista de estudiantes inscritos por curso, su fecha de ingreso y si ya terminaron el curso.
- **Componente:** `AdminComprehensiveReportsPage.tsx`
- **Funcionalidad:** Botón de exportación CSV/Excel que genere un consolidado de `course_enrollments` cruzado con `users` y `courses`.

### S5-T02: Hardening Técnico
**Objetivo:** Resolver "cabos sueltos" en la experiencia de usuario.
- Implementar manejadores de error globales para fallos de red en cambios de estado (Toggle status, confirm email).
- Optimizar el tiempo de carga del Dashboard Docente mediante caché local de estadísticas.
- Revisar que todos los modales tengan scroll interno y no bloqueen la vista en resoluciones pequeñas.

### S5-T03: Refinamiento de Riesgo Académico (HU-D03)
**Objetivo:** Asegurar que el `AcademicRiskWidget.tsx` no solo muestre el riesgo, sino que facilite el contacto con el alumno.
- Agregar botón de "Enviar Mensaje" directo desde el widget.
- Asegurar que la vista detallada de progreso (`CourseStudentProgressPage.tsx`) resalte los items vencidos.

### S5-T04: QA de Accesibilidad e i18n
**Objetivo:** Cumplir con la base de inclusión institucional.
- **Implementación**: Se creó `adminReportsLabels.ts` para centralizar la traducción de reportes y auditoría.
- **Accesibilidad**: Se agregaron `aria-labels`, roles semánticos y estados de ocupado (`aria-busy`) en los nuevos componentes.
- **Idiomas**: Soporte completo para **Español** y **Guaraní** en el panel administrativo y widget de riesgo.

---

## 3. Seguimiento de Progreso

- **S5-T01**: ✅ Completado. Reporte detallado de matrículas disponible en `AdminComprehensiveReportsPage.tsx`.
- **S5-T02**: ✅ Completado. Optimización de consultas en Dashboard Docente y timestamps de sincronización en ambos paneles. Modales responsivos validados.
- **S5-T03**: ✅ Completado. Integrada mensajería directa en `AcademicRiskWidget.tsx`.
- **S5-T04**: ✅ Completado. Soporte i18n (ES/GN) y accesibilidad WCAG en nuevos reportes y registros de auditoría.

### Sprint 5: FINALIZADO ✅
El sistema se encuentra estable, con trazabilidad completa y optimizado para el lanzamiento del piloto MVP.

---

## 4. Definición de Terminado (DoD) para el Sprint
- [x] Todos los reportes listados en HU-A03 son exportables en CSV/Excel.
- [x] No existen modales que se corten en pantallas menores a 768px.
- [x] La bitácora (Audit Log) registra el 100% de los cambios de rol realizados en el Sprint.
- [x] El medidor de energía en Sparky IA es visible y coherente en móvil.
- [x] Soporte bilingüe (Es/Gn) validado en componentes de reporte.
