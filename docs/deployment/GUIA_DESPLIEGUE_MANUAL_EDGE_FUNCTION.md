# Guía: Desplegar Edge Function Manualmente (Sin CLI)

Como el CLI de Supabase tiene problemas con el directorio de trabajo, puedes desplegar la función **directamente desde el Dashboard**.

---

## 📋 Pasos para Desplegar Manualmente

### 1. Acceder al Dashboard de Supabase

Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/functions

### 2. Crear Nueva Función

1. Haz clic en **"Create a new function"** o **"New Function"**
2. Nombre de la función: **`process-feedback`**
3. Selecciona el runtime: **Deno** (por defecto)

### 3. Copiar el Código

1. Abre el archivo: `supabase/functions/process-feedback/index.ts`
2. Copia **TODO** el contenido del archivo
3. Pégalo en el editor de código del dashboard

### 4. Configurar Variables de Entorno

En la sección **"Environment Variables"** o **"Secrets"**, agrega:

- **`GEMINI_API_KEY`** = Tu API key de Gemini

**Nota:** 
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están disponibles automáticamente, no necesitas agregarlas
- Puedes obtener `GEMINI_API_KEY` de tu archivo `.env` local (busca `GEMINI_API_KEY` o `VITE_GEMINI_API_KEY`)

### 5. Desplegar

Haz clic en **"Deploy"** o **"Save"**

### 6. Verificar Despliegue

1. Deberías ver la función en la lista con estado **"Active"**
2. La URL será: `https://mckfscukxcqwntpjagar.supabase.co/functions/v1/process-feedback`

---

## 🧪 Probar la Función

Una vez desplegada, puedes probarla:

```bash
curl -X POST https://mckfscukxcqwntpjagar.supabase.co/functions/v1/process-feedback \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8" \
  -H "Content-Type: application/json"
```

O ejecuta este comando en PowerShell:
```powershell
Invoke-WebRequest -Uri "https://mckfscukxcqwntpjagar.supabase.co/functions/v1/process-feedback" -Method POST -Headers @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8"; "Content-Type"="application/json"}
```

---

## ✅ Después del Despliegue

Una vez desplegada la función:

1. **El cron job ya configurado funcionará automáticamente**
   - Se ejecutará diariamente a las 2:00 AM UTC
   - Procesará respuestas pendientes automáticamente

2. **Verificar en logs:**
   - Dashboard → Functions → process-feedback → Logs
   - O en `cron.job_run_details` en la base de datos

---

## 🔍 Verificación

### Ver si la función está desplegada:
- Dashboard: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/functions

### Ver cron job:
```sql
SELECT * FROM cron.job WHERE jobname = 'process-feedback-daily';
```

### Ver historial de ejecuciones:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-feedback-daily')
ORDER BY start_time DESC 
LIMIT 10;
```

---

## ⚠️ Si Prefieres No Usar Edge Functions

Si prefieres usar el script Node.js local en lugar de Edge Functions:

1. **Deshabilitar el cron job:**
```sql
SELECT cron.unschedule('process-feedback-daily');
```

2. **Usar script local:**
```bash
npm run process-feedback
```

3. **Programar con Task Scheduler de Windows** (ver guía anterior)

---

## 📝 Resumen

- ✅ **Cron job configurado:** Job ID 4, activo
- ⏳ **Edge Function:** Pendiente de despliegue manual
- ✅ **Script Node.js:** Disponible como alternativa

**Última actualización:** Enero 2025
