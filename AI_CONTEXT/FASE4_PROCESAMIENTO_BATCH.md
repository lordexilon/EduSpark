# Fase 4: Procesamiento Batch - Sistema de Retroalimentación

**Fecha:** Enero 2025  
**Estado:** En progreso

---

## 📋 Objetivo

Configurar el procesamiento batch para convertir respuestas de conocimiento general en chunks RAG.

---

## ✅ Archivos Creados

### 1. Script de Procesamiento

**📄 `scripts/process-feedback-batch.ts`**

Script para ejecutar el procesamiento batch de respuestas.

**Funcionalidades:**
- ✅ Procesa respuestas pendientes
- ✅ Soporta filtrado por curso
- ✅ Límite configurable
- ✅ Manejo de errores

---

## 🔧 Configuración

### Opción A: Usar tsx (Recomendado si está disponible)

**Instalar tsx (si no está disponible):**
```bash
npm install -D tsx
```

**Agregar a package.json:**
```json
{
  "scripts": {
    "process-feedback": "tsx scripts/process-feedback-batch.ts",
    "process-feedback:course": "tsx scripts/process-feedback-batch.ts --course-id"
  }
}
```

### Opción B: Compilar y ejecutar (Alternativa)

Si tsx no está disponible, podemos:
1. Compilar TypeScript a JavaScript
2. Ejecutar con Node.js

O crear una versión JavaScript del script.

---

## 📝 Uso del Script

### Ejecución Básica

```bash
# Procesar todas las respuestas pendientes
npm run process-feedback

# O con tsx directamente
npx tsx scripts/process-feedback-batch.ts
```

### Opciones Disponibles

```bash
# Procesar solo un curso específico
npm run process-feedback -- --course-id 12

# Limitar cantidad de respuestas procesadas
npm run process-feedback -- --limit 25

# Combinar opciones
npm run process-feedback -- --course-id 12 --limit 25
```

---

## 🔍 Verificación

### Antes de Ejecutar

```sql
-- Ver cuántas respuestas están pendientes
SELECT 
    course_id,
    COUNT(*) as pendientes
FROM tutor_general_knowledge_responses
WHERE status = 'pending'
GROUP BY course_id;
```

### Después de Ejecutar

```sql
-- Ver respuestas procesadas
SELECT 
    course_id,
    status,
    COUNT(*) as cantidad,
    AVG(quality_score) as calidad_promedio
FROM tutor_general_knowledge_responses
GROUP BY course_id, status
ORDER BY course_id, status;

-- Ver chunks creados
SELECT 
    course_id,
    COUNT(*) as chunks_creados,
    COUNT(DISTINCT metadata->>'original_response_id') as respuestas_procesadas
FROM course_content_chunks
WHERE metadata->>'source' = 'tutor_general_knowledge'
GROUP BY course_id;
```

---

## ⚙️ Configuración de Cron Job (Opcional)

### Opción 1: Cron Job Local (Linux/Mac)

```bash
# Editar crontab
crontab -e

# Agregar (ejecutar cada domingo a las 2 AM)
0 2 * * 0 cd /ruta/al/proyecto && npm run process-feedback >> /var/log/feedback-process.log 2>&1
```

### Opción 2: Tarea Programada (Windows)

1. Abrir "Programador de tareas"
2. Crear nueva tarea
3. Configurar:
   - **Desencadenador:** Semanal (domingos a las 2 AM)
   - **Acción:** Iniciar programa
   - **Programa:** `npm`
   - **Argumentos:** `run process-feedback`
   - **Directorio:** Ruta al proyecto

### Opción 3: Supabase Edge Function (Futuro)

Puede crearse una Edge Function que se ejecute mediante pg_cron o servicio externo.

---

## ⚠️ Consideraciones

### 1. Generación de Embeddings

El script usa `generateEmbedding` de `@/workers/file-processing-worker/geminiService`.

**Requisitos:**
- ✅ GEMINI_API_KEY configurada
- ✅ API de Gemini disponible
- ✅ Conexión a internet

### 2. Límites de Rate

El script incluye delays (100ms) entre requests para evitar rate limiting.

### 3. Tiempo de Procesamiento

- **1 respuesta = ~1-2 segundos** (generar embedding + guardar)
- **50 respuestas = ~1-2 minutos**
- **500 respuestas = ~10-20 minutos**

### 4. Costos

- **Embeddings:** ~$0.000005 USD por chunk
- **50 respuestas = ~50-100 chunks = ~$0.00025-0.0005 USD** (muy bajo)

---

## 📊 Monitoreo

### Logs del Script

El script muestra:
- ✅ Progreso del procesamiento
- ✅ Cantidad de respuestas procesadas
- ✅ Cantidad de chunks creados
- ✅ Errores (si hay)

### Ejemplo de Salida

```
🚀 Iniciando procesamiento batch de retroalimentación...
============================================================
📚 Procesando todos los cursos
📊 Límite por lote: 50

🔄 Iniciando procesamiento de retroalimentación...
📋 Encontradas 12 respuestas pendientes
🔍 Después de deduplicación: 10 respuestas únicas
✅ 10 respuestas pasan el filtro de calidad
✅ 10 respuestas marcadas como procesadas
✅ Procesamiento completado: 10 procesadas, 15 chunks creados, 0 errores

============================================================
✅ Procesamiento completado:
   📝 Respuestas procesadas: 10
   📦 Chunks creados: 15
   ⚠️  Errores: 0

🎉 ¡Excelente! Se procesaron 10 respuestas y se crearon 15 chunks RAG.
```

---

## 🧪 Testing

### Probar con 1 Respuesta

```bash
# Procesar solo 1 respuesta para probar
npm run process-feedback -- --limit 1
```

### Verificar Resultados

```sql
-- Ver la última respuesta procesada
SELECT * FROM tutor_general_knowledge_responses 
WHERE status = 'processed'
ORDER BY processed_at DESC
LIMIT 1;

-- Ver chunks creados para esa respuesta
SELECT * FROM course_content_chunks
WHERE metadata->>'original_response_id' = (
    SELECT id::text FROM tutor_general_knowledge_responses 
    WHERE status = 'processed'
    ORDER BY processed_at DESC
    LIMIT 1
);
```

---

## 📚 Próximos Pasos

1. ✅ Ejecutar script manualmente para probar
2. ⏳ Configurar cron job o tarea programada
3. ⏳ Monitorear resultados semanalmente
4. ⏳ Ajustar parámetros si es necesario

---

**Última actualización:** Enero 2025
