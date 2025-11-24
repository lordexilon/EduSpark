# 🧠 Tutor Virtual Inteligente — Workflow de Consulta RAG

Este documento proporciona la guía detallada y el JSON completo para implementar el **Tutor Virtual Inteligente** en n8n, actualizado con las mejores prácticas de la API de Gemini y funcionalidades avanzadas de IA.

## 🎯 Propósito

Este workflow es el **cerebro inteligente** de nuestro Tutor Virtual. Se activa cuando un estudiante hace una pregunta en el chat. Su función es:

1. **🧠 Análisis Inteligente**: Detectar la intención y tono emocional del estudiante
2. **🔍 Búsqueda Contextual**: Convertir la pregunta en un vector semántico y buscar contenido relevante
3. **💬 Respuesta Empática**: Generar respuestas contextuales o empáticas según el tipo de consulta
4. **🎯 Personalización**: Preparar el flujo para futura integración con perfiles de estudiantes

## 🚀 Funcionalidades Avanzadas

### **Detección de Intención**
- Clasifica automáticamente si es una pregunta de contenido, saludo, o solicitud de ayuda
- Usa Gemini 2.5 Flash para análisis inteligente

### **Análisis de Tono**
- Detecta el estado emocional del estudiante (empático, entusiasta, neutro, formal)
- Permite respuestas personalizadas según el contexto emocional

### **RAG Inteligente**
- Búsqueda vectorial en PostgreSQL con embeddings
- Respuestas basadas únicamente en el material del curso
- Fallback empático para conversaciones casuales

## 2. Instrucciones de Implementación

1.  **Copiar el JSON**: Copia el bloque de código JSON completo que se encuentra al final de este documento.
2.  **Importar en n8n**: En tu instancia de n8n, ve a "Workflows", haz clic en "Import from File" o "Paste Code" y pega el JSON.
3.  **Configurar Credenciales**:
    *   **Nodos `Gemini API`**: Asegúrate de tener tus credenciales de la API de Gemini configuradas en n8n y seleccionadas en los nodos `Embed Question` y `Generate Answer`. Puedes usar variables de entorno (`$env.GEMINI_API_KEY`) como se muestra en el JSON para mayor seguridad.
    *   **Nodo `Supabase`**: Configura tus credenciales de Supabase (Postgres) y selecciónalas en el nodo `Search Context`.
4.  **Activar el Webhook**: Guarda y activa el workflow. Copia la URL del Webhook de producción; la necesitarás para conectar el frontend.

## 🚀 Mejoras Clave en esta Versión

Esta versión del workflow ha sido completamente rediseñada para implementar un **Tutor Virtual Inteligente** con capacidades avanzadas:

### **🧠 Inteligencia Artificial Avanzada**
-   **Detección de Intención**: Clasifica automáticamente el tipo de consulta (pregunta_contenido, saludo, plan_estudio, otro)
-   **Análisis de Tono**: Detecta el estado emocional del estudiante (empático, entusiasta, neutro, formal)
-   **Respuestas Contextuales**: Usa RAG para responder basándose en el material del curso
-   **Respuestas Empáticas**: Maneja conversaciones casuales con empatía y motivación

### **🔧 Tecnologías Actualizadas**
-   **Gemini 2.5 Flash**: Modelo más reciente y eficiente para todas las tareas de IA
-   **Google Text Embedding 004**: Generación de vectores semánticos de alta calidad
-   **PostgreSQL + pgvector**: Búsqueda vectorial optimizada para contexto relevante
-   **Manejo de CORS**: Soporte completo para comunicación frontend-backend

### **📊 Flujo de Datos Inteligente**
```
Webhook → Normalize Inputs → Detect Intent + Tone
                ↓
        Merge Meta (perfil/intención/tono)
                ↓
       Embeddings → Postgres → Contexto
                ↓
       Gemini Generate Answer → Extract Answer
                ↓
             Respond Webhook
```

