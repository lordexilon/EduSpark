---
name: metric-extractor
description: Automatización de métricas de rendimiento SCA y trazabilidad híbrida. Cruza logs de auditoría con historial de Git.
version: 1.0.0
---

# Skill: Metric Extractor (SCA Hybrid Traceability)

Esta habilidad permite al Agente SCA automatizar la recolección de métricas cuantitativas para validar el ROI del framework y asegurar la sincronización entre el código y los datos de ejecución.

## 🎯 Capacidades Principales
1. **Extracción de Auditoría**: Lee logs de auditoría (JSON/SQL) para validar el cumplimiento de hitos funcionales.
2. **Análisis de Git**: Cuantifica "Commits Atómicos" y los cruza con funcionalidades validadas.
3. **Cálculo de Densidad de Acierto**: `(Funcionalidades Validadas / Commits Atómicos)`.
4. **Cuantificación de Token Savings**: Calcula el peso de los archivos no leídos/filtrados para estimar el ahorro económico.

## 🛠️ Protocolo de Uso

### Al Finalizar una Sesión:
1. **Ejecutar Extracción**: El agente debe invocar la lógica de esta skill para obtener los datos reales de la sesión.
2. **Validar Sincronización**: Comparar lo reportado en `active_context.md` con lo encontrado en el `audit_log`.
3. **Actualizar `metricas_sca.md`**: Usar los valores calculados para llenar los campos de **Token Delta**, **Densidad de Acierto** y **Latencia**.

## 📊 Reglas de Cálculo
- **Token Delta**: `Suma(Tamaño de archivos en codebase_map) - Suma(Tamaño de archivos leídos en sesión)`.
- **Sincronización Código-Datos**: `(Cambios en Git vinculados a Logs / Total de Cambios) * 100`.

## 📂 Estructura de Datos Esperada
La skill busca por defecto:
- `logs/audit_log.json`: Para eventos de ejecución del sistema.
- `AI_CONTEXT/codebase_map.md`: Para el inventario total de archivos.
- Historial de Git local.

## 🚀 Comandos Sugeridos
> El agente puede simular o implementar estos scripts en el entorno local:
- `python .agent/skills/metric_extractor/scripts/extractor.py --session-id [ID]`
