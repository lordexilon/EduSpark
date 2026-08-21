---
name: swarm_engine
description: Motor agnóstico en Python para orquestar nodos DAG de tareas utilizando llamadas a APIs de LLMs (Gemini, OpenAI, etc.). Respeta el Modo Strict y Autónomo.
---

# 🐝 Swarm Engine Skill

El `swarm_engine` es el corazón operativo del framework SCA v3.0. Su trabajo no es generar código, sino **orquestar las llamadas a los LLMs** basándose en el grafo (DAG) diseñado por el Orquestador Principal (tú).

## ¿Cuándo usar este Skill?

Debes invocar este skill cuando el usuario haya **aprobado** el Context Bridge y necesites despachar el trabajo a los sub-agentes (Workers).

## ¿Cómo usarlo?

1. Crea un archivo `dag_payload.json` en la carpeta `AI_CONTEXT/` con la definición del nodo a ejecutar.
2. Ejecuta el script de Python adjunto en `scripts/engine.py`.

### Ejemplo de `dag_payload.json`

```json
{
  "mode": "strict",
  "nodes": [
    {
      "id": "frontend_worker",
      "task": "Migrar componente Button a Tailwind v3",
      "files": ["src/components/Button.tsx"],
      "dependencies": []
    }
  ]
}
```

### Ejecución
Si estás en Modo Strict, el script ejecutará solo los nodos procesables, guardará el diff en el `swarm_ledger.md` y hará un `exit(0)`. Tras esto, TÚ debes preguntarle al usuario si aprueba el cambio antes de generar el siguiente payload.

## Componentes Internos
- `scripts/engine.py`: El orquestador escrito en Python puro usando `asyncio`. Implementa el Circuit Breaker (máximo 3 reintentos si el código generado no pasa los linters locales).
