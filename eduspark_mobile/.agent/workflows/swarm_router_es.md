---
name: swarm_router_es
description: Enruta y estructura tareas complejas en un Grafo (DAG) para ejecución por sub-agentes en el paradigma SCA v3.0
---

# 🐝 Swarm Router Protocol (SCA v3.0)

Este flujo de trabajo se activa **SIEMPRE** que el usuario solicite un desarrollo, modificación o refactorización. Sustituye al antiguo flujo lineal.

## Fase 1: Análisis y Diseño del Grafo (DAG)

1. **Lee el Entorno:** 
   Revisa `AI_CONTEXT/active_context.md` y `AI_CONTEXT/memory_schema.md`.
2. **Descompón la Tarea:**
   En lugar de escribir el código tú mismo, divide la solicitud en "Nodos" lógicos. Identifica qué nodos pueden ejecutarse en paralelo y cuáles son secuenciales.
3. **Emite el Context Bridge (Swarm Edition):**
   Presenta el plan al usuario usando este formato:

```markdown
📝 CONTEXT BRIDGE (SWARM EDITION)
──────────────────────────────────────
🎯 Objetivo: [Qué vamos a construir]
📊 Estructura del Grafo (DAG):
   - 🟢 [Nodo 1] (Ej. Frontend UI) -> Archivos: [files]
   - 🟢 [Nodo 2] (Ej. Backend API) -> Archivos: [files]
   - 🔴 [Nodo 3] (Red Team / Review) -> Depende de: Nodo 1 y 2
⚙️ Modo de Autonomía: [STRICT / AUTONOMOUS]
──────────────────────────────────────
✅ Aprobado / ⏳ Necesito modificar el grafo
```

## Fase 2: Ejecución del Enjambre

Una vez que el usuario aprueba el Context Bridge:

### Si el Modo es STRICT (Human-in-the-Loop):
1. **Ejecuta el Nodo Actual:** Usa tus capacidades (o el `swarm_engine` si está configurado) para procesar ÚNICAMENTE el primer nodo.
2. **Pausa y Retorna Control:** Muestra los diffs generados al usuario.
3. **Espera:** No avances al siguiente nodo hasta recibir un mensaje de validación del humano (ej. "Aprobado, sigue con Backend").

### Si el Modo es AUTONOMOUS (Piloto Automático):
1. Dispara todos los nodos independientes en paralelo.
2. Ejecuta los nodos dependientes secuencialmente.
3. Consolida todo sin pausar.

## Fase 3: Cierre y Ledger

1. **Actualiza la Memoria:** Escribe los resultados de los nodos completados en `AI_CONTEXT/swarm_ledger.md`.
2. **Actualiza Contexto Activo:** Modifica `AI_CONTEXT/active_context.md` para reflejar el nuevo estado de la arquitectura.
3. **Métricas:** Registra la sesión en `metricas_sca.md`, anotando los "Sub-Agentes Invocados" y la "Tolerancia a Fallos".
