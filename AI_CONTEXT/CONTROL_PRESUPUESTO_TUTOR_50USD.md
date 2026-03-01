# Control de Presupuesto: Máximo $50/mes para Tutor

**Fecha:** Enero 2026

---

## 🎯 Objetivo

Implementar un sistema de control de presupuesto que limite el costo mensual del tutor a **$50 USD**, complementando el límite actual de 180 minutos diarios.

---

## 📊 Análisis de Costos Actuales

### Costo por Interacción del Tutor:

**Componentes:**
1. **Embedding de consulta:** ~500 tokens = $0.0000125
2. **Prompt RAG:** ~2000 tokens (input) = $0.00015
3. **Respuesta del tutor:** ~300 tokens (output) = $0.00009
4. **Calificación automática (opcional):** ~950 tokens = $0.00036

**Total por interacción:**
- **Sin calificación automática:** ~$0.0002525
- **Con calificación automática:** ~$0.0006125

### Cálculo de Capacidad con $50/mes:

**Sin calificación automática:**
- $50 / $0.0002525 = **~198,000 interacciones/mes**
- Por día: 198,000 / 30 = **~6,600 interacciones/día**

**Con calificación automática:**
- $50 / $0.0006125 = **~81,600 interacciones/mes**
- Por día: 81,600 / 30 = **~2,720 interacciones/día**

**Escenario Realista (100 interacciones/día):**
- Costo diario: 100 * $0.0002525 = $0.02525
- Costo mensual: $0.02525 * 30 = **~$0.76/mes**
- **Muy por debajo del límite de $50/mes**

---

## 🔍 Límite Actual: 180 Minutos Diarios

**Análisis:**
- 180 minutos = 3 horas diarias
- Si cada interacción toma ~2 minutos (lectura + respuesta):
  - 180 / 2 = **~90 interacciones/día máximo**
- Costo diario: 90 * $0.0002525 = **~$0.023/día**
- Costo mensual: $0.023 * 30 = **~$0.69/mes**

**Conclusión:** El límite de tiempo (180 min/día) ya controla efectivamente el presupuesto.

---

## 💡 Propuesta: Sistema de Control de Presupuesto

### Opción 1: Control por Costo Acumulado (Recomendado)

**Implementación:**
1. **Tracking diario y mensual de costos:**
   - Tabla: `tutor_cost_tracking`
   - Campos: `user_id`, `date`, `daily_cost`, `monthly_cost`, `total_interactions`

2. **Verificación antes de cada interacción:**
   - Calcular costo estimado de la interacción
   - Verificar: `current_monthly_cost + estimated_cost <= $50`
   - Si excede, bloquear interacción

3. **Límites configurables:**
   - Por usuario: límite personalizado
   - Por institución: límite global
   - Por defecto: $50/mes

### Opción 2: Control Híbrido (Tiempo + Costo)

**Implementación:**
1. Mantener límite de tiempo (180 min/día)
2. Agregar límite de costo mensual ($50/mes)
3. Bloquear cuando se alcance cualquiera de los dos

**Ventajas:**
- Control doble (tiempo y costo)
- Más flexible
- Protege contra picos de costo

---

## 📋 Esquema de Base de Datos Propuesto

```sql
-- Tabla para tracking de costos del tutor
CREATE TABLE IF NOT EXISTS tutor_cost_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
    tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    daily_cost NUMERIC(10, 6) DEFAULT 0,
    monthly_cost NUMERIC(10, 6) DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tracking_date)
);

-- Tabla para límites de costo
CREATE TABLE IF NOT EXISTS tutor_cost_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
    daily_cost_limit NUMERIC(10, 2) DEFAULT 2.00, -- $2/día = ~$60/mes
    monthly_cost_limit NUMERIC(10, 2) DEFAULT 50.00, -- $50/mes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_tutor_cost_user_date ON tutor_cost_tracking(user_id, tracking_date);
CREATE INDEX idx_tutor_cost_institution_date ON tutor_cost_tracking(institution_id, tracking_date);
CREATE INDEX idx_tutor_cost_limits_user ON tutor_cost_limits(user_id);
CREATE INDEX idx_tutor_cost_limits_institution ON tutor_cost_limits(institution_id);
```

---

## 🔧 Funciones SQL Propuestas

### 1. Verificar Límite de Costo

