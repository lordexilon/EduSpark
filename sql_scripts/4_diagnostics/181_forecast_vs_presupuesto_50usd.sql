-- =====================================================
-- 181_forecast_vs_presupuesto_50usd.sql
-- Misma logica que 180 + comparacion vs presupuesto mensual (tutor / control costos)
-- =====================================================

WITH params AS (
  SELECT
    2000::numeric AS p_total_students,
    26::numeric AS p_days_per_month,
    50::numeric AS p_budget_month_usd
),
last_30d AS (
  SELECT
    COUNT(*)::numeric AS requests_30d,
    COALESCE(SUM(total_tokens), 0)::numeric AS tokens_30d,
    COALESCE(SUM(total_cost), 0)::numeric AS cost_30d
  FROM ai_usage_tracking
  WHERE created_at >= (NOW() - INTERVAL '30 days')
),
ratios AS (
  SELECT
    requests_30d,
    tokens_30d,
    cost_30d,
    CASE WHEN requests_30d > 0 THEN tokens_30d / requests_30d ELSE 0 END AS tokens_per_request_real,
    CASE WHEN requests_30d > 0 THEN cost_30d / requests_30d ELSE 0 END AS cost_per_request_real,
    CASE WHEN tokens_30d > 0 THEN (cost_30d / tokens_30d) * 1000000 ELSE 0 END AS cost_per_million_tokens_real
  FROM last_30d
),
scenarios AS (
  SELECT
    'conservador'::text AS scenario,
    0.40::numeric AS dau_ratio,
    2.0::numeric AS sessions_per_week,
    5.0::numeric AS requests_per_session
  UNION ALL
  SELECT
    'probable'::text,
    0.60::numeric,
    2.5::numeric,
    5.2::numeric
  UNION ALL
  SELECT
    'alto'::text,
    0.80::numeric,
    3.0::numeric,
    6.0::numeric
),
calc AS (
  SELECT
    s.scenario,
    p.p_total_students,
    p.p_days_per_month,
    p.p_budget_month_usd,
    s.dau_ratio,
    s.sessions_per_week,
    s.requests_per_session,
    (p.p_total_students * s.dau_ratio) AS active_students_daily,
    (s.sessions_per_week / 6.0) AS sessions_per_day_per_active,
    (p.p_total_students * s.dau_ratio) * (s.sessions_per_week / 6.0) * s.requests_per_session * p.p_days_per_month AS requests_month_est,
    r.tokens_per_request_real,
    r.cost_per_request_real,
    r.cost_per_million_tokens_real,
    (p.p_total_students * s.dau_ratio) * (s.sessions_per_week / 6.0) * s.requests_per_session * p.p_days_per_month * r.cost_per_request_real AS cost_month_est_usd
  FROM scenarios s
  CROSS JOIN params p
  CROSS JOIN ratios r
)
SELECT
  scenario,
  ROUND(p_budget_month_usd, 0) AS budget_month_usd,
  ROUND(active_students_daily, 0) AS active_students_daily,
  ROUND(requests_month_est, 0) AS requests_month_est,
  ROUND(tokens_per_request_real, 2) AS tokens_per_request_real,
  ROUND(requests_month_est * tokens_per_request_real, 0) AS tokens_month_est,
  ROUND(cost_per_request_real, 6) AS cost_per_request_real,
  ROUND(cost_month_est_usd, 2) AS cost_month_est_usd,
  ROUND((cost_month_est_usd / NULLIF(p_budget_month_usd, 0)) * 100, 1) AS pct_of_budget,
  CASE
    WHEN cost_month_est_usd < (p_budget_month_usd * 0.70) THEN 'verde'
    WHEN cost_month_est_usd <= p_budget_month_usd THEN 'amarillo'
    ELSE 'rojo'
  END AS semaforo,
  ROUND(cost_per_million_tokens_real, 4) AS cost_per_million_tokens_real
FROM calc
ORDER BY
  CASE scenario
    WHEN 'conservador' THEN 1
    WHEN 'probable' THEN 2
    WHEN 'alto' THEN 3
    ELSE 99
  END;
