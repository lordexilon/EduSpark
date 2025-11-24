# 🧠 Tutor Virtual Inteligente — Flujo n8n (Gemini + RAG + Supabase Ready)

## 🎯 Objetivo General
Este flujo de **n8n** implementa un **tutor virtual empático e inteligente** que:
- Entiende la intención y tono del estudiante.
- Busca contexto relevante en los materiales del curso (RAG con embeddings + PostgreSQL).
- Responde con precisión y empatía, ajustando el tono y nivel de detalle.
- Está preparado para integrarse con **Supabase** y personalizar respuestas según el perfil académico del estudiante.

---

## 🧩 Estructura General del Flujo

### 1️⃣ Webhook (Tutor Chat)
**Entrada desde el frontend:**
```json
{
  "message": "¿Qué es el teorema de Pitágoras?",
  "studentId": "SIN_ID",
  "degree": "SIN_CARRERA",
  "courseId": "clase-1"
}
```

**Función:**  
Activa el flujo principal y distribuye los datos hacia los siguientes nodos.

---

### 2️⃣ Normalize Inputs (Code Node)
Normaliza la entrada, asegurando que todos los campos tengan valores por defecto.

```js
return [{
  json: {
    message: $json.message || "",
    studentId: $json.studentId || "SIN_ID",
    degree: $json.degree || "SIN_CARRERA",
    courseId: $json.courseId || "SIN_CURSO",
    hasProfile: !!$json.profile,
    profile: $json.profile || null
  }
}];
```

✅ **Evita errores** cuando falten valores como carrera o perfil.

---

### 3️⃣ Detect Intent (Gemini)
Usa el modelo `gemini-2.5-flash` (Google AI Studio) para detectar la **intención** del estudiante.

Ejemplos de salida:
```json
{"intencion": "pregunta_contenido", "tema": "matemáticas"}
{"intencion": "saludo"}
```

---

### 4️⃣ Detect Tone (Gemini)
Evalúa el tono emocional del estudiante.

Ejemplo:
```json
{"tono": "curioso"}
```

---

### 5️⃣ Join Intent + Tone (Merge Node)
**Modo:** `Combine → Merge By Position`

Une los resultados de intención y tono en un solo flujo de datos.  
Esto permite analizarlos de manera conjunta en el siguiente paso.

---

### 6️⃣ Merge Meta (Intent/Tone/Profile)
Combina intención, tono y (si existe) información de perfil del estudiante.

Ejemplo de salida:
```json
{
  "intencion": "pregunta_contenido",
  "tema": "geometría",
  "tono": "neutro",
  "profileSummary": "SIN_DATOS: cuando lleguen datos de perfil, el tutor personalizará ejemplos y rutas."
}
```

💡 Este nodo deja preparado el flujo para la futura integración con Supabase.

---

### 7️⃣ Google Embeddings
Convierte la pregunta del estudiante en un **vector semántico** usando:
- `POST https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent`
- Autenticación: API Key de Google AI Studio

Esto permite comparar la pregunta con los materiales del curso almacenados en la base de datos.

---

### 8️⃣ Map Embedding + Carry Fields
Asocia el embedding generado con los campos del flujo:
- `courseId`
- `question`
- `embeddingStr`

Estos datos se envían al motor de búsqueda vectorial.

---

### 9️⃣ Search Context (Postgres)
Ejecuta una búsqueda semántica de contexto en la base de datos del curso.

Ejemplo de query:
```sql
SELECT content 
FROM search_course_content_chunks(
  ('{{ $json.embeddingStr }}')::vector,
  '{{ $json.courseId }}',
  5
);
```

🔍 Devuelve los fragmentos de texto más relevantes del material.

---

### 🔟 Format Context (Code Node)
Formatea los fragmentos encontrados en un único bloque legible:
```text
[Fragmento 1]
---
[Fragmento 2]
---
[Fragmento 3]
```

---

