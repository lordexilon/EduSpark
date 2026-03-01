# Corrección: Detección de Respuesta sobre Escala de Tal

**Fecha:** Enero 2025

---

## 🔍 Problema Identificado

El tutor respondió con:
- "no se encuentra información explícita sobre la 'escala de Tal'"
- "no se menciona ninguna escala específica"
- "Te sugiero consultar materiales adicionales o a tu instructor"

Pero estas frases **no estaban siendo detectadas** completamente como conocimiento general.

---

## ✅ Corrección Aplicada

Se agregaron las siguientes frases adicionales a la detección:

- ✅ `'no se encuentra información explícita'`
- ✅ `'no se menciona ninguna'`
- ✅ `'no se menciona ninguna escala'`
- ✅ `'según el material disponible'`
- ✅ `'te sugiero consultar materiales adicionales'`
- ✅ `'consultar materiales adicionales'`
- ✅ `'consultar a tu instructor'`

---

## 📋 Frases Detectadas (Actualizadas)

Ahora el sistema detecta estas variaciones:

### Frases de "no encontrar información"
- `'no se encuentra información'`
- `'no se encuentra información específica'`
- `'no se encuentra información detallada'`
- `'no se encuentra información explícita'` ✅ **NUEVO**

### Frases de "no mencionar"
- `'no se menciona'`
- `'no se menciona ninguna'` ✅ **NUEVO**
- `'no se menciona ninguna escala'` ✅ **NUEVO**

### Frases de sugerencia
- `'te sugiero consultar materiales adicionales'` ✅ **NUEVO**
- `'consultar materiales adicionales'` ✅ **NUEVO**
- `'consultar a tu instructor'` ✅ **NUEVO**

### Frases de referencia al material
- `'según el material disponible'` ✅ **NUEVO**

---

## 🧪 Prueba con la Respuesta Actual

La respuesta que mostraste:
> "Según el material disponible de 'este curso', no se encuentra información explícita sobre la 'escala de Tal'... no se menciona ninguna escala específica... Te sugiero consultar materiales adicionales o a tu instructor"

**Ahora debería ser detectada correctamente** porque incluye:
- ✅ "no se encuentra información explícita"
- ✅ "no se menciona ninguna escala"
- ✅ "te sugiero consultar materiales adicionales"
- ✅ "según el material disponible"

---

## 📊 Verificación

Para verificar que la respuesta se guardó:

```sql
-- Ver respuestas sobre escala de tal o desnutrición
SELECT 
    id,
    course_id,
    question,
    LEFT(answer, 200) as respuesta_preview,
    rag_confidence,
    status,
    created_at
FROM tutor_general_knowledge_responses
WHERE question ILIKE '%escala%' 
   OR question ILIKE '%desnutrición%'
   OR question ILIKE '%tal%'
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ Resultado Esperado

Después de recargar la página y hacer la misma pregunta:

1. ✅ Debe detectarse como `responseSource: 'GENERAL'`
2. ✅ Debe asignarse `ragConfidence: 0.3`
3. ✅ Debe guardarse automáticamente en `tutor_general_knowledge_responses`
4. ✅ Debe procesarse automáticamente por el cron job

---

**Última actualización:** Enero 2025
