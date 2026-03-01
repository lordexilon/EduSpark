# Guía: Desplegar Edge Function process-feedback

## 🎯 Objetivo

Desplegar la Edge Function `process-feedback` para que el cron job pueda ejecutarla automáticamente.

---

## ✅ Paso 1: Instalar Supabase CLI (si no está instalado)

```bash
npm install -g supabase
```

O descargar desde: https://github.com/supabase/cli/releases

---

## ✅ Paso 2: Iniciar Sesión en Supabase

```bash
supabase login
```

Esto abrirá tu navegador para autenticarte.

---

## ✅ Paso 3: Vincular Proyecto

```bash
supabase link --project-ref mckfscukxcqwntpjagar
```

---

## ✅ Paso 4: Desplegar Edge Function

```bash
supabase functions deploy process-feedback
```

---

## ✅ Paso 5: Configurar Variables de Entorno

1. Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/functions
2. Click en `process-feedback`
3. Ve a la pestaña **Settings**
4. En **Environment Variables**, agrega:

   - `GEMINI_API_KEY` = Tu API key de Gemini

   **Nota:** `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están disponibles automáticamente, no necesitas agregarlas.

---

## ✅ Paso 6: Verificar Despliegue

1. Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/functions
2. Deberías ver `process-feedback` en la lista
3. Click en ella para ver detalles

---

## 🧪 Probar Manualmente (Opcional)

Puedes probar la Edge Function manualmente antes de esperar al cron:

```bash
curl -X POST https://mckfscukxcqwntpjagar.supabase.co/functions/v1/process-feedback \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8" \
  -H "Content-Type: application/json"
```

---

## ⚠️ Si No Quieres Usar Edge Functions

Si prefieres NO usar Edge Functions, puedes:

1. **Deshabilitar el cron job:**
```sql
SELECT cron.unschedule('process-feedback-daily');
```

2. **Usar el script Node.js local** que ya funciona:
```bash
npm run process-feedback
```

3. **Programar con Task Scheduler de Windows** (ver `AI_CONTEXT/GUIA_AUTOMATIZACION_RETROALIMENTACION.md`)
