# ⚠️ IMPORTANTE: Edge Function Necesaria

## ❓ El Problema

Has configurado el **cron job** correctamente, pero el cron job **llama a una Edge Function** que aún no está desplegada.

## ✅ Solución: Dos Opciones

### Opción 1: Desplegar Edge Function (Recomendada)

**Pasos:**

1. **Asegúrate de tener Supabase CLI instalado:**
```bash
npm install -g supabase
```

2. **Iniciar sesión en Supabase:**
```bash
supabase login
```

3. **Vincular proyecto:**
```bash
supabase link --project-ref mckfscukxcqwntpjagar
```

4. **Desplegar Edge Function:**
```bash
supabase functions deploy process-feedback
```

5. **Configurar variables de entorno en Supabase Dashboard:**
   - Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/functions
   - Click en `process-feedback` → Settings
   - Agregar variables:
     - `SUPABASE_URL` (ya está disponible automáticamente)
     - `SUPABASE_SERVICE_ROLE_KEY` (ya está disponible automáticamente)
     - `GEMINI_API_KEY` (necesitas agregarla manualmente)

---

### Opción 2: Usar Script Node.js (Alternativa)

Si prefieres NO usar Edge Functions, puedes:

1. **Deshabilitar el cron job que llama a la Edge Function**
2. **Usar el script Node.js local** que ya funciona: `scripts/process-feedback-standalone.ts`
3. **Programar con Task Scheduler de Windows** o cron local

**Para deshabilitar el cron job:**
```sql
SELECT cron.unschedule('process-feedback-daily');
```

---

## 🔍 Verificar Edge Function

**Ver si la Edge Function está desplegada:**

1. Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/functions
2. Si no ves `process-feedback` en la lista, necesita desplegarse
3. Si aparece, verifica que tiene las variables de entorno configuradas

---

## 📋 Estado Actual

- ✅ Cron job configurado (llama a Edge Function)
- ❌ Edge Function NO desplegada (por eso no funciona)
- ✅ Script Node.js disponible (alternativa funcional)

---

## 💡 Recomendación

**Para producción:** Desplegar Edge Function (Opción 1)  
**Para desarrollo/testing:** Usar script Node.js local (Opción 2)