### 1️⃣1️⃣ Gemini Generate Answer (RAG)
Llama a `gemini-2.5-flash` con:
- El **contexto del curso** (desde PostgreSQL)
- La **pregunta del estudiante**
- Un **prompt del sistema** que restringe las respuestas al material encontrado

```json
{
  "systemInstruction": {
    "parts": [
      {
        "text": "Eres un tutor que responde solo usando el contexto del curso. Si no encuentras información relevante, responde: 'No encuentro esa información en el material del curso.'"
      }
    ]
  },
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Contexto:\n{{ $json.context }}\n\nPregunta: {{ $json.question }}"
        }
      ]
    }
  ]
}
```

---

### 1️⃣2️⃣ Extract Answer (Code Node)
Extrae y limpia el texto de respuesta de Gemini.

```js
const answer =
  $json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
  "No encuentro esa información en el material del curso.";

return [
  {
    json: {
      success: true,
      message: answer,
      metadata: {
        model: "gemini-2.5-flash",
        source: "Tutor Virtual AI",
        contextUsed: $items("Format Context")?.[0]?.json?.context?.slice(0, 300) || "Sin contexto usado",
        timestamp: new Date().toISOString(),
      },
    },
  },
];
```

🧹 Este paso asegura que el frontend reciba solo la respuesta limpia y relevante.

---

### 1️⃣3️⃣ Respond Webhook
Envía la respuesta final al cliente (frontend o API Gateway).

Ejemplo:
```json
{
  "success": true,
  "message": "El teorema de Pitágoras establece que en un triángulo rectángulo...",
  "metadata": {
    "model": "gemini-2.5-flash",
    "source": "Tutor Virtual AI",
    "contextUsed": "El teorema de Pitágoras se aplica...",
    "timestamp": "2025-10-19T23:22:41Z"
  }
}
```

---

## 🤖 Flujo Alterno: Smalltalk Empático
Cuando la intención detectada es de **conversación ligera** (`saludo`, `motivación`, etc.):
- Se deriva hacia el nodo `Compose Empathic Reply (Gemini)`.
- Produce una respuesta empática sin usar el contexto RAG.

---

## 🧩 Integración con Supabase (Futuro)
El flujo ya está preparado para:
- Consultar el perfil de cada estudiante (`studentId`).
- Personalizar respuestas según carrera, materias o rendimiento.
- Guardar logs de interacción y mejoras del tutor.

Tablas sugeridas:
| Tabla | Descripción |
|--------|--------------|
| `students` | Datos generales y carrera |
| `courses` | Materias inscritas o aprobadas |
| `interactions` | Historial de preguntas y respuestas |
| `embeddings` | Vectores de contenido educativo |

---

## 🧠 Tecnologías Principales

| Componente | Descripción | Tecnología |
|-------------|--------------|-------------|
| **n8n Workflow** | Orquestación del flujo y automatización | Self-hosted n8n |
| **Gemini 2.5 Flash** | LLM para intención, tono y generación de respuestas | Google AI Studio |
| **Google Text Embedding 004** | Generación de vectores semánticos | Google AI API |
| **PostgreSQL + pgvector** | Búsqueda contextual por similitud | Base de datos RAG |
| **Supabase (Futuro)** | Gestión de perfiles y datos académicos | Supabase Cloud |

---

## 📈 Flujo Simplificado

```
Webhook → Normalize Inputs → Detect Intent
                ↓
         Detect Tone → Join Intent+Tone
                ↓
        Merge Meta (perfil/intención/tono)
                ↓
       Embeddings → Postgres → Contexto
                ↓
       Gemini Generate Answer → Extract Answer
                ↓
             Respond Webhook
```

---

## 💬 Resultado Final
Un tutor virtual capaz de:
- Entender preguntas y tono del estudiante.
- Responder con empatía y contexto académico.
- Aprender a personalizarse en base a datos del estudiante.

🚀 **Listo para producción e integración con Supabase.**