### **🎯 Preparado para el Futuro**
- Integración con Supabase para perfiles de estudiantes
- Personalización basada en historial académico
- Métricas y analytics de interacciones

---

## 4. Código JSON del Workflow para n8n

**⚠️ NOTA IMPORTANTE**: Este JSON corresponde al workflow **simplificado** de consulta RAG. Para el **Tutor Virtual Inteligente completo** con detección de intención y análisis de tono, usa el archivo `n8n_workflow_final.json` que contiene el flujo completo de 13 nodos.

```json
{
  "name": "[MVP] Consulta RAG de Alumno",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "rag-student-query",
        "responseMode": "lastNode",
        "options": {}
      },
      "id": "c1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [
        620,
        320
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent",
        "jsonParameters": true,
        "responseFormat": "json",
        "options": {
          "sendBody": "json"
        },
        "bodyParametersJson": "{\n  \"model\": \"models/text-embedding-004\",\n  \"content\": {\n    \"parts\": [\n      {\n        \"text\": \"{{ $json.body.question }}\"\n      }\n    ]\n  }\n}",
        "queryParameters": {
          "parameters": [
            {
              "name": "key",
              "value": "{{ $env.GEMINI_API_KEY }}"
            }
          ]
        }
      },
      "id": "d2b3c4d5-e6f7-g8h9-i0j1-k2l3m4n5o6p7",
      "name": "Embed Question",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [
        1060,
        420
      ]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "=SELECT content FROM search_course_content_chunks(\n  ('[' || {{ $('Embed Question').item.json.embedding.values.join(',') }} || ']')::vector,\n  {{ $('IF').item.json.body.courseId }},\n  5\n);",
        "options": {}
      },
      "id": "e3c4d5e6-f7g8-h9i0-j1k2-l3m4n5o6p7q8",
      "name": "Search Context",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.3,
      "position": [
        1280,
        420
      ],
      "credentials": {
        "postgres": {
          "id": "YOUR_SUPABASE_CREDENTIALS_ID",
          "name": "Supabase account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const rows = $items('Search Context').map(i => (i.json.content || '').trim());\nconst unique = [...new Set(rows)].filter(Boolean);\nconst clipped = unique.map(s => s.slice(0, 2000));\nconst context = clipped.join('\\n---\\n');\nreturn [\n  {\n    json: {\n      context\n    }\n  }\n];"
      },
      "id": "f4d5e6f7-g8h9-i0j1-k2l3-m4n5o6p7q8r9",
      "name": "Format Context",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1500,
        420
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        "jsonParameters": true,
        "responseFormat": "json",
        "options": {
          "sendBody": "json"
        },
        "bodyParametersJson": "{\n  \"contents\": [\n    {\n      \"role\": \"user\",\n      \"parts\": [\n        {\n          \"text\": \"Contexto:\\n{{ $('Format Context').item.json.context }}\\n\\nPregunta: {{ $('IF').item.json.body.question }}\"\n        }\n      ]\n    }\n  ],\n  \"systemInstruction\": {\n    \"parts\": [\n      {\n        \"text\": \"Eres un asistente de IA para estudiantes. Tu única función es responder preguntas basándote ESTRICTAMENTE en el 'Contexto' proporcionado. No debes usar conocimiento externo. Si la respuesta a la 'Pregunta' no se encuentra en el 'Contexto', debes responder EXACTAMENTE con la frase: 'No encuentro esa información en el material del curso.'. Responde de forma clara, concisa y amigable.\"\n      }\n    ]\n  },\n  \"generationConfig\": {\n    \"temperature\": 0.2\n  }\n}",
        "queryParameters": {
          "parameters": [
            {
              "name": "key",
              "value": "{{ $env.GEMINI_API_KEY }}"
            }
          ]
        }
      },
      "id": "g5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0",
      "name": "Generate Answer",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [
        1720,
        420
      ]
    },
    {
      "parameters": {
        "jsCode": "const c = $json.candidates || [];\nconst text = c[0]?.content?.parts?.[0]?.text?.trim();\n\nreturn {\n  json: {\n    answer: text || 'No encuentro esa información en el material del curso.'\n  }\n};"
      },
      "id": "h6f7g8h9-i0j1-k2l3-m4n5-o6p7q8r9s0t1",
      "name": "Set Response",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        2160,
        420
      ]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "{{ $request.method }}",
              "operation": "equal",
              "value2": "OPTIONS"
            }
          ]
        }
      },
      "id": "b08a2a88-29a3-41c3-8884-63510e19901c",
      "name": "IF",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [
        840,
        320
      ]
    },
    {
      "parameters": {
        "values": {
          "string": [
            {
              "name": "header_Access-Control-Allow-Origin",
              "value": "*"
            },
            {
              "name": "header_Access-Control-Allow-Methods",
              "value": "POST, OPTIONS"
            },
            {
              "name": "header_Access-Control-Allow-Headers",
              "value": "Content-Type"
            }
          ]
        },
        "options": {}
      },
      "id": "228f413d-59d4-469b-8a8f-28c0b2c1590c",
      "name": "Set CORS Headers for Preflight",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.2,
      "position": [
        1060,
        220
      ]
    },
    {
      "parameters": {
        "responseCode": 200,
        "options": {}
      },
      "id": "9a38f972-0056-4d05-9f20-9c17dfb119df",
      "name": "Respond to Preflight Request",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [
        1280,
        220
      ]
    },
    {
      "parameters": {
        "values": {
          "string": [
            {
              "name": "header_Access-Control-Allow-Origin",
              "value": "*"
            }
          ]
        },
        "options": {}
      },
      "id": "4b68e77a-24da-4458-94df-7f1540306132",
      "name": "Set CORS Header for POST",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.2,
      "position": [
        1940,
        420
      ]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "IF",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Embed Question": {
      "main": [
        [
          {
            "node": "Search Context",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Search Context": {
      "main": [
        [
          {
            "node": "Format Context",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Format Context": {
      "main": [
        [
          {
            "node": "Generate Answer",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Generate Answer": {
      "main": [
        [
          {
            "node": "Set CORS Header for POST",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "IF": {
      "main": [
        [
          {
            "node": "Set CORS Headers for Preflight",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Embed Question",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Set CORS Headers for Preflight": {
      "main": [
        [
          {
            "node": "Respond to Preflight Request",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Set CORS Header for POST": {
      "main": [
        [
          {
            "node": "Set Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {}
}
```

