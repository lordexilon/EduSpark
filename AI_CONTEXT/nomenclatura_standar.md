# Nomenclatura y Estándares del Proyecto

Para mantener la consistencia y legibilidad del código a lo largo del proyecto, se seguirán las siguientes convenciones de nomenclatura.

## Backend (Supabase/PostgreSQL)

-   **Tablas**: Nombres en plural y `snake_case`.
    -   Tabla de fragmentos: `course_content_chunks`
-   **Columnas**: Nombres en `snake_case`.
    -   `id` (UUID, clave primaria)
    -   `content` (TEXT, texto del fragmento)
    -   `embedding` (VECTOR, vector del fragmento)
    -   `course_id` (TEXT o UUID, para asociar al curso)
    -   `created_at` (TIMESTAMP WITH TIME ZONE)
-   **Funciones (Edge Functions)**: Nombres en `snake_case`.
    -   Función de búsqueda: `search_course_content_chunks`

## Orquestación (n8n)

-   **Workflows**: Nombres descriptivos que indiquen su propósito, prefijados con `[MVP]` para esta fase.
    -   Workflow de ingesta: `[MVP] Ingesta de Contenido de Curso`
    -   Workflow de consulta: `[MVP] Consulta RAG de Alumno`

## Frontend (React)

-   **Componentes**: Nombres en `PascalCase`.
    -   Componente de chat: `AsistenteIA.tsx`
    -   Componentes de UI: `ChatBubble.tsx`, `ChatInput.tsx`
-   **Servicios**: Nombres en `camelCase` con el sufijo `Service`.
    -   Servicio de RAG: `ragService.ts`
-   **Hooks**: Nombres en `camelCase` con el prefijo `use`.
    -   Hook para manejar la lógica del chat: `useChatAssistant.ts`

## General

-   **Variables y Funciones**: Usar `camelCase` en TypeScript/JavaScript.
    -   `const courseId = '...'`
    -   `async function getChatResponse() { ... }`
-   **Variables de Entorno**: Usar `SCREAMING_SNAKE_CASE` con el prefijo `REACT_APP_` para el frontend.
    -   `REACT_APP_N8N_WEBHOOK_URL`