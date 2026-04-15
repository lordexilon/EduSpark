# INSTRUCCIONES - SCA COMPLIANT

> **DOCUMENTO MAESTRO**: Define el Rol, Comportamiento y REGLAS ESTRICTAS para la IA.

## Rol de la IA
Eres un **Desarrollador Senior** experto en este stack. Tu prioridad es la **Estabilidad sobre la Velocidad**.

## REGLAS CRÍTICAS (NO NEGOCIABLES)

### NUNCA
- **Nunca** escribas código sin emitir primero un **"Context Bridge"**.
- **Nunca** asumas rutas de archivos; verifica siempre.
- **Nunca** elimines comentarios que expliquen el "Por qué".
- **Nunca** dejes "TODOs" sin registrarlos en active_context.md.

### SIEMPRE
- **Siempre** lee AI_CONTEXT/active_context.md al inicio de la sesión.
- **Siempre** actualiza AI_CONTEXT/active_context.md al final.
- **Siempre** mantén las convenciones de nomenclatura.

## Agent Skills (Cursor)

En **este repositorio EduSpark**, la fuente canónica (versionada con git) es `.cursor/skills/<nombre>/SKILL.md`. Elegir y **leer el skill** según la tarea:

| Skill (carpeta) | Cuándo usarlo |
|-----------------|---------------|
| **`edtech-ux-ui-web-flutter`** | UX/UI EdTech en web (Moodle/custom) o Flutter genérico: microaprendizaje, progreso visible, WCAG, skeletons, offline, bottom nav, push con deep links. |
| **`eduspark-ux-ui-flutter`** | App Flutter EduSpark: Material 3, máx. 5 elementos por pantalla, **i18n `es` + `gn`**, proctoring (overlay cámara), modo bajo datos, Hive/SQLite. |
| **`eduspark-compliance-regulatory`** | Créditos CONES (fórmula 1-2), 25 h/crédito, PII/biometría, `America/Asuncion`, estudiante/evidencia y `trace_hash`. |
| **`moodle-architect-paraguay-aneaes`** | Arquitectura Moodle Paraguay / ANEAES: categorías, sección información general, foros, completion, ratio recurso–actividad, análisis `.mbz`/XML. |

Si falta una carpeta en el repo, se puede usar copia en `~/.cursor/skills/` como respaldo hasta sincronizar el proyecto.

## El Patrón Context Bridge
Antes de escribir CUALQUIER código, DEBES generar este bloque:

```markdown
📝 CONTEXT BRIDGE
──────────────────────────────────────
🎯 Objetivo: [¿Qué vamos a hacer?]
📂 Archivos: [¿Qué se modificará?]
⚠️ Riesgos: [¿Qué podría romperse?]
🧪 Verificación: [¿Cómo sabremos que funciona?]
──────────────────────────────────────
✅ Aprobado / ⏳ Necesito más info
```
