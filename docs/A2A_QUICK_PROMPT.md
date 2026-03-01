# 🚀 A2A Core - Prompt Rápido para Copiar

**Copia este prompt completo a tu asistente AI en el nuevo proyecto:**

---

```
# Implementar Sistema A2A (Agent-to-Agent) - Tutor Virtual con RAG

## Tu Rol
Eres un Senior Frontend Architect. Implementa el sistema A2A: un tutor virtual con RAG que funciona 100% en frontend.

## Stack Tecnológico
- React 18+ con TypeScript
- @supabase/supabase-js (Database + Vector Search pgvector)
- @google/generative-ai (Gemini para LLM y embeddings)

## Variables de Entorno Requeridas
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## Arquitectura Multi-Agente

El sistema tiene 4 componentes principales:

1. **AgentCoordinator** - Orquestador central que:
   - Inicializa la conversación
   - Maneja input del usuario
   - Coordina los otros agentes
   - Gestiona eventos y errores

2. **ContextAgent** - Memoria y personalización:
   - Crea/carga conversaciones en Supabase
   - Obtiene configuración pedagógica del curso
   - Obtiene perfil del estudiante
   - Gestiona memoria híbrida (localStorage + Supabase)

3. **RAGAgent** - Búsqueda y generación:
   - Construye prompts personalizados según estilo pedagógico
   - Enriquece contexto con perfil del estudiante
   - Llama al ragService para búsqueda vectorial
   - Personaliza respuestas según estilo de aprendizaje

4. **ragService** - Core de RAG:
   - Búsqueda de texto completo (sin costo)
   - Búsqueda vectorial con embeddings (fallback)
   - Llamada a Gemini para generar respuesta
   - Retorna respuesta con fuentes y confianza

## Esquema de Base de Datos (Supabase SQL)

Ejecutar en orden:

```sql
-- 1. Extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Conversaciones
CREATE TABLE tutor_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    course_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 3. Mensajes
CREATE TABLE tutor_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES tutor_conversations(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 4. Configuración pedagógica por curso
CREATE TABLE course_pedagogical_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL UNIQUE,
    teaching_style TEXT DEFAULT 'constructivista',
    tone_preference TEXT DEFAULT 'amigable',
    detail_level TEXT DEFAULT 'medio',
    use_examples BOOLEAN DEFAULT true,
    voice_name TEXT DEFAULT 'Kore',
    voice_speed NUMERIC DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Perfiles de estudiantes
CREATE TABLE student_learning_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    course_id INTEGER NOT NULL,
    preferred_learning_style TEXT DEFAULT 'visual',
    interaction_count INTEGER DEFAULT 0,
    topics_struggled TEXT[] DEFAULT '{}',
    topics_mastered TEXT[] DEFAULT '{}',
    UNIQUE(student_id, course_id)
);

-- 6. Chunks vectoriales para RAG
CREATE TABLE course_content_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_chunks_embedding ON course_content_chunks 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 7. Función de búsqueda vectorial
CREATE OR REPLACE FUNCTION search_course_content_chunks(
    query_embedding TEXT,
    course_id_param TEXT,
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 5
) RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.content, c.metadata,
           1 - (c.embedding <=> query_embedding::vector) AS similarity
    FROM course_content_chunks c
    WHERE c.course_id = course_id_param::INTEGER
      AND c.embedding IS NOT NULL
      AND 1 - (c.embedding <=> query_embedding::vector) > match_threshold
    ORDER BY c.embedding <=> query_embedding::vector
    LIMIT match_count;
END; $$;
```

## Estructura de Archivos

```
src/modules/a2a/
├── agents/
│   ├── AgentCoordinator.ts
│   ├── ContextAgent.ts
│   └── RAGAgent.ts
├── services/
│   ├── ragService.ts
│   ├── supabaseService.ts
│   └── memoryService.ts
├── types/
│   ├── agents.ts
│   └── pedagogical.ts
├── hooks/
│   └── useAgentSystem.ts
└── lib/
    └── supabase.ts
```

## Tipos Principales

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ConversationContext {
  studentId: string;
  courseId: string;
  conversationId: string;
  pedagogicalSettings: PedagogicalSettings;
  studentProfile: StudentProfile;
  recentMessages: ChatMessage[];
}

interface PedagogicalSettings {
  teachingStyle: 'socratico' | 'directo' | 'colaborativo' | 'constructivista';
  tonePreference: 'amigable' | 'formal' | 'motivador' | 'neutro';
  detailLevel: 'basico' | 'medio' | 'avanzado';
  useExamples: boolean;
  voiceName: string;
  voiceSpeed: number;
}

interface StudentProfile {
  preferredLearningStyle: 'visual' | 'auditivo' | 'kinestesico' | 'lectoescritor';
  interactionCount: number;
  topicsStruggled: string[];
  topicsMastered: string[];
}

interface AgentResponse {
  success: boolean;
  message: string;
  metadata: { sources?: string[]; confidence?: number };
  agentUsed: 'rag' | 'coordinator';
}
```

## Flujo Principal

1. `useAgentSystem` hook inicializa `AgentCoordinator`
2. `AgentCoordinator.initialize()`:
   - Crea conversación en Supabase
   - Carga configuración pedagógica
   - Carga perfil del estudiante
3. Usuario envía mensaje
4. `AgentCoordinator.handleUserInput()`:
   - Guarda mensaje del usuario
   - Obtiene contexto relevante
   - Construye `ConversationContext`
   - Llama a `RAGAgent.query()`
5. `RAGAgent.query()`:
   - Construye prompt con personalización
   - Llama a `ragService.processQueryWithContext()`
6. `ragService`:
   - Busca chunks relevantes (texto o vectorial)
   - Construye prompt con contexto
   - Llama a Gemini API
   - Retorna respuesta con metadata
7. Se guarda respuesta y actualiza progreso

## Ejemplo de Uso

```tsx
function TutorChat({ studentId, courseId, user }) {
  const { isInitialized, isLoading, messages, sendMessage } = useAgentSystem({
    studentId, courseId, user
  });

  const handleSubmit = async (text: string) => {
    const response = await sendMessage(text);
    // response.message contiene la respuesta
    // response.metadata.sources contiene las fuentes
  };

  return (
    <div>
      {messages.map(msg => <Message key={msg.id} {...msg} />)}
      <ChatInput onSubmit={handleSubmit} disabled={isLoading} />
    </div>
  );
}
```

## Instrucciones

1. Instala dependencias: `npm install @supabase/supabase-js @google/generative-ai`
2. Configura variables de entorno
3. Ejecuta SQL en Supabase
4. Crea la estructura de archivos
5. Implementa cada componente siguiendo la arquitectura
6. El ragService debe:
   - Primero intentar búsqueda de texto (gratis)
   - Fallback a búsqueda vectorial si no hay resultados
   - Llamar Gemini con contexto + pregunta
   - Retornar respuesta con fuentes

¿Listo? Empieza implementando los tipos, luego el cliente Supabase, después los servicios, y finalmente los agentes.
```

---

**Para usar:**
1. Copia todo el bloque de código de arriba
2. Pégalo en tu asistente AI en el nuevo proyecto
3. El asistente tendrá todo el contexto necesario para implementar A2A

