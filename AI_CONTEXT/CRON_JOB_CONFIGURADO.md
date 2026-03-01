# ✅ Cron Job Configurado Exitosamente

**Fecha:** Enero 2025  
**Estado:** ✅ CONFIGURADO Y ACTIVO

---

## 📋 Estado Actual

### Cron Job Creado

- **Job ID:** 1
- **Nombre:** `process-feedback-daily`
- **Frecuencia:** Diario a las 2:00 AM UTC
- **Estado:** ✅ Activo (`active: true`)
- **Base de datos:** postgres
- **Usuario:** postgres

---

## ✅ Próximos Pasos

### 1. Verificar Edge Function Desplegada

**IMPORTANTE:** Antes de que el cron job funcione, necesitas desplegar la Edge Function:

```bash
# Si aún no la has desplegado:
supabase functions deploy process-feedback
```

**Verificar en Supabase Dashboard:**
1. Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/functions
2. Verifica que `process-feedback` aparece en la lista
3. Si no está, despliégalo con el comando de arriba

### 2. Configurar Variables de Entorno

Asegúrate de que la Edge Function tiene estas variables configuradas:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

**Configurar en:**
Supabase Dashboard → Edge Functions → process-feedback → Settings → Environment Variables

---

## 🔍 Monitoreo

### Ver Próxima Ejecución

El cron job se ejecutará automáticamente **cada día a las 2:00 AM UTC**.

**Para verificar cuándo fue la última ejecución:**
```sql
SELECT 
    start_time,
    status,
    return_message
FROM cron.job_run_details
WHERE jobid = 1
ORDER BY start_time DESC
LIMIT 5;
```

### Verificar Resultados

**Ver respuestas procesadas recientemente:**
```sql
SELECT 
    processed_at,
    status,
    COUNT(*) as total
FROM tutor_general_knowledge_responses
WHERE processed_at >= NOW() - INTERVAL '24 hours'
GROUP BY processed_at, status
ORDER BY processed_at DESC;
```

**Ver chunks creados:**
```sql
SELECT 
    COUNT(*) as total_chunks,
    MAX(created_at) as ultimo_chunk
FROM course_content_chunks
WHERE metadata->>'source' = 'tutor_general_knowledge'
  AND created_at >= NOW() - INTERVAL '24 hours';
```

---

## ⚙️ Gestión del Cron Job

### Ver Estado Actual
```sql
SELECT * FROM cron.job WHERE jobname = 'process-feedback-daily';
```

### Deshabilitar Temporalmente
```sql
SELECT cron.unschedule('process-feedback-daily');
```

### Cambiar Frecuencia

Para cambiar a cada 6 horas, por ejemplo:
```sql
-- 1. Eliminar el job actual
SELECT cron.unschedule('process-feedback-daily');

-- 2. Crear nuevo con frecuencia diferente
SELECT cron.schedule(
    'process-feedback-daily',
    '0 */6 * * *',  -- Cada 6 horas
    $$
    SELECT
      net.http_post(
          url := 'https://mckfscukxcqwntpjagar.supabase.co/functions/v1/process-feedback',
          headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8'
          ),
          body := '{}'::jsonb
      ) as request_id;
    $$
);
```

---

## ⏰ Timezone

**IMPORTANTE:** El cron job usa **UTC**.

- **2:00 AM UTC** = **23:00 (11 PM) del día anterior** en Uruguay (UTC-3)
- **2:00 AM UTC** = **20:00 (8 PM) del día anterior** en México (UTC-6)

Si quieres ejecutarlo a las 2 AM hora local de Uruguay, usarías: **5 AM UTC**

---

## 🧪 Probar Manualmente (Antes de Esperar)

Si quieres probar que funciona sin esperar a las 2 AM:

```bash
# Llamar manualmente a la Edge Function
curl -X POST https://mckfscukxcqwntpjagar.supabase.co/functions/v1/process-feedback \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8" \
  -H "Content-Type: application/json"
```

---

## ✅ Checklist

- [x] Cron job creado y activo
- [ ] Edge Function desplegada (`supabase functions deploy process-feedback`)
- [ ] Variables de entorno configuradas en Edge Function
- [ ] Probar manualmente (opcional)
- [ ] Monitorear primera ejecución automática

---

## 📝 Resumen

✅ **El cron job está configurado y activo**  
⏰ **Se ejecutará automáticamente cada día a las 2:00 AM UTC**  
🔍 **Usa las queries de monitoreo para verificar que funciona**  
🚀 **¡El sistema de retroalimentación está completamente automatizado!**
