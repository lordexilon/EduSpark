# Guía: Cron Jobs Nativos en Supabase

## ✅ Respuesta Rápida

**SÍ, puedes hacer cron directamente en Supabase sin Google Cloud.**

Supabase tiene soporte nativo para cron jobs usando:
- **`pg_cron`** - Extensión PostgreSQL para programar tareas
- **`pg_net`** - Extensión PostgreSQL para hacer llamadas HTTP

**NO necesitas:**
- ❌ Google Cloud Scheduler
- ❌ Servidores externos
- ❌ Código adicional

---

## 🚀 Cómo Funciona

1. **`pg_cron`** programa la ejecución (usando sintaxis cron estándar)
2. **`pg_net`** hace una llamada HTTP POST a tu Edge Function
3. La Edge Function se ejecuta y procesa las respuestas

---

## 📋 Pasos para Configurar

### 1. Desplegar Edge Function (si no lo has hecho)

```bash
supabase functions deploy process-feedback
```

### 2. Ejecutar SQL para Configurar Cron

Ejecuta el script SQL: `sql_scripts/3_tutor_rag/111_setup_cron_process_feedback.sql`

**IMPORTANTE:** Antes de ejecutar, actualiza estos valores:
- Reemplaza la URL con tu PROJECT_REF si es diferente
- Reemplaza el ANON_KEY con tu clave real

### 3. Verificar que el Cron Job está Activo

```sql
-- Ver jobs programados
SELECT 
    jobid,
    schedule,
    jobname,
    active
FROM cron.job
WHERE jobname = 'process-feedback-daily';
```

### 4. Ver Historial de Ejecuciones

```sql
-- Ver últimas ejecuciones
SELECT 
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-feedback-daily')
ORDER BY start_time DESC
LIMIT 10;
```

---

## ⏰ Ejemplos de Frecuencias

```sql
-- Diario a las 2:00 AM UTC
'0 2 * * *'

-- Cada 6 horas
'0 */6 * * *'

-- Cada hora
'0 * * * *'

-- Cada 30 minutos
'*/30 * * * *'

-- Cada lunes a las 2:00 AM
'0 2 * * 1'

-- Cada día a las 3:00 AM UTC
'0 3 * * *'
```

---

## 🔧 Gestión del Cron Job

### Deshabilitar Temporalmente

```sql
SELECT cron.unschedule('process-feedback-daily');
```

### Cambiar Frecuencia

```sql
-- 1. Eliminar el job existente
SELECT cron.unschedule('process-feedback-daily');

-- 2. Crear nuevo con diferente frecuencia
SELECT cron.schedule(
    'process-feedback-daily',
    '0 */6 * * *',  -- Nueva frecuencia: cada 6 horas
    $$ ... $$
);
```

---

## ⚠️ Consideraciones Importantes

### 1. Timezone
- Los cron jobs en Supabase usan **UTC** por defecto
- Si quieres ejecutar a las 2 AM hora local, calcula el offset UTC

**Ejemplo:**
- Uruguay (UTC-3): 2 AM local = 5 AM UTC
- México (UTC-6): 2 AM local = 8 AM UTC

### 2. Límites
- Los cron jobs tienen límites de tiempo de ejecución
- Verifica que tu Edge Function no tarde demasiado

### 3. Logs
- Revisa `cron.job_run_details` para ver errores
- También puedes revisar logs de Edge Functions en Supabase Dashboard

### 4. Variables de Entorno
- Asegúrate de configurar las variables de entorno de la Edge Function:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`

---

## 📊 Monitoreo

### Verificar que Funciona

```sql
-- Ver última ejecución exitosa
SELECT 
    start_time,
    end_time,
    status,
    return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-feedback-daily')
ORDER BY start_time DESC
LIMIT 1;
```

### Verificar Resultados del Procesamiento

```sql
-- Ver respuestas procesadas recientemente
SELECT 
    processed_at,
    status,
    COUNT(*) as total
FROM tutor_general_knowledge_responses
WHERE processed_at >= NOW() - INTERVAL '24 hours'
GROUP BY processed_at, status
ORDER BY processed_at DESC;
```

---

## 🆚 Comparación: Cron Nativo vs Google Cloud Scheduler

| Característica | Cron Nativo (pg_cron) | Google Cloud Scheduler |
|----------------|----------------------|------------------------|
| **Costo** | ✅ Incluido en Supabase | ⚠️ Gratis hasta límite, luego pago |
| **Configuración** | ✅ SQL simple | ⚠️ Requiere cuenta Google Cloud |
| **Dependencias** | ✅ Solo Supabase | ⚠️ Requiere Google Cloud |
| **Monitoreo** | ✅ Tablas SQL | ⚠️ Google Cloud Console |
| **Timezone** | ⚠️ Solo UTC | ✅ Configurable |
| **Limites** | ⚠️ Límites de pg_cron | ✅ Más flexible |

---

## ✅ Recomendación Final

**Para tu caso, usa Cron Nativo (pg_cron) porque:**
- ✅ Es más simple (solo SQL)
- ✅ No requiere servicios externos
- ✅ Está incluido en Supabase
- ✅ Funciona perfectamente para tu caso de uso

**Usa Google Cloud Scheduler solo si:**
- Necesitas mayor control sobre timezone
- Necesitas configuración más avanzada
- Ya tienes Google Cloud configurado

---

## 📝 Resumen

1. ✅ **SÍ puedes hacer cron directamente en Supabase**
2. ✅ **NO necesitas Google Cloud**
3. ✅ **Usa `pg_cron` + `pg_net` para llamar Edge Functions**
4. ✅ **Ejecuta el SQL del script `111_setup_cron_process_feedback.sql`**
5. ✅ **Revisa logs en `cron.job_run_details`**
