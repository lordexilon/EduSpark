# Guía: Automatizar Procesamiento de Retroalimentación

## 🎯 Opciones Disponibles

### Opción 1: Cron Nativo en Supabase ⭐⭐ (MÁS RECOMENDADA)

**Ventajas:**
- ✅ NO requiere servicios externos
- ✅ Configuración simple (solo SQL)
- ✅ Incluido en Supabase
- ✅ Monitoreo integrado

**Cómo funciona:**
- Usa `pg_cron` + `pg_net` para programar llamadas HTTP a la Edge Function
- Se ejecuta directamente en la base de datos de Supabase

**Pasos:**
1. Desplegar Edge Function: `supabase functions deploy process-feedback`
2. Ejecutar SQL: `sql_scripts/3_tutor_rag/111_setup_cron_process_feedback.sql`
3. ¡Listo! Se ejecuta automáticamente según el horario programado

**Ver guía completa:** `AI_CONTEXT/GUIA_CRON_SUPABASE_NATIVO.md`

---

### Opción 2: Supabase Edge Function + Google Cloud Scheduler (Alternativa)

**Ventajas:**
- ✅ No requiere servidor propio
- ✅ Escalable y confiable
- ✅ Funciona con cualquier plan de Supabase
- ✅ Gratis hasta cierto límite

**Pasos:**

1. **Desplegar Edge Function:**
```bash
cd supabase/functions/process-feedback
supabase functions deploy process-feedback
```

2. **Configurar variables de entorno en Supabase Dashboard:**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`

3. **Crear tarea en Google Cloud Scheduler:**
   - URL: `https://<project-ref>.supabase.co/functions/v1/process-feedback`
   - Método: POST
   - Headers: `Authorization: Bearer <anon-key>`
   - Frecuencia: `0 2 * * *` (diario a las 2 AM)

---

### Opción 2: Script Local con Cron (Windows/Linux)

**Para Windows (Task Scheduler):**

1. Crear script `.bat`:
```batch
@echo off
cd C:\ruta\al\proyecto
npm run process-feedback
```

2. Programar en Task Scheduler:
   - Trigger: Diario a las 2 AM
   - Action: Ejecutar el script `.bat`

**Para Linux/Mac (cron):**

```bash
# Editar crontab
crontab -e

# Agregar línea (ejecutar diario a las 2 AM)
0 2 * * * cd /ruta/al/proyecto && npm run process-feedback >> /var/log/feedback-process.log 2>&1
```

---

### Opción 3: Endpoint HTTP + Servicio Externo

Si prefieres mantener el script Node.js pero exponerlo como endpoint:

1. **Crear servidor Express simple:**
```typescript
// scripts/feedback-server.ts
import express from 'express';
import { runFeedbackBatchProcessing } from '../src/services/feedbackProcessingService';

const app = express();
const PORT = process.env.PORT || 3002;

app.post('/process', async (req, res) => {
  try {
    const courseId = req.body.course_id;
    const result = await runFeedbackBatchProcessing(courseId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Feedback processor running on port ${PORT}`);
});
```

2. **Ejecutar en servidor:**
```bash
npm run feedback-server
```

3. **Programar llamada con Google Cloud Scheduler o cron**

---

## 📅 Ejemplos de Frecuencia (Cron)

- **Cada hora:** `0 * * * *`
- **Diario a las 2 AM:** `0 2 * * *`
- **Cada 6 horas:** `0 */6 * * *`
- **Semanal (Lunes 2 AM):** `0 2 * * 1`
- **Cada 30 minutos:** `*/30 * * * *`

---

## 🔍 Monitoreo

Para verificar que la automatización funciona:

```sql
-- Ver últimas respuestas procesadas
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

## ⚠️ Consideraciones

1. **Rate Limits:** Verificar límites de Gemini API
2. **Costo:** Monitorear uso de tokens
3. **Errores:** Configurar alertas/notificaciones
4. **Logs:** Revisar logs periódicamente

---

## 🎯 Recomendación Final

**Para producción:** **Opción 1 (Edge Function + Google Cloud Scheduler)**

Es la más robusta, escalable y no requiere infraestructura propia.
