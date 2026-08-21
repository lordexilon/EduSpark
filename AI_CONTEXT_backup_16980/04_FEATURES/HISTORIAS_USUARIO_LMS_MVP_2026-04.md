# Historias de usuario MVP LMS (estudiante/docente/admin)

**Fecha:** 2026-04-15  
**Objetivo:** convertir prioridades del MVP en backlog accionable para equipo humano + IA.

---

## 1) Estudiante

### HU-E01 - Continuar aprendizaje rapidamente
**Como** estudiante, **quiero** ver inmediatamente mi siguiente accion al ingresar, **para** continuar mi curso sin confusion.
- Prioridad: Alta
- Criterios de aceptacion:
  - El dashboard muestra `Continuar curso`, `Proxima entrega` y `Progreso`.
  - En maximo 2 clics llega al contenido pendiente.

### HU-E02 - Entender mi avance
**Como** estudiante, **quiero** visualizar mi progreso por curso/unidad, **para** saber cuanto me falta y priorizar.
- Prioridad: Alta
- Criterios de aceptacion:
  - Barra de avance con porcentaje y estado.
  - Fechas limite visibles por actividad.

### HU-E03 - Recibir recordatorios utiles
**Como** estudiante, **quiero** recordatorios antes de vencimientos, **para** reducir entregas tardias.
- Prioridad: Media
- Criterios de aceptacion:
  - Notificacion in-app y/o correo configurable.
  - No se envian notificaciones duplicadas por el mismo evento.

---

## 2) Docente

### HU-D01 - Crear actividad con flujo guiado
**Como** docente, **quiero** crear y publicar actividades con plantilla, **para** ahorrar tiempo y reducir errores.
- Prioridad: Alta
- Criterios de aceptacion:
  - Existe wizard/flujo guiado con pasos claros.
  - La actividad publicada es visible para estudiantes de inmediato.

### HU-D02 - Corregir con rubrica reutilizable
**Como** docente, **quiero** usar rubricas guardadas, **para** estandarizar evaluacion y acelerar correccion.
- Prioridad: Alta
- Criterios de aceptacion:
  - Se puede seleccionar una rubrica existente.
  - El feedback y la calificacion quedan registrados en la misma pantalla.

### HU-D03 - Detectar estudiantes en riesgo
**Como** docente, **quiero** un panel de riesgo academico basico, **para** intervenir a tiempo.
- Prioridad: Media
- Criterios de aceptacion:
  - Lista de estudiantes sin avance o con retraso.
  - Enlace directo a detalle del curso/actividad.

---

## 3) Administrador

### HU-A01 - Cargar usuarios en lote
**Como** administrador, **quiero** importar usuarios via CSV, **para** habilitar periodos academicos rapidamente.
- Prioridad: Alta
- Criterios de aceptacion:
  - Validacion de formato y reporte de errores por fila.
  - Confirmacion de altas exitosas.

### HU-A02 - Gestionar roles y matriculas
**Como** administrador, **quiero** asignar roles y matriculas por curso, **para** mantener control operativo.
- Prioridad: Alta
- Criterios de aceptacion:
  - Roles aplican permisos correctos por vista.
  - Matricula se refleja en el curso sin tareas manuales extra.

### HU-A03 - Exportar reportes esenciales
**Como** administrador, **quiero** exportar reportes de avance/finalizacion/notas, **para** control academico y rendicion.
- Prioridad: Alta
- Criterios de aceptacion:
  - Export CSV o formato equivalente disponible.
  - Filtros por fecha, curso e institucion.

### HU-A04 - Trazabilidad operativa
**Como** administrador, **quiero** ver auditoria de acciones criticas, **para** garantizar cumplimiento y soporte.
- Prioridad: Media
- Criterios de aceptacion:
  - Eventos: cambio de rol, publicacion de curso, ajustes de nota.
  - Registro con usuario, timestamp y accion.

---

## 4) Historias tecnicas transversales (enabler)

### HU-T01 - Permisos robustos (RBAC)
**Como** equipo de producto, **queremos** controles por rol consistentes, **para** evitar exposicion de datos o acciones no autorizadas.
- Prioridad: Alta
- Criterios de aceptacion:
  - Todas las rutas clave verifican rol/permisos.
  - Pruebas de acceso basicas por perfil.

### HU-T02 - Base de metricas MVP
**Como** equipo, **queremos** instrumentacion minima de eventos, **para** medir adopcion y mejorar con evidencia.
- Prioridad: Media
- Criterios de aceptacion:
  - Se registran eventos de login, inicio actividad, entrega y publicacion.
  - KPI semanales se pueden calcular sin proceso manual complejo.

### HU-T03 - Accesibilidad e idioma institucional
**Como** equipo, **queremos** soporte base de accesibilidad e i18n, **para** garantizar inclusion y adopcion en contexto EduSpark.
- Prioridad: Alta
- Criterios de aceptacion:
  - Flujos principales cumplen baseline WCAG 2.1 (contraste, foco, etiquetas, errores legibles).
  - Textos clave disponibles en `es` y `gn` en pantallas MVP prioritarias.

### HU-T04 - Cumplimiento horario y trazabilidad
**Como** equipo, **queremos** reglas base de cumplimiento academico, **para** sostener auditoria y operacion institucional.
- Prioridad: Alta
- Criterios de aceptacion:
  - Eventos academicos usan referencia `America/Asuncion`.
  - Evidencias/acciones criticas tienen rastro de auditoria consistente.

---

## 5) Definicion de terminado (DoD) para historias MVP

Una historia se considera terminada si cumple:
1. Criterios de aceptacion validados por QA/PO.
2. Verificacion funcional en entorno de prueba.
3. Nota de cambio registrada en `AI_CONTEXT/active_context.md`.
4. Riesgos o pendientes explicitados (sin ocultar deuda).

---

## 6) Trazabilidad con roadmap

- La secuencia de implementacion se alinea con `AI_CONTEXT/04_FEATURES/ROADMAP_LMS_MVP_6_SEMANAS_2026-04.md`.
- Si una historia cambia de prioridad, registrar motivo y decision en `active_context.md`.
