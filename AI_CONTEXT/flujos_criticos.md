# Flujos Críticos del Asistente de IA

Este documento detalla la arquitectura y los flujos de trabajo que constituyen el núcleo del sistema RAG (Retrieval-Augmented Generation) para EduSpark.

## 1. Arquitectura Propuesta

El flujo de datos sigue un patrón claro desde el cliente hasta el backend y de regreso:

```
[Frontend React] <--(1. Pregunta)--> [Webhook n8n] --(2. Orquesta)--> [API Gemini & Supabase]
      ^                                     |
      |                                     |
      +--------(5. Respuesta)---------------+
```

1.  **Pregunta**: El usuario escribe una pregunta en el componente de chat. React llama al Webhook de n8n.
2.  **Orquestación**: n8n ejecuta el workflow de consulta.
3.  **Búsqueda y Generación**: n8n interactúa con las APIs externas (Gemini para vectorizar la pregunta y generar la respuesta; Supabase para buscar el contexto).
4.  **Respuesta**: n8n devuelve la respuesta final al frontend, que la muestra al usuario.

---

## 2. Orquestación (n8n)

### Workflow 1: Ingesta de Contenido (Manual para el MVP)

Este workflow se encarga de procesar los materiales del curso y prepararlos para la búsqueda.

-   **Disparador**: Manual o activado por un Webhook simple.
-   **Proceso**:
    1.  **Recibir Documento**: Recibe la ubicación de un documento de curso (ej. un archivo de texto o PDF).
    2.  **Dividir en Fragmentos (Chunking)**: Lee y divide el documento en fragmentos (chunks) de texto de tamaño manejable.
    3.  **Generar Embeddings**: Para cada fragmento, llama al endpoint `embedContent` de la API de Gemini para generar su vector numérico.
    4.  **Almacenar en DB**: Guarda el texto del fragmento y su vector correspondiente en la tabla `course_content_chunks` de Supabase, junto con el `course_id`.

### Workflow 2: Consulta del Alumno (RAG en tiempo real)

Este es el workflow principal que responde a las preguntas de los estudiantes.

-   **Disparador**: Webhook que será llamado por la aplicación React.
-   **Entrada**: Recibirá un JSON con `pregunta` y `course_id`.
-   **Proceso**:
    1.  **Vectorizar Pregunta**: Llama a la API de Gemini (`embedContent`) para convertir la pregunta del usuario en un vector.
    2.  **Buscar Contexto Relevante**: Llama a la Edge Function de Supabase con el vector de la pregunta para buscar los fragmentos de texto más relevantes para ese `course_id`.
    3.  **Construir Prompt Final**: Construye un prompt estructurado que incluye el contexto (los fragmentos recuperados) y la pregunta original. Ejemplo:
        ```
        Contexto: [Texto del fragmento 1], [Texto del fragmento 2], ...
        Pregunta: [Pregunta original del usuario]
        Basándote únicamente en el contexto proporcionado, responde la pregunta.
        ```
    4.  **Generar Respuesta**: Llama a la API de Gemini (`generateContent`) con el prompt final para obtener la respuesta.
    5.  **Devolver Respuesta**: Devuelve la respuesta generada al frontend de React a través de la respuesta del webhook.