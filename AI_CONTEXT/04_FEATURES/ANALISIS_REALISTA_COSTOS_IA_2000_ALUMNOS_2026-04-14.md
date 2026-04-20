# Analisis realista de costos IA (2000 alumnos)

Fecha: 2026-04-14  
Estado: Preparado para operacion y seguimiento mensual  
**Etapa 2:** Scripts `180` y `181` ejecutados en Supabase (SQL Editor), 2026-04-14. **Salida `181` archivada** en seccion «Resultado snapshot» (probable ~20,45 USD; alto ~37,76 USD).

## Contexto

Este analisis usa dos fuentes:

1. Metricas operativas actuales de EduSpark (dashboard de consumo IA).
2. Referencia academica de uso en asistentes LLM:
   - 4.5 a 6 consultas por sesion.
   - 2,500 a 3,500 tokens por consulta en arquitecturas RAG.

## Supuestos base para proyeccion

- Poblacion total: 2000 alumnos.
- Operacion academica: lunes a sabado (~26 dias/mes).
- Costo efectivo de tokens: rango practico de 0.12 a 0.15 USD por 1M tokens (dependiendo mezcla input/output).
- El uso real se modela por "activos diarios" y "consultas por sesion".

## Escenarios mensuales

### 1) Conservador
- Activos: 40% (800 alumnos)
- Sesiones por semana: 2
- Consultas por sesion: 5
- Tokens por consulta: 3000
- Resultado: ~104M tokens/mes
- Costo: ~12.5 a 15.6 USD/mes

### 2) Probable (base operativa)
- Activos: 60% (1200 alumnos)
- Sesiones por semana: 2.5
- Consultas por sesion: 5.2
- Tokens por consulta: 3000
- Resultado: ~203M tokens/mes
- Costo: ~24.3 a 30.5 USD/mes

### 3) Alta demanda (epoca de examenes)
- Activos: 80% (1600 alumnos)
- Sesiones por semana: 3
- Consultas por sesion: 6
- Tokens por consulta: 3500
- Resultado: ~436M tokens/mes
- Costo: ~52.4 a 65.5 USD/mes

## Interpretacion operativa

- El limite de 50 USD/mes es adecuado para operacion normal.
- En picos academicos puede superarse.
- Recomendacion: semaforo de control
  - Verde: < 35 USD
  - Amarillo: 35 a 50 USD
  - Rojo: > 50 USD

## Preparacion tecnica

Se adjunta script de diagnostico/forecast:

- `sql_scripts/4_diagnostics/180_forecast_consumo_ai_real.sql`

Objetivo del script:
- Calcular metricas de uso reales (30 dias).
- Obtener costo/solicitud y tokens/solicitud observados.
- Estimar costo mensual para escenarios conservador/probable/alto.

Script complementario (misma base + presupuesto):

- `sql_scripts/4_diagnostics/181_forecast_vs_presupuesto_50usd.sql` — anade `budget_month_usd` (50), `pct_of_budget` y `semaforo` (`verde` si costo estimado menor que 70% del tope, `amarillo` hasta el tope, `rojo` por encima). Ajustar `p_budget_month_usd` en el CTE `params` si el limite cambia en BD (`tutor_cost_limits`).

## Etapa 2: Ejecucion en Supabase y seguimiento

**Estado 2026-04-14:** `180_forecast_consumo_ai_real.sql` y `181_forecast_vs_presupuesto_50usd.sql` ya se ejecutaron en el SQL Editor de Supabase.

1. En corridas futuras (mensual o ante picos de uso), ejecutar de nuevo `180` y comprobar que el volumen de `ai_usage_tracking` en los ultimos 30 dias sea suficiente; si no hay solicitudes, los ratios seran 0 y el forecast no sera representativo hasta haya trafico real.
2. Ejecutar `181` y registrar en reunion operativa el escenario **probable** con `semaforo` y `pct_of_budget` (valores de referencia 2026-04-14 en «Resultado snapshot»).
3. Cruzar con dashboard web `/admin/processing-costs` (costo acumulado y por usuario) y con RPC `get_user_cost_stats` / tabla `tutor_cost_tracking` segun `112_control_presupuesto_50usd_mensual.sql`.
4. Si `semaforo` = `rojo` en escenario probable o alto, planificar: reduccion de consultas por sesion via producto (limites por sesion), cache/RAG, o revision del limite mensual institucional.

## Resultado snapshot `181` (Supabase, 2026-04-14)

Ratios observados en los ultimos 30 dias (tabla `ai_usage_tracking`), usados por el script: **~3354 tokens por solicitud**, **~0,0902 USD por 1M tokens**, **~0,000303 USD por solicitud**.

Presupuesto de referencia en la consulta: **50 USD/mes**.

| Escenario | Solicitudes/mes est. | Tokens/mes est. | Costo mes est. (USD) | % de 50 USD | Semaforo |
|-----------|----------------------|-----------------|----------------------|-------------|----------|
| conservador | 34 667 | ~116,3 M | 10,49 | 21,0% | verde |
| probable | 67 600 | ~226,7 M | 20,45 | 40,9% | verde |
| alto | 124 800 | ~418,6 M | 37,76 | 75,5% | amarillo |

**Lectura:** Con la mezcla y precio efectivo actuales, el escenario **probable** queda **por debajo del 50% del tope** (~20 USD/mes). El escenario **alto** entra en **amarillo** (cerca del techo operativo) pero **sigue por debajo de 50 USD** en esta proyeccion. Conviene repetir el `181` cuando cambie el volumen de uso o la mezcla de modelos, porque `tokens_per_request_real` y `cost_per_million_tokens_real` dependen del historico reciente.

