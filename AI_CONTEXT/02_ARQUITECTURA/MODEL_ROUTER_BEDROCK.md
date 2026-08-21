# 🧠 CoreSpark — Model Router (Bedrock + Ollama + Presupuesto)

**Fecha:** 2026-08-19
**Versión:** 1.0.0 (SCA v3.0 - Swarm Edition)
**Estado:** Diseño Aprobado

---

## 1. Propósito

Seleccionar **el mejor modelo por prestancia y costo** para cada petición. El router es
una pieza del **CoreSpark** (el core multipropósito), no de ninguna especialización.
Las especializaciones (**EduSpark**, **BusinessSpark**, …) lo **consumen**; ninguna lo posee.

### Problema que resuelve
- Hoy el gateway llama siempre a DashScope (`qwen-plus`) sin importar la complejidad.
- No se chequea presupuesto (`check_tutor_cost_limit`) ni se registra consumo (`track_tutor_interaction_cost`).
- No hay degradación elegante: si el proveedor falla, la petición muere.

### Meta
1. **Amazon Bedrock** como proveedor productivo (Claude Sonnet/Haiku).
2. **Ollama local** para pruebas básicas y costo $0.
3. **Qwen (DashScope)** como fallback cloud existente.
4. Selección **determinística y auditable** por complejidad + presupuesto + capacidades.

---

## 2. Matriz de Modelos (data-driven)

El router NO hardcodea modelos. Lee de la tabla `public.model_registry` (ver
`sql_scripts/6_gateway/202_create_model_registry.sql`), por lo que se puede
rebalancear sin tocar código.

| Tier | Modelo | Proveedor | Uso | Costo (USD/1M tok, in/out) |
|------|--------|-----------|-----|------------------------------|
| `local` | `qwen3.5:4b` / `llama3.2:3b` | Ollama | Dev, pruebas, FAQs triviales | $0 |
| `economy` | Claude 3.5 Haiku | Bedrock | Consultas simples, clasificación, resúmenes cortos | ~$0.80 / $4.00 |
| `premium` | Claude 3.5 Sonnet | Bedrock | RAG profundo, agentes con tool-calling, razonamiento | ~$3.00 / $15.00 |
| `fallback` | `qwen-plus` | DashScope | Respaldo si Bedrock no responde | variable |

> Los precios son referencia; el valor real vive en `model_registry` y se usa para
> el cálculo de presupuesto, no en el código.

---

## 3. Árbol de Decisión (determinístico y explicable)

```
recibir(userQuery, tools, budgetState)
  │
  ├─ 1. tools presentes?  ────SÍ──▶ premium.tool_calling (Sonnet)
  │                              └─ si presupuesto insuficiente ─▶ economy.tool_calling
  │                                   └─ si tampoco ─▶ 429 limit_exceeded
  │
  ├─ 2. presupuesto mensual agotado? ──SÍ──▶ local (costo $0)
  │                              └─ si local no disponible ─▶ 429
  │
  ├─ 3. query simple (≤N tokens, sin razonamiento)? ──SÍ──▶ economy (Haiku)
  │
  └─ 4. default ─▶ premium (Sonnet)
  │
  └─ FALLBACK: si el proveedor elegido falla (5xx/timeout)
                ─▶ siguiente tier habilitado en orden:
                   premium → economy → fallback → local
```

Cada decisión se registra en `metadata.model_routing` de la respuesta para auditoría.

---

## 4. Integración con Presupuesto ($50/mes por tenant)

Usa las funciones ya existentes en Supabase (NO se reimplementan):

1. **Antes de generar** — estimar costo del modelo elegido y verificar:
   ```sql
   SELECT * FROM check_tutor_cost_limit(p_user_id, p_estimated_cost);
   ```
   Si `allowed = false` → degradar a tier inferior o responder `429`.

2. **Después de generar** — registrar consumo real:
   ```sql
   SELECT track_tutor_interaction_cost(p_user_id, p_cost, p_tokens_used);
   ```

El costo estimado se calcula con los precios de `model_registry` (tokens estimados
por longitud de entrada + `max_output_tokens`).

---

## 5. Contratos de Proveedores (adaptadores)

### 5.1 Amazon Bedrock (Converse API)
- Endpoint: `https://bedrock-runtime.{region}.amazonaws.com/model/{model_id}/converse`
- Auth: AWS Signature V4 (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`).
- Streaming: Converse API con `responseStream` para SSE.
- Modelos de referencia:
  - `us.anthropic.claude-3-5-sonnet-20241022-v2:0` (premium, tools+vision)
  - `us.anthropic.claude-3-5-haiku-20241022-v1:0` (economy)

### 5.2 Ollama (local)
- Endpoint: `http://host.docker.internal:11434/v1/chat/completions` (OpenAI-compatible).
- Modelos: los definidos en `model_registry` (`qwen3.5:4b`, `llama3.2:3b`).

### 5.3 Qwen / DashScope (fallback cloud)
- Endpoint actual: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions`.
- Se conserva como tier de fallback; ya está integrado en el gateway.

---

## 6. Ubicación en el código

```
supabase/functions/
├── _shared/
│   ├── modelRouter.ts        ← CoreSpark: lógica de selección + clasificación (NUEVO)
│   └── modelRegistry.ts      ← CoreSpark: carga/cache de model_registry (NUEVO)
├── corespark-gateway/        ← CoreSpark: auth, keys, RLS, $, routing (a crear)
│   └── index.ts
├── eduspark-gateway/         ← EduSpark (especialización): tutor RAG, analytics, compliance
│   └── index.ts              ← consume modelRouter de CoreSpark (refactor pendiente)
└── ...
```

El router es **independiente de la especialización**: EduSpark (tutor), BusinessSpark
(asesor de inversión) y futuras lo consumen igual, cambiando solo el system prompt y
las fuentes RAG.

> **Corrección de modelo (2026-08-19):** `eduspark-gateway` es hoy un híbrido que mezcla
> responsabilidades de CoreSpark (keys, llamada a modelo, presupuesto) con las de la
> especialización EduSpark (tutor/RAG, analytics, compliance). El refactor correcto
> separa ambas capas: CoreSpark expone el gateway genérico + model router; EduSpark
> queda como especialización que lo consume.

---

## 7. Próximos pasos

- [ ] Crear tabla `model_registry` + seed (SQL 202).
- [ ] Implementar `_shared/modelRouter.ts` y `_shared/modelRegistry.ts`.
- [ ] Crear `corespark-gateway` (core) y migrar auth/keys/$/router a él.
- [ ] Refactorizar `eduspark-gateway` para que consuma el router del core.
- [ ] Configurar credenciales AWS Bedrock en `edge_runtime.env`.
- [ ] Probar E2E: routing por complejidad + fallback + tracking de costo.
