---
description: Migra un proyecto SCA existente a la versión 2.6 (Gatekeeper Edition)
---

# Flujo de Trabajo: Upgrade de Framework SCA (v2.6) 🚀

> **Propósito:** Actualizar la infraestructura cognitiva a v2.6, activando el Protocolo Gatekeeper y telemetría avanzada.

---

## Fase 1: 🛡️ Preparación y Respaldo

### 1.1 Ejecutar Script de Migración
```text
// turbo
Ejecutar el script de actualización desde la raíz:
python upgrade.py
```

## Fase 2: 🔍 Verificación de Estructura

### 2.1 Validar Nuevos Campos en Métricas
Comprobar que `AI_CONTEXT/metricas_sca.md` ahora incluye:
- Tabla de **Latencia de Desarrollo**.
- Campos de **Token Delta** y **Densidad de Acierto**.

### 2.2 Validar Instrucciones Maestras
Revisar que `AI_CONTEXT/instructions.md` incluya la regla de **Auditoría de Log de Sistema**.

## Fase 3: 🛠️ Inicialización de Telemetría

### 3.1 Activar Skill de Extracción
```text
// turbo
Probar la nueva skill de telemetría:
python .agent/skills/metric_extractor/scripts/extractor.py
```

### 3.2 Sincronización Inicial
Actualizar `active_context.md` con el estado "Migrado a v2.6 - Gatekeeper Edition".

## Fase 4: ✅ Reporte de Upgrade

### 4.1 Emitir Context Bridge de Migración
```markdown
📝 UPGRADE DE FRAMEWORK SCA COMPLETO
──────────────────────────────────────
📦 Versión Anterior: v2.5
🚀 Nueva Versión: v2.6 (Gatekeeper Edition)
📁 Backup Creado: [Ruta del backup]
🛡️ Protocolo: Gatekeeper Activado (/sca_dev_flow)
──────────────────────────────────────
Estado: ✅ v2.6 Activo
```
