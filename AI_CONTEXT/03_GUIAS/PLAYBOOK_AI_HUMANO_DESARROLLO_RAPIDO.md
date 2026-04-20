# Playbook AI + equipo humano (desarrollo rapido)

**Fecha:** 2026-04-15  
**Objetivo:** estandarizar colaboracion entre personas y agentes AI para ejecutar roadmap e historias con velocidad y control.

---

## 1) Modelo operativo (quien hace que)

- **Product Owner / Lider funcional**
  - Prioriza backlog (impacto, urgencia, cumplimiento).
  - Aprueba criterios de aceptacion.

- **Desarrollador/a humano**
  - Define decisiones tecnicas de mayor riesgo.
  - Valida cambios propuestos por AI antes de merge.

- **Agente AI (Cursor)**
  - Acelera: analisis, scaffolding, refactors acotados, documentacion y pruebas iniciales.
  - Mantiene trazabilidad en `AI_CONTEXT/active_context.md`.

- **QA / Validacion funcional**
  - Ejecuta pruebas de flujo por rol.
  - Confirma criterios de aceptacion y reporta brechas.

---

## 2) Ciclo rapido por ticket (SCA)

1. **Intake (5-10 min)**
   - Ticket con: objetivo, rol afectado, criterio de aceptacion, prioridad.
   - Vincular historia (HU-*) del documento de backlog.

2. **Contexto obligatorio (3-5 min)**
   - Leer `AI_CONTEXT/instructions.md` y `AI_CONTEXT/active_context.md`.
   - Revisar `AI_CONTEXT/DESARROLLO_CONTROL.md` para ubicar frente (web/mobile/BD/desktop).
   - Si aplica UX o compliance, revisar skill del repo (`.cursor/skills/edtech-ux-ui-web-flutter/SKILL.md` y/o `.cursor/skills/eduspark-compliance-regulatory/SKILL.md`).

3. **Ejecucion asistida por AI**
   - Pedir a AI: propuesta corta + implementacion acotada.
   - Exigir Context Bridge antes de cambios.
   - Mantener PR pequeno (preferible 1 objetivo por PR).

4. **Verificacion**
   - Build/lint/tests minimos del frente tocado.
   - Prueba funcional de criterio de aceptacion.

5. **Cierre con trazabilidad**
   - Registrar en `active_context.md`:
     - que se cambio,
     - archivos/rutas SQL,
     - estado (completado/pendiente),
     - riesgos/deuda detectada.

---

## 3) Plantillas de prompts recomendadas (equipo -> AI)

### Prompt A - Implementacion de historia
"Implementa la historia `HU-...` con cambios minimos y seguros.  
Contexto: [ruta/feature].  
Criterios de aceptacion: [lista].  
Al final: resumen de cambios, riesgos y verificacion ejecutada."

### Prompt B - Refactor controlado
"Refactoriza [archivo/modulo] sin cambiar comportamiento observable.  
Objetivo: legibilidad/mantenibilidad/performance puntual.  
Incluye plan breve, cambios y validacion."

### Prompt C - Diagnostico de bug
"Analiza este error: [mensaje].  
Entrega: causa raiz probable, fix minimo, pruebas para evitar regresion."

---

## 4) Reglas de calidad para automatizar sin romper

- No mezclar cambios funcionales grandes con cambios cosmeticos.
- Cada PR debe mapear a una historia HU o deuda tecnica identificada.
- Si hay SQL/RPC nuevo, registrar nombre exacto en `active_context.md`.
- Evitar "magia" de AI: siempre pedir explicacion de por que se hace cada cambio importante.
- Mantener mensajes y microcopy claros para estudiante/docente/admin.

---

## 5) Definition of Ready (DoR) para tickets AI-friendly

Un ticket esta listo para ejecucion AI cuando tiene:
- Rol primario afectado (estudiante/docente/admin).
- Problema concreto y resultado esperado.
- Criterios de aceptacion verificables.
- Alcance tecnico acotado (archivos/modulo/frente).

---

## 6) Definition of Done (DoD) integrada

- Criterios funcionales cumplidos.
- Verificacion tecnica ejecutada.
- Sin errores de lint nuevos en archivos tocados.
- `AI_CONTEXT/active_context.md` actualizado.
- Pendientes o deuda explicitados.

---

## 7) Cadencia semanal recomendada

- **Lunes:** priorizacion y corte de sprint (roadmap + HU).
- **Martes a jueves:** ejecucion en lotes pequenos (AI + humano).
- **Viernes:** demo interna por rol + limpieza de deuda + actualizacion de contexto.

---

## 8) Artefactos base obligatorios

- Roadmap: `AI_CONTEXT/04_FEATURES/ROADMAP_LMS_MVP_6_SEMANAS_2026-04.md`
- Historias: `AI_CONTEXT/04_FEATURES/HISTORIAS_USUARIO_LMS_MVP_2026-04.md`
- Estado vivo: `AI_CONTEXT/active_context.md`
- Control general: `AI_CONTEXT/DESARROLLO_CONTROL.md`

---

## 9) Escalamiento futuro (equipo creciendo)

- Incorporar tablero unico (HU + bugs + deuda) y etiquetar tickets `AI-ready`.
- Definir revisores por frente (web/mobile/sql/desktop).
- Automatizar checklist de PR con validaciones minimas.
- Registrar decisiones de arquitectura en docs cortos (ADR lightweight).
