# Sprint 2 — Curso base y experiencia estudiante (LMS MVP)

**Fecha de arranque:** 2026-04-19  
**Branch base:** `feature/sprint2-kickoff-2026-04-19`  
**Objetivo Sprint 2:** Consolidar la experiencia integral de cursado en estudiante, mejorando flujos para redes inestables (skeletons), control estricto de accesibilidad a las unidades y recordatorios de fechas límites con trazabilidad horaria real.

---

## 1) Alcance comprometido del sprint (1 semana)

### Tickets en orden de ejecución (máximo 4 principales)

1. **S2-T01 — UX de Curso y Esqueletos (Bajo ancho de banda)**
   - Resultado: Las pantallas críticas (Vista de Curso, Dashboard) usan un formato robusto visual antes de que lleguen los datos.

2. **S2-T02 — Estilos de Flujo Estándar de Curso (Bloqueos)**
   - Resultado: Estricto apego gráfico a la progresión (candados de unidades no evaluadas, etc.) alineado a las reglas de negocio de EduSpark.

3. **S2-T03 — HU-E03 (Recordatorios básicos de entrega)**
   - Resultado: Panel in-app de recordatorio "Próximos al vencimiento" para las tareas de forma prioritaria en el Dashboard Cursante.

4. **S2-T04 — HU-T04 (Trazabilidad horaria estricta)**
   - Resultado: Asegurar que fechas y cierres usen estrictamente `America/Asuncion` (y `useSyncExternalStore` regional) en validaciones de guardado y visualización gráfica.

---

## 2) Fuera de alcance en Sprint 2

- Rúbricas completas de corrección docente (HU-D02) a menos que haya capacidad de ejecución al final.
- Exportación masiva de reportes administrativos (HU-A03), agendadas para Sprint 3-4.
- Notificaciones vía correo electrónico (solo in-app por ahora para controlar costos y viabilidad).

---

## 3) Plan diario (Lun-Vie)

## Día 1 - Kickoff y Skeletons
- Ejecutar S2-T01.
- Implementar `SkeletonLoader` para Dashboard y CourseView de forma responsiva.

## Día 2 - Flujo Estándar y Progresión
- Ejecutar S2-T02.
- Refinamiento de visualización de curso con unidades bloqueadas vs desbloqueadas.

## Día 3 - Recordatorios in-app (HU-E03)
- Ejecutar S2-T03.
- Filtrar la data ya existente de *Assignments* para mostrar eventos con caducidad en < 3 días.

## Día 4 - Refinamiento Horario (HU-T04)
- Ejecutar S2-T04.
- Validar las transformaciones en TSX de fechas UTC hacia la Timezone definida.

## Día 5 - Verificación Integral y QA
- QA de todos los flujos creados y grabación/registro funcional final.
- Cierre del Sprint y actualización de `active_context.md`.

---

## 4) Prompts listos para usar en Cursor (por ticket)

### Prompt S2-T01 (Skeletons)
Implementa Skeletons para la vista `StudentDashboardPage.tsx` y `CourseViewPage.tsx`.
Objetivo: Reducir layout shift en bajas conexiones, mostrando el layout visual a grandes rasgos en la espera.
Reglas SCA: Mantener diseño limpio. Usar tailwind CSS colors como base. Reportar los diff al terminar y actualizar estado.

### Prompt S2-T02 (Estilos de Bloqueo Unidades)
Implementa mejoras visuales a la regla de negocio de progresión del curso en `CourseViewPage.tsx`.
Objetivo: Todo tema sin desbloquear (por restricciones de correlatividad o syllabus) debe mostrarse explícitamente bloqueado (candado / opacidad reducida). Evita interacciones espurias.
Mantener alocaciones idiomáticas i18n (`es/gn`).

### Prompt S2-T03 (Recordatorios)
Implementa `HU-E03` con un panel de notificaciones rápidas in-app para el Estudiante.
Lee desde las entregas próximas y enlista compactamente en el top of the fold si y sólo si faltan menos de 3 días (72hs).
Prevé que no consuman consultas n+1 al servicio y mantén la eficiencia de lectura en DB.

### Prompt S2-T04 (Trazabilidad Horaria)
Verifica e implementa la zona estricta horaria `America/Asuncion` (usando la constante `DEFAULT_TIMEZONE_PARAGUAY` provista) para cualquier *renderizado visual* temporal o validez de cuota de tiempo en Tareas de docente y visual de estudiante.
Objetivo: Eliminar discrepancias front/back por husos horarios diferentes.

---

## 5) Criterios de cierre Sprint 2
1. Skeleton Loaders operacionales en las interfaces principales del Estudiante.
2. Unidades e instancias inaccesibles señaladas visual y funcionalmente (no-clic) correctamente.
3. Alerta in-app de cierre de entregas probada.
4. Renderizado horario garantizado.
5. Se ha registrado cada cierre de Ticket en el `active_context.md`.

---

## 6) Registro de ejecución (llenado diario)

| Ticket | Estado      | Responsable | Evidencia | Bloqueos |
|--------|-------------|-------------|-----------|----------|
| S2-T01 | ✅ Completado | SCA-Agent | Skeleton loaders en Dashboard y CourseView. AIInsightsBanner rediseñado como chip colapsable. | - |
| S2-T02 | ✅ Completado | SCA-Agent | `getUnitLockReason()` + render visual mejorado en CourseViewPage (razón de bloqueo legible, íconos contextuales, título atenuado). | - |
| S2-T03 | ✅ Completado | SCA-Agent | `UpcomingDeadlinesBanner` en Dashboard: 1 query, filtro <72hs, 3 niveles urgencia (rojo/naranja/ámbar), descartable por sesión. | - |
| S2-T04 | ✅ Completado | SCA-Agent | `src/utils/dateFormat.ts` creado. Todas las fechas en Dashboard, CourseViewPage, AssignmentDetailPage usan `America/Asuncion` vía utilidades `formatDate/formatDateShort/formatDateTime/formatTime/toParaguayMidnight`. | - |

---

## 7) Nota SCA de ejecución
- Antes de iterar cada ticket: leer `AI_CONTEXT/instructions.md` + este documento + `AI_CONTEXT/active_context.md`.
- Al finalizar un ticket: actualizar las columnas de la matriz en este mismo archivo, rellenar evidencia y replicar los hallazgos en el `active_context.md`.
