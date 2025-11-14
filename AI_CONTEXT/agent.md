# Agent Constitution: AI Assistant for EduSpark RAG MVP

## Core Mission
Tu misión principal es desarrollar e integrar un Asistente de IA Interactivo (basado en RAG) dentro de la plataforma EduSpark. Debes seguir estrictamente el alcance definido para el Producto Mínimo Viable (MVP), enfocándote en construir una base funcional y escalable.

---

## Technical Stack & Architecture
- **Frontend**: React
- **Orquestación**: Sistema multi-agente local (A2A)
- **Base de Datos Vectorial**: Supabase (PostgreSQL con la extensión `pgvector`)
- **Modelo de IA**: Google Gemini API (`embedContent` para embeddings, `generateContent` para respuestas)

**Flujo Arquitectónico (A2A Local RAG):**
1.  **Pregunta (Frontend)**: El usuario envía una pregunta desde el componente de chat en React.
2.  **AgentCoordinator (Local)**: coordina los agentes locales en el frontend.
3.  **ContextAgent**: obtiene contexto relevante (RAG) desde Supabase (pgvector).
4.  **RAGAgent**: compone el prompt final y llama a Gemini para generar la respuesta.
5.  **VoiceAgent (opcional)**: maneja audio y voz.
6.  **Respuesta (Frontend)**: el sistema retorna la respuesta al usuario.

**⚠️ NOTA**: Este es un sistema A2A **local** implementado en el frontend, no un coordinador externo distribuido.

---

## Key Responsibilities (In-Scope)

### Backend (Base de Datos Vectorial)
- **Configuración**: Utilizar una instancia de PostgreSQL en Supabase con la extensión `pgvector`.
- **Esquema de Datos**: Crear una tabla para `course_content_chunks` con `id`, `content`, `embedding` y `course_id`.
- **Función de Búsqueda**: Crear una Edge Function en Supabase para la búsqueda de similitud de cosenos.

### Orquestación (A2A Local)
- **AgentCoordinator**: punto único de entrada/salida; coordina agentes locales.
- **ContextAgent**: búsqueda semántica y normalización de contexto.
- **RAGAgent**: construcción de prompt y llamada a LLM.
- **VoiceAgent**: manejo de audio y voz.

### Frontend (React)
- **Componente `TutorVirtualPage.tsx`**: chat con historial de sesión y estados de carga/error.
- **Hook `useAgentSystem`**: Coordina el sistema multi-agente local.
- **Hook `useCourseContext`**: Gestiona el contexto del curso.
- **Servicio de Integración (`agentService.ts`)**: Para futura integración con coordinador A2A externo.

### Integración con Contenido del Curso ⭐ ACTUALIZADO
- **RAGService**: Carga unidades, sesiones y materiales del curso.
- **Sistema de Fuentes**: Incluye enlaces contextuales a unidades, sesiones y materiales.
- **Panel de Contenido**: Muestra y resalta contenido relacionado con las respuestas.
- **Navegación Contextual**: Permite acceso directo al contenido mencionado.

---

## Boundaries (Out-of-Scope)
No debes implementar, sugerir ni trabajar en las siguientes áreas para este MVP:
- **Autenticación de Backend Completa**: Continuar usando el sistema de autenticación simulado.
- **Reemplazo del "Generador de Rutas de Aprendizaje"**: Este debe permanecer simulado.
- **Interfaz de Administración para Carga de Cursos**: La ingesta de contenido será manual.
- **Historial de Chat Persistente**: El chat se reinicia al recargar la página.
- **Streaming de Respuestas**: Las respuestas se mostrarán completas, no palabra por palabra.

---

## Plan de Implementación (Alto Nivel)
Sigue estas fases en orden:
1.  **Fase 1**: Configuración del sistema multi-agente local (A2A).
2.  **Fase 2**: Integración con Supabase (pgvector) para RAG.
3.  **Fase 3**: Integración Frontend vía `useAgentSystem`.
4.  **Fase 4**: Observabilidad y auditoría de eventos.

---

## Requisitos Previos
Asume que las siguientes herramientas y accesos están disponibles:
- Cuenta de Google Cloud con API de Gemini habilitada.
- Cuenta de Supabase con extensión pgvector.
- Variables de entorno configuradas (VITE_GEMINI_API_KEY, VITE_SUPABASE_URL, etc.).