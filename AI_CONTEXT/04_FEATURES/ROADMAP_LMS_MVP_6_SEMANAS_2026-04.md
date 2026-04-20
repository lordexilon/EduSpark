# Roadmap LMS MVP 6 semanas (80/20)

**Fecha:** 2026-04-15  
**Objetivo general:** entregar un MVP utilizable para estudiante, docente y administrador, con base operativa para escalar desarrollo asistido por IA.

---

## 1) Principios de priorizacion

1. **Simplicidad por rol primero:** si una funcionalidad no reduce friccion en estudiante/docente/admin, no entra al sprint.
2. **Cumplimiento y trazabilidad desde el inicio:** auditoria minima, roles, exportacion y evidencia.
3. **Iteracion corta y medible:** entregables semanales con KPI de adopcion y calidad.
4. **AI como acelerador, no reemplazo:** IA propone y automatiza; equipo humano valida decisiones de producto y cumplimiento.

---

## 2) Objetivos por rol (resultado esperado)

- **Estudiante:** en menos de 10 segundos identifica que hacer ahora (continuar curso, proxima entrega, progreso).
- **Docente:** crea/publica/evalua sin depender de soporte tecnico.
- **Administrador:** gestiona usuarios/roles, monitorea estado y exporta reportes en pocos clics.

---

## 3) Plan de 6 semanas

## Semana 1 - Fundacion UX y acceso
- Home por rol (3 acciones clave por perfil).
- Navegacion consistente (maximo 5 items principales).
- Login y control de acceso por rol (flujo claro de sesion).
- Base UX EdTech: microaprendizaje (3-5 items visibles), progreso visible y criterio WCAG 2.1.
- Criterios de aceptacion:
  - Estudiante ve proxima accion sin navegar mas de 1 pantalla.
  - Docente y admin tienen panel inicial diferenciado.

## Semana 2 - Curso base y experiencia estudiante
- Estructura estandar de curso: introduccion, contenido, actividad, evaluacion.
- Progreso visible (barra + estados pendiente/en curso/completado).
- Recordatorios basicos de entrega (in-app + correo si aplica).
- Soporte de bajo ancho de banda: skeleton loaders, priorizar texto/SVG y estrategia cache/offline incremental.
- Criterios de aceptacion:
  - Se puede completar un flujo extremo a extremo de una unidad.
  - El estado de avance se actualiza correctamente tras actividad.

## Semana 3 - Flujo docente de evaluacion
- Creacion guiada de actividad/evaluacion con plantilla.
- Rúbrica reutilizable para tarea.
- Bandeja de pendientes de correccion.
- Criterios de aceptacion:
  - Docente crea y publica actividad sin pasos ambiguos.
  - Se registra feedback y calificacion en una sola vista.

## Semana 4 - Operacion administrativa minima
- Alta manual y masiva de usuarios (CSV) con validacion.
- Asignacion de roles y matricula por curso.
- Auditoria minima de eventos (quien/que/cuando) para operaciones criticas.
- Cumplimiento base EduSpark: timezone `America/Asuncion`, trazabilidad de evidencia y controles de privacidad para PII sensible.
- Criterios de aceptacion:
  - Admin puede cargar un lote de usuarios y asignar curso.
  - Cambio de rol y publicacion de curso queda auditado.

## Semana 5 - Reportes y estabilizacion
- Reportes esenciales exportables: inscripcion, avance, finalizacion, notas.
- Panel de alertas de riesgo academico basico.
- Hardening tecnico: errores frecuentes, tiempos de respuesta, UX edge cases.
- Criterios de aceptacion:
  - Export de reporte funciona para admin y docente segun permisos.
  - Alertas muestran al menos estudiantes sin avance o atrasados.

## Semana 6 - Piloto controlado y cierre MVP
- Piloto con cohorte pequena (estudiante/docente/admin reales).
- Ajustes por feedback priorizado (alto impacto, bajo esfuerzo).
- Cierre de MVP con checklist de salida y backlog fase 2.
- Criterios de aceptacion:
  - NPS interno de usabilidad >= objetivo definido por producto.
  - Se documenta backlog post-MVP (integraciones, AI avanzada, mobile offline completo, etc.).

---

## 4) KPI de seguimiento semanal

- **Adopcion estudiante:** porcentaje que inicia actividad en la primera sesion.
- **Eficiencia docente:** tiempo promedio para crear y publicar una actividad.
- **Eficiencia admin:** tiempo promedio para alta y asignacion de usuarios.
- **Calidad operativa:** errores criticos por semana y tiempo de resolucion.
- **Uso real:** cursos activos, entregas completadas, evaluaciones corregidas.
- **Accesibilidad y alcance:** porcentaje de pantallas MVP compatibles con WCAG 2.1 y soporte i18n (es/gn) en flujos principales.

---

## 5) Fuera de MVP (fase 2)

- xAPI/LRS completo y analitica avanzada.
- LTI 1.3 e integraciones institucionales profundas.
- Recomendaciones adaptativas con IA.
- Proctoring avanzado.
- Marketplace/monetizacion compleja.

---

## 6) Gobernanza de ejecucion

- Este roadmap se ejecuta junto con:
  - `AI_CONTEXT/04_FEATURES/HISTORIAS_USUARIO_LMS_MVP_2026-04.md`
  - `AI_CONTEXT/03_GUIAS/PLAYBOOK_AI_HUMANO_DESARROLLO_RAPIDO.md`
  - `AI_CONTEXT/active_context.md` (estado vivo semanal)

- Regla SCA: al cerrar cambios relevantes, actualizar `active_context.md` con:
  - fecha de actualizacion,
  - avances reales por semana,
  - bloqueos,
  - decisiones tomadas.
