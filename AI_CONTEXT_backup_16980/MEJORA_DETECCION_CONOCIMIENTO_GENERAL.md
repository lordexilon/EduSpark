# Mejora: Detección de Conocimiento General

**Fecha:** Enero 2025

---

## 🔍 Problema Identificado

El tutor está respondiendo con frases como:
- "no se encuentra información detallada sobre..."
- "no se aborda este tema"
- "sin embargo, en el contenido actual, no se aborda"

Pero estas variaciones **no estaban siendo detectadas** como conocimiento general.

---

## ✅ Corrección Aplicada

Se agregaron las siguientes frases a la detección:

- ✅ `'no se encuentra información detallada'`
- ✅ `'no se aborda'`
- ✅ `'no se aborda este tema'`
- ✅ `'no se aborda en el contenido'`
- ✅ `'en el contenido actual, no se aborda'`
- ✅ `'sin embargo, en el contenido actual'`
- ✅ `'en los materiales específicos disponibles'`

---

## 📋 Frases Detectadas (Lista Completa)

Ahora el sistema detecta estas variaciones:

### Frases de "no encontrar"
- `'no encuentro'`
- `'no se encuentra'`
- `'no se encuentra información'`
- `'no se encuentra información específica'`
- `'no se encuentra información detallada'`
- `'no está en el material'`
- `'no encuentro esa información'`
- `'no está disponible en el material'`
- `'no hay información'`

### Frases de "no mencionar"
- `'no se mencionan'`
- `'no mencionan'`
- `'no está mencionada'`
- `'no están mencionadas'`
- `'no se menciona'`
- `'no menciona'`

### Frases de "no abordar"
- `'no se aborda'`
- `'no se aborda este tema'`
- `'no se aborda en el contenido'`
- `'en el contenido actual, no se aborda'`
- `'sin embargo, en el contenido actual'`

### Otras frases
- `'lamento informarte'`
- `'en los materiales específicos disponibles'`

---

## 🧪 Prueba

Después de esta corrección, cuando el tutor responda con frases como:
- "no se encuentra información detallada sobre..."
- "no se aborda este tema en el contenido actual"
- "sin embargo, en el contenido actual, no se aborda"

El sistema debería:
1. ✅ Detectar como `responseSource: 'GENERAL'`
2. ✅ Asignar `ragConfidence: 0.3`
3. ✅ Guardar automáticamente en `tutor_general_knowledge_responses`

---

## 📊 Verificación

Para verificar que las respuestas se están guardando:

```sql
-- Ver respuestas recientes guardadas
SELECT 
    id,
    course_id,
    LEFT(question, 80) as pregunta,
    rag_confidence,
    status,
    created_at
FROM tutor_general_knowledge_responses
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

**Última actualización:** Enero 2025
