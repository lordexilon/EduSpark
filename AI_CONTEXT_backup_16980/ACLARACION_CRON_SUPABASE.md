# Aclaración: Cron Jobs en Supabase

## ❓ Preguntas Frecuentes

### 1. ¿Supabase Edge Functions tienen soporte nativo de cron?

**Respuesta:** ❌ **NO directamente**

Supabase Edge Functions **NO tienen soporte nativo de cron jobs**. Necesitas usar un servicio externo para programar las llamadas.

### 2. ¿pg_cron se ejecuta en Google Cloud?

**Respuesta:** ❌ **NO**

`pg_cron` es una **extensión de PostgreSQL** que se ejecuta **dentro de tu base de datos de Supabase** (no en Google Cloud). Sin embargo:

- ❌ **No está disponible por defecto** en todos los planes de Supabase
- ✅ Solo disponible en **planes Pro/Enterprise** o con configuración especial
- ⚠️ Solo puede ejecutar **funciones SQL puras**, no código Node.js/Deno

---

## ✅ Opciones Disponibles

### Opción A: Edge Function + Servicio Externo (Recomendada)

**Cómo funciona:**
1. Creas Edge Function en Supabase
2. Usas servicio externo (Google Cloud Scheduler, cron local, etc.) para llamarla periódicamente
3. El servicio externo hace HTTP POST a la Edge Function

**Ventajas:**
- ✅ Funciona en cualquier plan de Supabase
- ✅ Puede ejecutar código complejo (Deno/TypeScript)
- ✅ No requiere configuración especial en Supabase

**Servicios externos disponibles:**
- Google Cloud Scheduler (gratis hasta cierto límite)
- GitHub Actions (gratis para repos públicos)
- Cron local (si tienes servidor siempre encendido)
- EasyCron, Cron-job.org (servicios web gratuitos)

---

### Opción B: pg_cron (Solo planes Pro/Enterprise)

**Cómo funciona:**
1. Habilitas extensión `pg_cron` en Supabase
2. Creas función SQL que ejecuta código
3. Programas ejecución con `cron.schedule()`

**Limitaciones:**
- ❌ Solo puede ejecutar funciones SQL puras
- ❌ No puede ejecutar código Node.js/Deno directamente
- ❌ Requiere plan Pro/Enterprise (o configuración especial)
- ⚠️ Para nuestro caso (procesamiento con embeddings), necesitarías crear función SQL que llame a HTTP endpoint

---

### Opción C: Script Local + Cron (Solo desarrollo/testing)

**Cómo funciona:**
1. Script Node.js local ejecuta el procesamiento
2. Cron/Task Scheduler ejecuta el script periódicamente
3. El script debe estar corriendo siempre (o ejecutarse cuando se necesita)

**Limitaciones:**
- ❌ Requiere servidor/computadora siempre encendida
- ❌ No recomendado para producción

---

## 🎯 Recomendación para Tu Caso

**Para automatizar el procesamiento de retroalimentación:**

### Mejor Opción: Edge Function + Google Cloud Scheduler

**Pasos:**

1. **Desplegar Edge Function:**
```bash
supabase functions deploy process-feedback
```

2. **Configurar Google Cloud Scheduler:**
   - URL: `https://<project-ref>.supabase.co/functions/v1/process-feedback`
   - Método: POST
   - Headers: `Authorization: Bearer <anon-key>`
   - Frecuencia: `0 2 * * *` (diario a las 2 AM)

3. **O usar servicio web gratuito:**
   - EasyCron.com
   - Cron-job.org
   - UptimeRobot (si solo necesitas HTTP calls)

---

## 📋 Comparación Rápida

| Opción | Requiere | Ejecuta | Costo | Dificultad |
|--------|----------|---------|-------|------------|
| **Edge Function + Cloud Scheduler** | Google Cloud | Código Deno | Gratis/Bajo | Media |
| **Edge Function + Servicio Web** | Servicio externo | Código Deno | Gratis | Baja |
| **pg_cron** | Plan Pro | Solo SQL | Incluido en plan | Alta |
| **Script Local + Cron** | Servidor propio | Código Node | Gratis | Baja |

---

## ❓ ¿Cuál usar?

- **Producción con código complejo:** Edge Function + Google Cloud Scheduler
- **Solo SQL simple:** pg_cron (si tienes plan Pro)
- **Testing/Desarrollo:** Script local + cron
