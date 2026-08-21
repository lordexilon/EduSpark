# Workflow 1: [MVP] Ingesta de Contenido de Curso

Este documento proporciona la guía detallada y el JSON completo para implementar el workflow de ingesta de contenido en n8n.

## 1. Propósito

Este workflow es un proceso **manual** diseñado para "alimentar" nuestra base de datos vectorial en Supabase. Toma el contenido de texto de un documento de curso, lo divide en fragmentos (chunks), genera una representación vectorial (embedding) para cada fragmento usando la API de Gemini y finalmente lo almacena todo en la tabla `course_content_chunks`.

## 2. Instrucciones de Implementación

1.  **Copiar el JSON**: Copia el bloque de código JSON completo que se encuentra al final de este documento.
2.  **Importar en n8n**: En tu instancia de n8n, ve a "Workflows", haz clic en "Import from File" y pega el JSON.
3.  **Configurar Credenciales**:
    *   **Nodo `Gemini API`**: Asegúrate de tener tus credenciales de la API de Gemini configuradas en n8n y seleccionadas en este nodo.
    *   **Nodo `Supabase`**: Configura tus credenciales de Supabase (Postgres) y selecciónalas.
4.  **Añadir Contenido**: En el nodo `Set Course Content`, pega el texto completo de una de las clases (`SESSIONS_DATA`) y asegúrate de que el `courseId` coincida con el `id` de esa sesión (ej. "clase-1").
5.  **Ejecutar**: Guarda y ejecuta el workflow manualmente. Verifica en tu tabla de Supabase que los datos se hayan insertado correctamente.

## 3. Detalle de los Nodos

-   **Start (Manual)**: Inicia el flujo de trabajo.
-   **Set Course Content (Code)**: Contiene el `courseId` y el `fullContent` del curso. Es el único lugar que necesitas modificar para procesar diferentes documentos.
-   **Split into Chunks (Code)**: Divide el `fullContent` en fragmentos más pequeños. La lógica está diseñada para no cortar palabras por la mitad y respetar los párrafos.
-   **Gemini API (HTTP Request)**: Para cada fragmento, llama al modelo `text-embedding-004` de Gemini para obtener su vector. Es importante usar este modelo y no uno de generación de imágenes.
-   **Supabase (Postgres)**: Inserta el `course_id`, el `content` (el texto del fragmento) y el `embedding` (el vector) en la tabla `course_content_chunks`.

---

## 4. Código JSON del Workflow para n8n

```json
{
  "name": "[MVP] Ingesta de Contenido de Curso",
  "nodes": [
    {
      "parameters": {},
      "id": "1e97d33d-3f5f-4d3f-addb-3e5e43444053",
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "typeVersion": 1,
      "position": [
        860,
        300
      ]
    },
    {
      "parameters": {
        "jsCode": "const courseContent = `\nBienvenida y Encuadre del Módulo\nPresentación del docente y de los estudiantes.\nExposición del plan de estudios, metodología, recursos y sistema de evaluación (Examen Parcial y Final).\n\nBloque Teórico I: Fundamentos Conceptuales\nDefinición de Ética: Origen (griego ethos). Se define como la disciplina filosófica que reflexiona sobre los fundamentos de la conducta moral.\nDefinición de Moral: Origen (latín mos). Es el conjunto de normas y creencias de una sociedad que guían la conducta.\nDefinición de Deontología: Es la ética aplicada a una profesión, centrada en los deberes y códigos de conducta.\n\nBloque Práctico: Dilemas Éticos en Informática\nRelación Ética-Profesión: Se discute el impacto social del Analista de Sistemas y la responsabilidad que conlleva.\nActividad: Debate en grupos sobre casos prácticos: Un analista descubre una falla de seguridad pero su jefe le ordena ocultarla para cumplir una fecha de entrega; se le pide implementar un algoritmo que genere adicción en usuarios. Los grupos analizan los valores en conflicto, los afectados y las posibles acciones.\n\nCierre y Reflexión\nResumen de los conceptos clave.\nAdelanto de la siguiente clase.\n`;\n\nreturn [{\n  json: {\n    courseId: \"clase-1\", \n    fullContent: courseContent\n  }\n}];"
      },
      "id": "766548a8-0e9e-4e6f-8706-e7d018d46101",
      "name": "Set Course Content",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1080,
        300
      ]
    },
    {
      "parameters": {
        "jsCode": "const text = $json.fullContent;\nconst chunkSize = 1000; // Caracteres por chunk\nconst chunkOverlap = 100; // Caracteres de solapamiento\n\nconst chunks = [];\nlet i = 0;\n\nwhile (i < text.length) {\n  const end = Math.min(i + chunkSize, text.length);\n  chunks.push(text.slice(i, end));\n  i += chunkSize - chunkOverlap;\n}\n\nreturn chunks.map(chunk => ({ json: { chunkText: chunk } }));"
      },
      "id": "673f32c3-982c-4b6f-bc71-f7e914bf6f3a",
      "name": "Split into Chunks",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1300,
        300
      ]
    },
    {
      "parameters": {
        "url": "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent",
        "options": {},
        "bodyParametersJson": "{\n  \"model\": \"models/text-embedding-004\",\n  \"content\": {\n    \"parts\": [\n      {\n        \"text\": \"{{ $json.chunkText }}\"\n      }\n    ]\n  }\n}",
        "headerParameters": {
          "parameters": []
        },
        "queryParameters": {
          "parameters": [
            {
              "name": "key",
              "value": "{{ $credentials.GeminiAPI.apiKey }}"
            }
          ]
        }
      },
      "id": "409f8742-b0b4-4b4f-af97-09a27c73b069",
      "name": "Gemini API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [
        1520,
        300
      ],
      "credentials": {
        "httpHeaderAuth": {
          "id": "",
          "name": ""
        },
        "geminiApi": {
          "id": "YOUR_GEMINI_CREDENTIALS_ID",
          "name": "Gemini API account"
        }
      }
    },
    {
      "parameters": {
        "operation": "insert",
        "schema": "public",
        "table": "course_content_chunks",
        "columns": [
          {
            "column": "course_id",
            "value": "={{ $('Set Course Content').item.json.courseId }}"
          },
          {
            "column": "content",
            "value": "={{ $('Split into Chunks').item.json.chunkText }}"
          },
          {
            "column": "embedding",
            "value": "={{ JSON.stringify($('Gemini API').item.json.embedding.values) }}"
          }
        ]
      },
      "id": "6eb8a48b-371d-4054-95e3-8208a0d01445",
      "name": "Supabase",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.3,
      "position": [
        1740,
        300
      ],
      "credentials": {
        "postgres": {
          "id": "YOUR_SUPABASE_CREDENTIALS_ID",
          "name": "Supabase account"
        }
      }
    }
  ],
  "connections": {
    "Start": {
      "main": [
        [
          {
            "node": "Set Course Content",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Set Course Content": {
      "main": [
        [
          {
            "node": "Split into Chunks",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Split into Chunks": {
      "main": [
        [
          {
            "node": "Gemini API",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Gemini API": {
      "main": [
        [
          {
            "node": "Supabase",
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