---

## 🔄 **Diferencias entre Workflows**

### **📋 Workflow Simplificado (Este documento)**
- **Propósito**: Consulta RAG básica
- **Nodos**: 8 nodos
- **Funcionalidades**: 
  - ✅ Embeddings
  - ✅ Búsqueda vectorial
  - ✅ Respuesta contextual
  - ❌ Detección de intención
  - ❌ Análisis de tono
  - ❌ Respuestas empáticas

### **🧠 Tutor Virtual Inteligente (n8n_workflow_final.json)**
- **Propósito**: Tutor Virtual completo con IA avanzada
- **Nodos**: 13 nodos
- **Funcionalidades**:
  - ✅ Embeddings
  - ✅ Búsqueda vectorial
  - ✅ Respuesta contextual
  - ✅ **Detección de intención**
  - ✅ **Análisis de tono**
  - ✅ **Respuestas empáticas**
  - ✅ **Ruteo inteligente**
  - ✅ **Preparado para Supabase**

### **🎯 Recomendación**
Para un **Tutor Virtual completo y funcional**, usa el archivo `n8n_workflow_final.json` que contiene todas las funcionalidades avanzadas de IA.

---

## 📚 **Documentación Relacionada**

- **Flujo Completo**: `AI_CONTEXT/Tutor_Virtual_Flujo_n8n.md`
- **Estado del Proyecto**: `AI_CONTEXT/project_status.md`
- **Workflow Funcional**: `n8n_workflow_final.json`