```sql
CREATE OR REPLACE FUNCTION check_tutor_cost_limit(
    p_user_id UUID,
    p_estimated_cost NUMERIC
)
RETURNS TABLE (
    allowed BOOLEAN,
    current_monthly_cost NUMERIC,
    remaining_budget NUMERIC,
    limit_exceeded BOOLEAN
) AS $$
DECLARE
    v_monthly_limit NUMERIC;
    v_current_monthly_cost NUMERIC;
    v_remaining NUMERIC;
BEGIN
    -- Obtener límite mensual (usuario > institución > default)
    SELECT COALESCE(
        (SELECT monthly_cost_limit FROM tutor_cost_limits WHERE user_id = p_user_id AND is_active = true),
        (SELECT monthly_cost_limit FROM tutor_cost_limits 
         WHERE institution_id = (SELECT institution_id FROM users WHERE id = p_user_id) 
         AND is_active = true),
        50.00 -- Default: $50/mes
    ) INTO v_monthly_limit;

    -- Calcular costo mensual actual
    SELECT COALESCE(SUM(monthly_cost), 0)
    FROM tutor_cost_tracking
    WHERE user_id = p_user_id
      AND DATE_TRUNC('month', tracking_date) = DATE_TRUNC('month', CURRENT_DATE)
    INTO v_current_monthly_cost;

    v_remaining := v_monthly_limit - v_current_monthly_cost;
    
    RETURN QUERY SELECT
        (v_remaining >= p_estimated_cost) as allowed,
        v_current_monthly_cost,
        v_remaining,
        (v_remaining < p_estimated_cost) as limit_exceeded;
END;
$$ LANGUAGE plpgsql;
```

### 2. Registrar Costo de Interacción

```sql
CREATE OR REPLACE FUNCTION track_tutor_interaction_cost(
    p_user_id UUID,
    p_cost NUMERIC,
    p_tokens_used INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_institution_id INTEGER;
BEGIN
    -- Obtener institución del usuario
    SELECT institution_id INTO v_institution_id
    FROM users WHERE id = p_user_id;

    -- Calcular costo mensual acumulado
    INSERT INTO tutor_cost_tracking (
        user_id,
        institution_id,
        tracking_date,
        daily_cost,
        monthly_cost,
        total_interactions,
        total_tokens_used
    )
    VALUES (
        p_user_id,
        v_institution_id,
        v_today,
        p_cost,
        p_cost, -- Se actualizará con función de agregación
        1,
        p_tokens_used
    )
    ON CONFLICT (user_id, tracking_date) DO UPDATE SET
        daily_cost = tutor_cost_tracking.daily_cost + p_cost,
        monthly_cost = tutor_cost_tracking.monthly_cost + p_cost,
        total_interactions = tutor_cost_tracking.total_interactions + 1,
        total_tokens_used = tutor_cost_tracking.total_tokens_used + p_tokens_used,
        updated_at = CURRENT_TIMESTAMP;

    -- Actualizar costo mensual acumulado
    UPDATE tutor_cost_tracking
    SET monthly_cost = (
        SELECT SUM(daily_cost)
        FROM tutor_cost_tracking
        WHERE user_id = p_user_id
          AND DATE_TRUNC('month', tracking_date) = DATE_TRUNC('month', v_today)
    )
    WHERE user_id = p_user_id
      AND DATE_TRUNC('month', tracking_date) = DATE_TRUNC('month', v_today);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## 🚀 Implementación en el Frontend

### Servicio: `tutorCostService.ts`

```typescript
// Verificar límite antes de interacción
async checkCostLimit(userId: string, estimatedCost: number): Promise<{
  allowed: boolean;
  currentMonthlyCost: number;
  remainingBudget: number;
  limitExceeded: boolean;
}>

// Registrar costo después de interacción
async trackInteractionCost(
  userId: string,
  cost: number,
  tokensUsed: number
): Promise<boolean>

// Obtener estadísticas de costo
async getCostStats(userId: string): Promise<{
  dailyCost: number;
  monthlyCost: number;
  dailyLimit: number;
  monthlyLimit: number;
  remainingBudget: number;
}>
```

### Integración en `TutorVirtualPage.tsx`

1. **Antes de enviar mensaje:**
   - Verificar límite de costo
   - Si excede, mostrar mensaje de advertencia
   - Bloquear envío si es necesario

2. **Después de recibir respuesta:**
   - Registrar costo real de la interacción
   - Actualizar estadísticas

3. **Mostrar indicador de presupuesto:**
   - Barra de progreso: `$X.XX / $50.00`
   - Advertencia cuando quede < 10% del presupuesto

---

## 📊 Dashboard de Monitoreo

### Para Administradores:

1. **Vista global de costos:**
   - Costo total mensual del sistema
   - Top usuarios por costo
   - Proyección de fin de mes

2. **Alertas:**
   - Cuando un usuario alcance 80% del límite
   - Cuando el sistema alcance 90% del presupuesto global

---

## ✅ Recomendación Final

**Implementar Control Híbrido:**
1. ✅ Mantener límite de tiempo (180 min/día) - ya funciona
2. ✅ Agregar límite de costo mensual ($50/mes) - como respaldo
3. ✅ Bloquear cuando se alcance cualquiera de los dos

**Prioridad:**
- **Alta:** El límite de tiempo ya controla efectivamente el presupuesto
- **Media:** Agregar tracking de costos para monitoreo
- **Baja:** Bloqueo automático por costo (solo si hay picos inesperados)

---

**Última actualización:** Enero 2026
