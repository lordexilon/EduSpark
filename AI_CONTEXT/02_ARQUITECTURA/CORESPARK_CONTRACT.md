# 🏗️ Contrato CoreSpark — Core vs. Especializaciones

**Fecha:** 2026-08-19
**Versión:** 1.0.0 (SCA v3.0 - Swarm Edition)
**Estado:** Aprobado

---

## 1. Convención de nombres

| Componente | Rol |
|-----------|-----|
| **CoreSpark** | Core multipropósito. No tiene dominio propio: provee infraestructura de IA reutilizable. |
| **EduSpark** | Especialización de educación (tutor RAG, analítica de deserción, compliance ANEAES). |
| **BusinessSpark** | Especialización de inversión (asesor inmobiliario/financiero, data rooms). |
| **`<nombre> + Spark`** | Regla para toda especialización futura. |

Toda especialización **consume** CoreSpark por módulos compartidos (`_shared/`) y/o por su gateway. Ninguna posee ni reimplementa el core.

---

## 2. Límite de responsabilidades

### 2.1 CoreSpark (core — genérico, sin dominio)

| Responsabilidad | Ubicación |
|-----------------|-----------|
| Autenticación y validación de API keys | `_shared/auth.ts` (por extraer) |
| Selección de modelo (prestancia + costo) | `_shared/modelRouter.ts` ✅ |
| Registro de modelos y precios | `model_registry` (Supabase) ✅ |
| Presupuesto por tenant ($/mes, $/día) | `check_tutor_cost_limit` / `track_tutor_interaction_cost` ✅ |
| Gateway genérico OpenAI-compatible | `corespark-gateway/` (nuevo) |
| Memoria de sesión, RAG genérico, MCP tools | futuro (`_shared/`) |

**Endpoints del Core (corespark-gateway):**
```
POST /chat/completions      → chat genérico (OpenAI-compatible, sin RAG)
GET  /models                → discovery de modelos habilitados
GET  /health                → health check
```

### 2.2 Especialización (dominio — consume el core)

| Especialización | Responsabilidades propias |
|-----------------|---------------------------|
| **EduSpark** | Tutor RAG (system prompt + `course_content_chunks`), `/analytics/dropout-risk`, `/compliance/aneaes-audit` |
| **BusinessSpark** | Asesor de inversión (system prompt + data rooms), búsqueda web, scraping |

Las especializaciones **añaden contexto de dominio** (RAG, prompts, herramientas) y delegan la **ejecución del modelo** al router del core.

---

## 3. Modelo de interacción

```
LibreChat / Cliente
        │  OpenAI-compatible (chat/completions)
        ▼
┌─────────────────────────────┐
│  corespark-gateway (Core)   │  auth → router → presupuesto → dispatch
└─────────────────────────────┘
        │  (módulos _shared/)
        ├── modelRouter.ts   (selección + dispatch + fallback)
        ├── auth.ts          (por extraer: validate_api_key)
        └── (futuro) memory.ts, rag.ts
        ▲
┌───────┴─────────────────────┐
│  eduspark-gateway (EduSpark)│  RAG tutor + system prompt + analytics + compliance
└─────────────────────────────┘   → importa _shared/modelRouter.ts (ya consume el core)
```

Dos modos de consumo:
1. **Directo (módulo):** la especialización importa `_shared/modelRouter.ts` y construye su propio system prompt + RAG (caso EduSpark, ya implementado en Paso 1).
2. **HTTP:** la especialización llama a `corespark-gateway` para chat genérico sin RAG.

---

## 4. Por qué NO una sola función monolítica

El actual `eduspark-gateway` mezcla core (keys, router, presupuesto) con dominio (tutor/RAG, analytics, compliance). Separar en `corespark-gateway` (core) + `eduspark-gateway` (especialización) permite:

1. Añadir especializaciones sin tocar el core.
2. Versionar/deployar el core independientemente de cada dominio.
3. Rebalancear modelos/presupuesto desde un solo lugar (`model_registry`).
4. Probar el core de forma aislada.

---

## 5. Plan de extracción (incremental)

| Fase | Acción | Riesgo |
|------|--------|--------|
| **3b** | Crear `corespark-gateway` (auth + router + /models + /chat/completions) | Bajo (función nueva) |
| **3d** | Extraer `auth.ts` a `_shared/` y que ambos gateways lo importen | Medio |
| **3e** | Refactorizar `eduspark-gateway` para delegar auth a `_shared/` | Medio |
| — | Memoria, RAG genérico, MCP al core | Alto (futuro) |

> El Paso 1 ya hizo que `eduspark-gateway` consuma `modelRouter.ts`; queda extraer el resto de piezas core (auth/keys) a `_shared/` para que `corespark-gateway` y `eduspark-gateway` compartan una sola implementación.
