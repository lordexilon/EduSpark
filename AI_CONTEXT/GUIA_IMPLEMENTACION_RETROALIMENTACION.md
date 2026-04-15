# Guía de Implementación: Sistema de Retroalimentación para Tutor AI

**Fecha:** Enero 2025  
**Objetivo:** Implementar sistema que convierta respuestas de conocimiento general en chunks RAG

---

## 📋 Tabla de Contenidos

1. [Resumen](#resumen)
2. [Prerrequisitos](#prerrequisitos)
3. [Fase 1: Base de Datos](#fase-1-base-de-datos)
4. [Fase 2: Servicios Backend](#fase-2-servicios-backend)
5. [Fase 3: Integración con Tutor](#fase-3-integración-con-tutor)
6. [Fase 4: Procesamiento Batch](#fase-4-procesamiento-batch)
7. [Fase 5: Testing y Validación](#fase-5-testing-y-validación)
8. [Fase 6: Despliegue](#fase-6-despliegue)
9. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)

---

## 📝 Resumen

Esta guía te lleva paso a paso para implementar el sistema de retroalimentación que:

1. **Almacena** respuestas de conocimiento general cuando RAG no encuentra información
2. **Procesa** esas respuestas en batch (semanal/mensual)
3. **Convierte** las respuestas en chunks RAG con embeddings
4. **Mejora** la base de conocimiento automáticamente

**Tiempo estimado:** 2-3 semanas  
**Dificultad:** Media  
**Costo adicional:** ~$0.005 USD/mes

---

## ✅ Prerrequisitos

- ✅ Acceso a base de datos Supabase
- ✅ Conocimiento de SQL y TypeScript
- ✅ Acceso a Gemini API para generar embeddings
- ✅ Sistema RAG funcionando
- ✅ Sistema de tracking de interacciones del tutor funcionando

---

## 🗄️ Fase 1: Base de Datos

### Paso 1.1: Crear Tabla de Retroalimentación

**Archivo:** `sql_scripts/3_tutor_rag/110_create_feedback_system_tables.sql`

Ejecutar en Supabase SQL Editor:

```sql
-- Ejecutar el script completo
-- Ver archivo: sql_scripts/3_tutor_rag/110_create_feedback_system_tables.sql
```

**Qué hace:**
- Crea tabla `tutor_general_knowledge_responses`
- Crea funciones auxiliares
- Configura políticas RLS
- Crea índices para optimización

**Verificación:**
```sql
-- Verificar que la tabla existe
SELECT * FROM tutor_general_knowledge_responses LIMIT 1;

-- Verificar funciones
SELECT proname FROM pg_proc WHERE proname LIKE '%feedback%';
```

**⏱️ Tiempo:** 15 minutos

---

## 🔧 Fase 2: Servicios Backend

### Paso 2.1: Crear Servicio de Retroalimentación

**Archivo:** `src/services/tutorFeedbackService.ts`

Este archivo ya está creado. Verificar que esté en tu proyecto.

**Funciones principales:**
- `saveGeneralKnowledgeResponse()` - Guarda respuestas generales
- `getPendingFeedbackResponses()` - Obtiene respuestas pendientes
- `markFeedbackResponsesProcessed()` - Marca como procesadas
- `getFeedbackStats()` - Obtiene estadísticas

**Verificación:**
```typescript
import { saveGeneralKnowledgeResponse } from '@/services/tutorFeedbackService';
// Debe compilar sin errores
```

**⏱️ Tiempo:** 10 minutos (ya creado)

### Paso 2.2: Crear Servicio de Procesamiento Batch

**Archivo:** `src/services/feedbackProcessingService.ts`

Este archivo ya está creado, pero requiere ajustes:

**⚠️ IMPORTANTE:** Actualizar importación de `generateEmbedding`:

```typescript
// Opción 1: Si tienes geminiService en workers
import { generateEmbedding } from '@/workers/file-processing-worker/geminiService';

// Opción 2: Si tienes geminiService en services
import { generateEmbedding } from '@/services/geminiService';

// Opción 3: Implementar aquí (ver ejemplo abajo)
```

**Si necesitas implementar aquí:**
```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY debe estar configurado');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  return result.embedding.values;
}
```

**Verificación:**
- Compilar sin errores
- Verificar que la función `generateEmbedding` esté disponible

**⏱️ Tiempo:** 30 minutos

---

## 🔗 Fase 3: Integración con Tutor

### Paso 3.1: Modificar tutorTrackingService

**Archivo:** `src/services/tutorTrackingService.ts`

**Agregar import:**
```typescript
import { saveGeneralKnowledgeResponse } from './tutorFeedbackService';
```

**Modificar función `trackTutorInteraction`:**

```typescript
export async function trackTutorInteraction(
  studentId: string,
  courseId: string | number,
  question: string,
  answer: string,
  tokens: TokenUsage,
  responseTime: number,
  conversationId?: string,
  ragConfidence?: number, // NUEVO PARÁMETRO
  responseSource?: 'RAG' | 'GENERAL' | 'HYBRID' // NUEVO PARÁMETRO
): Promise<TutorInteraction> {
  try {
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;
    
    // Guardar interacción normal
    const { data, error } = await supabase
      .from('tutor_interactions')
      .insert({
        student_id: studentId,
        course_id: courseIdNum,
        question,
        answer,
        tokens_used: tokens.totalTokens,
        cost: tokens.cost,
        model: tokens.model,
        response_time_ms: responseTime,
        conversation_id: conversationId,
      })
      .select()
      .single();

    if (error) {
      // ... manejo de error existente
    }

    // NUEVO: Guardar para retroalimentación si es conocimiento general
    if (responseSource === 'GENERAL' || (ragConfidence !== undefined && ragConfidence < 0.5)) {
      // Guardar de forma asíncrona (no bloquear flujo principal)
      saveGeneralKnowledgeResponse(
        studentId,
        courseIdNum,
        question,
        answer,
        tokens,
        ragConfidence || 0.3,
        data.id
      ).catch((error) => {
        console.warn('⚠️ Error saving feedback (no crítico):', error);
      });
    }

    return data;
  } catch (error) {
    // ... manejo de error existente
  }
}
```

**⏱️ Tiempo:** 20 minutos

### Paso 3.2: Modificar TutorVirtualPage

**Archivo:** `src/pages/Student/TutorVirtualPage.tsx`

**Localizar llamada a `trackTutorInteraction`** (alrededor de línea 342):

```typescript
// ANTES:
await trackTutorInteraction(
  user.id,
  selectedCourseId,
  userMessage.text,
  lastMessage.text,
  estimatedTokens,
  responseTime,
  conversationId
);

// DESPUÉS:
// Necesitas obtener ragConfidence y responseSource del sistema RAG
// Por ahora, puedes usar valores por defecto o detectar cuando RAG falla

await trackTutorInteraction(
  user.id,
  selectedCourseId,
  userMessage.text,
  lastMessage.text,
  estimatedTokens,
  responseTime,
  conversationId,
  ragConfidence || 0.8, // Obtener del sistema RAG
  responseSource || 'RAG' // Obtener del sistema RAG
);
```

**⚠️ NOTA:** Si el sistema RAG actual no expone `ragConfidence` o `responseSource`, puedes:
- Opción A: Detectar cuando la respuesta dice "No encuentro información" y usar `'GENERAL'`
- Opción B: Implementar respuesta híbrida primero (ver `ANALISIS_RESPUESTA_HIBRIDA_TUTOR.md`)
- Opción C: Guardar todas las respuestas primero y filtrar después

**Para implementación rápida (Opción A):**
```typescript
// Detectar si la respuesta indica que no se encontró información
const isGeneralKnowledge = lastMessage.text.toLowerCase().includes('no encuentro') ||
                          lastMessage.text.toLowerCase().includes('no está en el material') ||
                          lastMessage.text.toLowerCase().includes('no está disponible');

await trackTutorInteraction(
  user.id,
  selectedCourseId,
  userMessage.text,
  lastMessage.text,
  estimatedTokens,
  responseTime,
  conversationId,
  isGeneralKnowledge ? 0.3 : 0.8, // Baja confianza si es general
  isGeneralKnowledge ? 'GENERAL' : 'RAG'
);
```

**⏱️ Tiempo:** 30 minutos

---

## 🔄 Fase 4: Procesamiento Batch

### Paso 4.1: Crear Script de Procesamiento

**Opción A: Script TypeScript (Node.js)**

Crear archivo: `scripts/process-feedback.ts`

```typescript
#!/usr/bin/env node
// scripts/process-feedback.ts

import { runFeedbackBatchProcessing } from '../src/services/feedbackProcessingService';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    console.log('🚀 Iniciando procesamiento batch de retroalimentación...');
    
    // Procesar todas las respuestas pendientes
    const result = await runFeedbackBatchProcessing();
    
    console.log('✅ Procesamiento completado:');
    console.log(`   - Respuestas procesadas: ${result.processed}`);
    console.log(`   - Chunks creados: ${result.chunksCreated}`);
    console.log(`   - Errores: ${result.errors}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en procesamiento:', error);
    process.exit(1);
  }
}

main();
```

**Agregar a `package.json`:**
```json
{
  "scripts": {
    "process-feedback": "ts-node scripts/process-feedback.ts"
  }
}
```

**Opción B: Supabase Edge Function**

Crear función: `supabase/functions/process-feedback/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // Lógica de procesamiento
    // ...
    
    return new Response(
      JSON.stringify({ success: true, processed: 0, chunksCreated: 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### Paso 4.2: Configurar Cron Job

**Opción A: Cron Job en Servidor**

```bash
# Ejecutar semanalmente (cada domingo a las 2 AM)
0 2 * * 0 cd /ruta/al/proyecto && npm run process-feedback
```

**Opción B: Supabase pg_cron (si está disponible)**

```sql
-- Ejecutar semanalmente
SELECT cron.schedule(
  'process-feedback-weekly',
  '0 2 * * 0', -- Cada domingo a las 2 AM
  $$SELECT run_feedback_batch_processing()$$
);
```

**Opción C: Cloud Function / Scheduled Task**

- Google Cloud Functions (Cloud Scheduler)
- AWS Lambda (EventBridge)
- Vercel Cron Jobs

**⏱️ Tiempo:** 1-2 horas (dependiendo de opción elegida)

---

## ✅ Fase 5: Testing y Validación

### Paso 5.1: Testing Manual

1. **Verificar que se guardan respuestas:**
   ```sql
   -- Hacer una pregunta que no esté en RAG
   -- Verificar que se guarda en tutor_general_knowledge_responses
   SELECT * FROM tutor_general_knowledge_responses 
   WHERE status = 'pending' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

2. **Ejecutar procesamiento batch manualmente:**
   ```bash
   npm run process-feedback
   ```

3. **Verificar chunks creados:**
   ```sql
   SELECT * FROM course_content_chunks 
   WHERE metadata->>'source' = 'tutor_general_knowledge'
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

4. **Verificar que se marcaron como procesadas:**
   ```sql
   SELECT COUNT(*) FROM tutor_general_knowledge_responses 
   WHERE status = 'processed';
   ```

### Paso 5.2: Testing de Integración

1. **Probar flujo completo:**
   - Hacer pregunta que no esté en RAG
   - Verificar que se guarda
   - Ejecutar procesamiento batch
   - Verificar que se convierte en chunk RAG
   - Hacer misma pregunta y verificar que ahora responde desde RAG

2. **Probar con varias preguntas:**
   - 5-10 preguntas diferentes
   - Verificar que no hay duplicados
   - Verificar calidad de chunks

**⏱️ Tiempo:** 2-3 horas

---

## 🚀 Fase 6: Despliegue

### Paso 6.1: Desplegar a Producción

1. **Ejecutar script SQL en producción:**
   ```bash
   # Ejecutar en Supabase SQL Editor
   sql_scripts/3_tutor_rag/110_create_feedback_system_tables.sql
   ```

2. **Desplegar código:**
   ```bash
   git add .
   git commit -m "feat: Implementar sistema de retroalimentación"
   git push
   # Desplegar según tu proceso normal
   ```

3. **Verificar despliegue:**
   - Verificar que la tabla existe
   - Verificar que los servicios compilan
   - Verificar que no hay errores en logs

### Paso 6.2: Configurar Procesamiento Automático

1. **Configurar cron job:**
   - Ejecutar script de procesamiento semanalmente
   - Configurar alertas si falla

2. **Monitoreo inicial:**
   - Revisar logs semanalmente
   - Verificar que se procesan respuestas
   - Verificar que se crean chunks

**⏱️ Tiempo:** 1 hora

---

## 📊 Monitoreo y Mantenimiento

### Métricas a Monitorear

1. **Respuestas almacenadas:**
   ```sql
   SELECT 
     course_id,
     status,
     COUNT(*) as count,
     AVG(quality_score) as avg_quality
   FROM tutor_general_knowledge_responses
   GROUP BY course_id, status;
   ```

2. **Chunks creados:**
   ```sql
   SELECT 
     course_id,
     COUNT(*) as chunks_count,
     COUNT(DISTINCT metadata->>'original_response_id') as responses_processed
   FROM course_content_chunks
   WHERE metadata->>'source' = 'tutor_general_knowledge'
   GROUP BY course_id;
   ```

3. **Estadísticas de uso:**
   ```sql
   SELECT 
     COUNT(*) as total_responses,
     COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed,
     COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
     COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
   FROM tutor_general_knowledge_responses;
   ```

### Tareas de Mantenimiento

1. **Revisión semanal (primer mes):**
   - Verificar que el procesamiento batch funciona
   - Revisar chunks creados
   - Verificar calidad

2. **Revisión mensual:**
   - Analizar estadísticas
   - Revisar chunks con baja calidad
   - Depurar chunks obsoletos si es necesario

3. **Ajustes:**
   - Ajustar umbrales de calidad si es necesario
   - Optimizar proceso de deduplicación
   - Mejorar filtros si es necesario

---

## ⚠️ Troubleshooting

### Problema: No se guardan respuestas

**Causas posibles:**
- `saveGeneralKnowledgeResponse` no se llama
- Error en la función
- Políticas RLS bloqueando inserción

**Solución:**
- Verificar logs del navegador
- Verificar que `trackTutorInteraction` llama a `saveGeneralKnowledgeResponse`
- Verificar políticas RLS

### Problema: Procesamiento batch falla

**Causas posibles:**
- Error en generación de embeddings
- Error al insertar chunks
- Timeout en procesamiento

**Solución:**
- Verificar logs del procesamiento
- Verificar que Gemini API está disponible
- Reducir tamaño de lote (limit)

### Problema: Chunks de baja calidad

**Causas posibles:**
- Filtros de calidad no funcionan bien
- Respuestas originales son de baja calidad

**Solución:**
- Ajustar umbral de calidad
- Revisar manualmente algunas respuestas
- Mejorar filtros de calidad

---

## ✅ Checklist de Implementación

- [ ] **Fase 1:** Tabla creada en base de datos
- [ ] **Fase 1:** Funciones SQL creadas
- [ ] **Fase 1:** Políticas RLS configuradas
- [ ] **Fase 2:** Servicio `tutorFeedbackService.ts` creado
- [ ] **Fase 2:** Servicio `feedbackProcessingService.ts` creado
- [ ] **Fase 2:** Función `generateEmbedding` implementada
- [ ] **Fase 3:** `tutorTrackingService.ts` modificado
- [ ] **Fase 3:** `TutorVirtualPage.tsx` modificado
- [ ] **Fase 4:** Script de procesamiento batch creado
- [ ] **Fase 4:** Cron job configurado
- [ ] **Fase 5:** Testing manual completado
- [ ] **Fase 5:** Testing de integración completado
- [ ] **Fase 6:** Desplegado a producción
- [ ] **Fase 6:** Procesamiento automático configurado
- [ ] Monitoreo configurado

---

## 📚 Referencias

- **Análisis de costos:** `AI_CONTEXT/ANALISIS_COSTOS_RAG.md`
- **Propuesta completa:** `AI_CONTEXT/PROPUESTA_RETROALIMENTACION_TUTOR.md`
- **Respuesta híbrida:** `AI_CONTEXT/ANALISIS_RESPUESTA_HIBRIDA_TUTOR.md`

---

**Última actualización:** Enero 2025  
**Versión:** 1.0
