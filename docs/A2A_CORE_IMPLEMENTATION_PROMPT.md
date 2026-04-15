# 🚀 A2A (Agent-to-Agent) Core System - Prompt de Implementación Universal

**Versión**: 2.0.0
**Fecha**: Diciembre 2024
**Estado**: ✅ Producción

---

## 📋 INSTRUCCIONES PARA EL ASISTENTE AI

### Rol
Actúa como un **Senior Frontend Architect** especializado en:
- Sistemas Multi-Agente con LLM (Large Language Models)
- Retrieval-Augmented Generation (RAG)
- Bases de datos vectoriales (pgvector)
- Aplicaciones React/TypeScript de alto rendimiento

### Objetivo
Implementar el **Sistema A2A (Agent-to-Agent)** en el proyecto actual. Este sistema permite crear un tutor virtual inteligente que:
- Funciona **100% en el frontend** (sin backend intermedio como n8n)
- Utiliza **Google Gemini** como LLM
- Implementa **RAG con búsqueda vectorial** (Supabase + pgvector)
- Personaliza respuestas según **perfiles de usuario y configuración pedagógica**
- Opcional: Soporta **síntesis de voz** con voces expresivas

---

## 🏗️ ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  App Component                                                  │
│  ├── useAgentSystem() Hook                                     │
│  └── Chat UI                                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AgentCoordinator                             │
│  - Orquesta todos los agentes                                  │
│  - Gestiona ciclo de vida de conversaciones                    │
│  - Maneja errores y fallbacks                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│   VoiceAgent        │ │   RAGAgent      │ │  ContextAgent       │
│   (Opcional)        │ │                 │ │                     │
├─────────────────────┤ ├─────────────────┤ ├─────────────────────┤
│ - Speech-to-Text    │ │ - Prompt Build  │ │ - Memoria Híbrida   │
│ - Text-to-Speech    │ │ - Vector Search │ │ - Perfiles Usuario  │
│ - Gemini TTS        │ │ - Context Enrich│ │ - Config Pedagógica │
└─────────────────────┘ └─────────────────┘ └─────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│   Gemini 2.5 Flash  │ │   RAG Service   │ │   Supabase DB       │
│   - LLM Principal   │ │   - Búsqueda    │ │   - PostgreSQL      │
│   - Embeddings      │ │   - Procesador  │ │   - pgvector        │
│   - TTS (opcional)  │ │                 │ │   - RLS Policies    │
└─────────────────────┘ └─────────────────┘ └─────────────────────┘
```

---

## 📦 DEPENDENCIAS REQUERIDAS

### NPM Packages

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "@google/generative-ai": "^0.21.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0"
  }
}
```

### Variables de Entorno

```env
# ============================================
# CONFIGURACIÓN DE SUPABASE (REQUERIDO)
# ============================================
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# CONFIGURACIÓN DE GOOGLE GEMINI (REQUERIDO)
# ============================================
VITE_GEMINI_API_KEY=your_gemini_api_key_here
# O para backend/funciones serverless:
GEMINI_API_KEY=your_gemini_api_key_here

# ============================================
# OPCIONAL - CONFIGURACIÓN DE VOZ
# ============================================
VITE_ENABLE_VOICE=true
```

---

## 📁 ESTRUCTURA DE ARCHIVOS

Crear la siguiente estructura en `src/modules/a2a/` (o tu ubicación preferida):

```
src/modules/a2a/
├── agents/
│   ├── AgentCoordinator.ts      # Orquestador principal
│   ├── ContextAgent.ts          # Gestión de memoria/contexto
│   ├── RAGAgent.ts              # Búsqueda y generación
│   └── VoiceAgent.ts            # Opcional: Audio I/O
├── services/
│   ├── ragService.ts            # Core RAG con Gemini
│   ├── supabaseService.ts       # Wrapper de Supabase
│   └── memoryService.ts         # Memoria híbrida
├── types/
│   ├── agents.ts                # Tipos de agentes
│   └── pedagogical.ts           # Tipos de personalización
├── hooks/
│   └── useAgentSystem.ts        # Hook principal React
├── lib/
│   └── supabase.ts              # Cliente Supabase
└── utils/
    └── env.ts                   # Resolución de env vars
```

---

## 🗄️ ESQUEMA DE BASE DE DATOS (Supabase)

### Tablas Core

```sql
-- =====================================================
-- 1. EXTENSIÓN PGVECTOR (Ejecutar primero)
-- =====================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 2. TABLA DE CONVERSACIONES
-- =====================================================
CREATE TABLE tutor_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    course_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_tutor_conversations_student ON tutor_conversations(student_id);
CREATE INDEX idx_tutor_conversations_course ON tutor_conversations(course_id);

-- =====================================================
-- 3. TABLA DE MENSAJES
-- =====================================================
CREATE TABLE tutor_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES tutor_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_tutor_messages_conversation ON tutor_messages(conversation_id);
CREATE INDEX idx_tutor_messages_created ON tutor_messages(created_at);

-- =====================================================
-- 4. TABLA DE CONFIGURACIÓN PEDAGÓGICA
-- =====================================================
CREATE TABLE course_pedagogical_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL UNIQUE,
    teacher_id UUID,
    teaching_style TEXT DEFAULT 'constructivista' 
        CHECK (teaching_style IN ('socratico', 'directo', 'colaborativo', 'constructivista')),
    tone_preference TEXT DEFAULT 'amigable'
        CHECK (tone_preference IN ('amigable', 'formal', 'motivador', 'neutro')),
    detail_level TEXT DEFAULT 'medio'
        CHECK (detail_level IN ('basico', 'medio', 'avanzado')),
    use_examples BOOLEAN DEFAULT true,
    encourage_questions BOOLEAN DEFAULT true,
    voice_name TEXT DEFAULT 'Kore'
        CHECK (voice_name IN ('Kore', 'Charon', 'Fenrir', 'Aoede', 'Puck')),
    voice_speed NUMERIC DEFAULT 1.0 CHECK (voice_speed >= 0.5 AND voice_speed <= 2.0),
    system_prompt_override TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. TABLA DE PERFILES DE APRENDIZAJE
-- =====================================================
CREATE TABLE student_learning_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    course_id INTEGER NOT NULL,
    preferred_learning_style TEXT DEFAULT 'visual'
        CHECK (preferred_learning_style IN ('visual', 'auditivo', 'kinestesico', 'lectoescritor')),
    interaction_count INTEGER DEFAULT 0,
    avg_session_duration NUMERIC DEFAULT 0,
    topics_struggled TEXT[] DEFAULT ARRAY[]::TEXT[],
    topics_mastered TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- =====================================================
-- 6. TABLA DE CHUNKS DE CONTENIDO (VECTORES RAG)
-- =====================================================
CREATE TABLE course_content_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),  -- Para text-embedding-004
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda vectorial eficiente
CREATE INDEX idx_chunks_course ON course_content_chunks(course_id);
CREATE INDEX idx_chunks_embedding ON course_content_chunks 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Funciones RPC

```sql
-- =====================================================
-- FUNCIÓN: Búsqueda Vectorial de Chunks
-- =====================================================
CREATE OR REPLACE FUNCTION search_course_content_chunks(
    query_embedding TEXT,
    course_id_param TEXT,
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
    embedding_vector vector(768);
    course_id_int INTEGER;
BEGIN
    -- Convertir parámetros
    embedding_vector := query_embedding::vector;
    course_id_int := course_id_param::INTEGER;
    
    RETURN QUERY
    SELECT 
        c.id,
        c.content,
        c.metadata,
        1 - (c.embedding <=> embedding_vector) AS similarity
    FROM course_content_chunks c
    WHERE c.course_id = course_id_int
      AND c.embedding IS NOT NULL
      AND 1 - (c.embedding <=> embedding_vector) > match_threshold
    ORDER BY c.embedding <=> embedding_vector
    LIMIT match_count;
END;
$$;

-- =====================================================
-- FUNCIÓN: Búsqueda de Texto Completo (Fallback)
-- =====================================================
CREATE OR REPLACE FUNCTION search_course_content_chunks_text(
    search_query TEXT,
    course_id_param INTEGER,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    rank REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.content,
        c.metadata,
        ts_rank(to_tsvector('spanish', c.content), plainto_tsquery('spanish', search_query)) AS rank
    FROM course_content_chunks c
    WHERE c.course_id = course_id_param
      AND to_tsvector('spanish', c.content) @@ plainto_tsquery('spanish', search_query)
    ORDER BY rank DESC
    LIMIT result_limit;
END;
$$;
```

### Políticas RLS

```sql
-- Estudiantes pueden ver sus propias conversaciones
ALTER TABLE tutor_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
    ON tutor_conversations FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Users can create own conversations"
    ON tutor_conversations FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Mensajes siguen la política de conversaciones
ALTER TABLE tutor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from own conversations"
    ON tutor_messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM tutor_conversations 
            WHERE student_id = auth.uid()
        )
    );

CREATE POLICY "Users can add messages to own conversations"
    ON tutor_messages FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM tutor_conversations 
            WHERE student_id = auth.uid()
        )
    );
```

---

## 📝 CÓDIGO DE IMPLEMENTACIÓN

### 1. Tipos Base (`types/agents.ts`)

```typescript
// =====================================================
// Tipos para el Sistema Multi-Agente A2A
// =====================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  audioUrl?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  studentId: string;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface VoiceConfig {
  voiceName: 'Kore' | 'Charon' | 'Fenrir' | 'Aoede' | 'Puck';
  speed: number; // 0.5 a 2.0
  pitch?: number;
  volume?: number;
}

export interface VoiceAgentStatus {
  isListening: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  currentVoice: VoiceConfig;
}

export interface AudioCapabilities {
  hasMicrophone: boolean;
  hasSpeakers: boolean;
  hasAudioContext: boolean;
  supportsSpeechRecognition: boolean;
}

export interface RAGResponse {
  answer: string;
  context: string;
  sources: string[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface ConversationContext {
  studentId: string;
  courseId: string;
  moduleId?: string;
  conversationId: string;
  pedagogicalSettings: PedagogicalSettings;
  studentProfile: StudentProfile;
  recentMessages: ChatMessage[];
}

export interface ContextWindow {
  messages: ChatMessage[];
  summary: string;
  relevantTopics: string[];
  studentProgress: StudentProgress;
}

export interface StudentProgress {
  topicsMastered: string[];
  topicsStruggled: string[];
  interactionCount: number;
  avgSessionDuration: number;
}

export interface AgentResponse {
  success: boolean;
  message: string;
  audioUrl?: string;
  metadata: Record<string, any>;
  agentUsed: 'voice' | 'rag' | 'context' | 'coordinator';
}

export interface FullContext {
  user: {
    id: string;
    role: string;
    name: string;
  };
  course: {
    id: string;
    name: string;
    teacherId: string;
    moduleId?: string;
  };
  pedagogical: PedagogicalSettings;
  student: StudentProfile;
  conversation: Conversation;
  recentMessages: ChatMessage[];
}

export interface AgentError {
  code: string;
  message: string;
  agent: string;
  timestamp: Date;
  recoverable: boolean;
}

export interface AgentEvent {
  type: 'message_sent' | 'message_received' | 'voice_started' | 'voice_stopped' | 'error_occurred';
  agent: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface AgentEventListener {
  (event: AgentEvent): void;
}

export interface SupabaseResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// Importar desde pedagogical.ts
import type { PedagogicalSettings, StudentProfile } from './pedagogical';
export type { PedagogicalSettings, StudentProfile };
```

### 2. Tipos Pedagógicos (`types/pedagogical.ts`)

```typescript
// =====================================================
// Tipos para Personalización Pedagógica
// =====================================================

export interface PedagogicalSettings {
  id: string;
  courseId: string;
  teacherId: string;
  teachingStyle: TeachingStyle;
  tonePreference: TonePreference;
  detailLevel: DetailLevel;
  useExamples: boolean;
  encourageQuestions: boolean;
  voiceName: VoiceName;
  voiceSpeed: number;
  systemPromptOverride?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TeachingStyle = 
  | 'socratico'      // Método socrático: preguntas guiadas
  | 'directo'        // Instrucción directa: explicaciones claras
  | 'colaborativo'   // Aprendizaje colaborativo
  | 'constructivista'; // Construcción del conocimiento

export type TonePreference = 
  | 'amigable'       // Tono casual y cercano
  | 'formal'         // Tono académico y profesional
  | 'motivador'      // Tono alentador y positivo
  | 'neutro';        // Tono equilibrado

export type DetailLevel = 
  | 'basico'         // Explicaciones simples
  | 'medio'          // Explicaciones balanceadas
  | 'avanzado';      // Explicaciones técnicas detalladas

export type VoiceName = 
  | 'Kore'           // Femenina, profesional
  | 'Charon'         // Masculina, autoritaria
  | 'Fenrir'         // Masculina, energética
  | 'Aoede'          // Femenina, cálida
  | 'Puck';          // Neutra, amigable

export type LearningStyle = 
  | 'visual'         // Aprende con imágenes
  | 'auditivo'       // Aprende con audio
  | 'kinestesico'    // Aprende con práctica
  | 'lectoescritor'; // Aprende leyendo/escribiendo

export interface StudentProfile {
  id: string;
  studentId: string;
  courseId: string;
  preferredLearningStyle: LearningStyle;
  interactionCount: number;
  avgSessionDuration: number;
  topicsStruggled: string[];
  topicsMastered: string[];
  lastUpdated: Date;
}

// Valores por defecto
export const DEFAULT_PEDAGOGICAL_SETTINGS: Omit<PedagogicalSettings, 'id' | 'courseId' | 'teacherId' | 'createdAt' | 'updatedAt'> = {
  teachingStyle: 'constructivista',
  tonePreference: 'amigable',
  detailLevel: 'medio',
  useExamples: true,
  encourageQuestions: true,
  voiceName: 'Kore',
  voiceSpeed: 1.0
};
```

### 3. Cliente Supabase (`lib/supabase.ts`)

```typescript
// =====================================================
// Cliente Supabase Compartido
// =====================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables not configured');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
```

### 4. Utilidades de Entorno (`utils/env.ts`)

```typescript
// =====================================================
// Resolución de Variables de Entorno
// =====================================================

export function resolveGeminiApiKey(): { key: string | null; missing: boolean } {
  // Intentar múltiples ubicaciones
  const key = 
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null);
  
  return {
    key: key || null,
    missing: !key
  };
}

export function getSupabaseConfig() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    configured: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  };
}
```

### 5. ContextAgent (`agents/ContextAgent.ts`)

```typescript
// =====================================================
// Agente de Contexto - Gestión de Memoria y Personalización
// =====================================================

import { memoryService } from '../services/memoryService';
import { 
  saveConversation, 
  loadConversation as loadConv,
  getPedagogicalSettings, 
  getStudentProfile, 
  updateStudentProfile,
  updateConversationActivity
} from '../services/supabaseService';
import type { 
  Conversation, 
  ChatMessage, 
  ContextWindow, 
  StudentProgress 
} from '../types/agents';
import type { 
  PedagogicalSettings, 
  StudentProfile 
} from '../types/pedagogical';

export class ContextAgent {
  private currentConversation: Conversation | null = null;

  /**
   * Inicializa una nueva conversación
   */
  async initConversation(studentId: string, courseId: string): Promise<Conversation> {
    try {
      const response = await saveConversation(studentId, courseId, {
        agentSystem: 'a2a-multi-agent',
        version: '2.0'
      });

      if (!response.success || !response.data) {
        // Fallback: crear conversación temporal
        const tempConversation: Conversation = {
          id: `temp-${Date.now()}`,
          studentId,
          courseId,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { temp: true }
        };
        this.currentConversation = tempConversation;
        return tempConversation;
      }

      this.currentConversation = response.data;
      await memoryService.initializeConversation(response.data.id);
      return response.data;

    } catch (error) {
      console.error('Error initializing conversation:', error);
      throw error;
    }
  }

  /**
   * Agrega un mensaje a la conversación
   */
  async addMessage(message: ChatMessage): Promise<void> {
    if (!this.currentConversation) {
      throw new Error('No active conversation');
    }

    const success = await memoryService.saveToMemory(message, this.currentConversation.id);
    if (!success) {
      console.warn('Failed to save message to memory');
    }

    await updateConversationActivity(this.currentConversation.id);
  }

  /**
   * Obtiene contexto relevante para una consulta
   */
  async getRelevantContext(query: string): Promise<ContextWindow> {
    return memoryService.getRelevantContext(query);
  }

  /**
   * Obtiene configuración pedagógica del curso
   */
  async getPedagogicalContext(courseId: string): Promise<PedagogicalSettings> {
    const response = await getPedagogicalSettings(courseId);
    
    if (!response.success || !response.data) {
      return this.getDefaultPedagogicalSettings(courseId);
    }
    
    return response.data;
  }

  /**
   * Obtiene perfil del estudiante
   */
  async getStudentContext(studentId: string, courseId: string): Promise<StudentProfile> {
    const response = await getStudentProfile(studentId, courseId);
    
    if (!response.success || !response.data) {
      return this.getDefaultStudentProfile(studentId, courseId);
    }
    
    return response.data;
  }

  /**
   * Actualiza perfil del estudiante
   */
  async updateStudentContext(
    studentId: string,
    courseId: string,
    updates: Partial<StudentProfile>
  ): Promise<void> {
    await updateStudentProfile(studentId, courseId, updates);
  }

  /**
   * Analiza progreso del estudiante
   */
  async analyzeStudentProgress(): Promise<StudentProgress> {
    if (!this.currentConversation) {
      return {
        topicsMastered: [],
        topicsStruggled: [],
        interactionCount: 0,
        avgSessionDuration: 0
      };
    }

    const contextWindow = await this.getRelevantContext('');
    return contextWindow.studentProgress;
  }

  getCurrentConversation(): Conversation | null {
    return this.currentConversation;
  }

  clearContext(): void {
    this.currentConversation = null;
    memoryService.clearMemory();
  }

  private getDefaultPedagogicalSettings(courseId: string): PedagogicalSettings {
    return {
      id: 'default',
      courseId,
      teacherId: 'unknown',
      teachingStyle: 'constructivista',
      tonePreference: 'amigable',
      detailLevel: 'medio',
      useExamples: true,
      encourageQuestions: true,
      voiceName: 'Kore',
      voiceSpeed: 1.0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private getDefaultStudentProfile(studentId: string, courseId: string): StudentProfile {
    return {
      id: 'default',
      studentId,
      courseId,
      preferredLearningStyle: 'lectoescritor',
      interactionCount: 0,
      avgSessionDuration: 0,
      topicsStruggled: [],
      topicsMastered: [],
      lastUpdated: new Date()
    };
  }
}
```

### 6. RAGAgent (`agents/RAGAgent.ts`)

```typescript
// =====================================================
// Agente RAG - Búsqueda Contextual con A2A
// =====================================================

import { ragService } from '../services/ragService';
import type { RAGResponse, ConversationContext } from '../types/agents';
import type { PedagogicalSettings, StudentProfile } from '../types/pedagogical';

export class RAGAgent {
  /**
   * Realiza consulta RAG con contexto personalizado
   */
  async query(question: string, context: ConversationContext): Promise<RAGResponse> {
    try {
      // Construir prompt enriquecido
      const enrichedContext = this.enrichContextWithPedagogy(
        question,
        context.pedagogicalSettings,
        context.studentProfile
      );

      // Llamar al servicio RAG
      const response = await ragService.processQueryWithContext(enrichedContext, context);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'RAG service error');
      }

      // Procesar respuesta
      return this.processRAGResponse(response.data, context);

    } catch (error) {
      console.error('RAG query error:', error);
      return {
        answer: 'Lo siento, ocurrió un error procesando tu consulta. Intenta de nuevo.',
        context: '',
        sources: [],
        confidence: 0,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private enrichContextWithPedagogy(
    question: string,
    settings: PedagogicalSettings,
    profile: StudentProfile
  ): string {
    return `${this.buildSystemPrompt(settings, profile)}\n\nPregunta: ${question}`;
  }

  private buildSystemPrompt(settings: PedagogicalSettings, profile: StudentProfile): string {
    let prompt = `Eres un tutor de IA especializado.`;

    // Estilo pedagógico
    switch (settings.teachingStyle) {
      case 'socratico':
        prompt += ` Usa el método socrático: haz preguntas guiadas.`;
        break;
      case 'directo':
        prompt += ` Proporciona explicaciones claras y estructuradas.`;
        break;
      case 'colaborativo':
        prompt += ` Fomenta la participación y discusión.`;
        break;
      case 'constructivista':
        prompt += ` Ayuda a construir el conocimiento paso a paso.`;
        break;
    }

    // Tono
    switch (settings.tonePreference) {
      case 'amigable':
        prompt += ` Mantén un tono cercano y accesible.`;
        break;
      case 'formal':
        prompt += ` Mantén un tono académico profesional.`;
        break;
      case 'motivador':
        prompt += ` Sé alentador y positivo.`;
        break;
      case 'neutro':
        prompt += ` Mantén un tono equilibrado.`;
        break;
    }

    // Nivel de detalle
    switch (settings.detailLevel) {
      case 'basico':
        prompt += ` Explica de forma simple, evita tecnicismos.`;
        break;
      case 'medio':
        prompt += ` Proporciona explicaciones balanceadas.`;
        break;
      case 'avanzado':
        prompt += ` Incluye detalles técnicos cuando sea apropiado.`;
        break;
    }

    // Estilo de aprendizaje del estudiante
    switch (profile.preferredLearningStyle) {
      case 'visual':
        prompt += ` Incluye descripciones visuales y diagramas conceptuales.`;
        break;
      case 'auditivo':
        prompt += ` Usa analogías y explicaciones narrativas.`;
        break;
      case 'kinestesico':
        prompt += ` Incluye ejemplos prácticos y ejercicios.`;
        break;
      case 'lectoescritor':
        prompt += ` Proporciona explicaciones escritas estructuradas.`;
        break;
    }

    if (settings.useExamples) {
      prompt += ` Siempre incluye ejemplos prácticos.`;
    }

    if (settings.encourageQuestions) {
      prompt += ` Fomenta que el estudiante haga preguntas.`;
    }

    if (profile.topicsStruggled.length > 0) {
      prompt += ` El estudiante tiene dificultades con: ${profile.topicsStruggled.join(', ')}.`;
    }

    if (profile.topicsMastered.length > 0) {
      prompt += ` El estudiante domina: ${profile.topicsMastered.join(', ')}.`;
    }

    prompt += ` Responde basándote ÚNICAMENTE en el contexto proporcionado.`;
    prompt += ` Responde en el mismo idioma que el usuario.`;

    return prompt;
  }

  private processRAGResponse(ragResponse: any, context: ConversationContext): RAGResponse {
    return {
      answer: ragResponse.message,
      context: ragResponse.metadata.contextUsed || '',
      sources: ragResponse.metadata.sources || [],
      confidence: ragResponse.metadata.confidence || 0.8,
      metadata: {
        model: ragResponse.metadata.model,
        timestamp: ragResponse.metadata.timestamp,
        pedagogicalSettings: context.pedagogicalSettings,
        studentProfile: context.studentProfile
      }
    };
  }

  /**
   * Aplica personalización basada en perfil del estudiante
   */
  applyStudentProfile(response: string, profile: StudentProfile): string {
    let personalizedResponse = response;

    switch (profile.preferredLearningStyle) {
      case 'kinestesico':
        if (!response.includes('practica') && !response.includes('ejercicio')) {
          personalizedResponse += '\n\n💡 Te sugiero practicar este concepto con ejercicios prácticos.';
        }
        break;
      // Otros estilos pueden agregar sus propias personalizaciones
    }

    return personalizedResponse;
  }
}
```

### 7. AgentCoordinator (`agents/AgentCoordinator.ts`)

```typescript
// =====================================================
// Coordinador de Agentes - Orquestación Central
// =====================================================

import { RAGAgent } from './RAGAgent';
import { ContextAgent } from './ContextAgent';
// import { VoiceAgent } from './VoiceAgent'; // Opcional
import type { 
  AgentResponse, 
  FullContext, 
  AgentEvent,
  AgentEventListener,
  AgentError
} from '../types/agents';
import type { StudentProfile } from '../types/pedagogical';

export class AgentCoordinator {
  private ragAgent: RAGAgent;
  private contextAgent: ContextAgent;
  // private voiceAgent: VoiceAgent; // Opcional
  private eventListeners: AgentEventListener[] = [];
  private isProcessing: boolean = false;
  private currentContext: FullContext | null = null;
  private cancelCurrentRequest: boolean = false;

  constructor() {
    this.ragAgent = new RAGAgent();
    this.contextAgent = new ContextAgent();
    // this.voiceAgent = new VoiceAgent(); // Opcional
  }

  /**
   * Inicializa el sistema de agentes
   */
  async initialize(
    studentId: string,
    courseId: string,
    user: { id: string; role?: string; name?: string },
    options?: { moduleId?: string }
  ): Promise<void> {
    try {
      console.log('🔄 AgentCoordinator: Inicializando...');

      // 1. Crear conversación
      const conversation = await this.contextAgent.initConversation(studentId, courseId);

      // 2. Obtener contextos con fallbacks
      const [pedagogicalSettings, studentProfile] = await Promise.all([
        this.contextAgent.getPedagogicalContext(courseId).catch(() => this.getDefaultPedagogicalSettings(courseId)),
        this.contextAgent.getStudentContext(studentId, courseId).catch(() => this.getDefaultStudentProfile(studentId, courseId))
      ]);

      // 3. Crear contexto completo
      this.currentContext = {
        user: {
          id: user.id,
          role: user.role || 'student',
          name: user.name || 'Usuario'
        },
        course: {
          id: courseId,
          name: 'Curso',
          teacherId: pedagogicalSettings.teacherId,
          moduleId: options?.moduleId
        },
        pedagogical: pedagogicalSettings,
        student: studentProfile,
        conversation,
        recentMessages: []
      };

      this.emitEvent({
        type: 'message_sent',
        agent: 'coordinator',
        data: { action: 'initialized', conversationId: conversation.id },
        timestamp: new Date()
      });

      console.log('✅ AgentCoordinator: Inicializado correctamente');

    } catch (error) {
      console.error('❌ Error initializing agent system:', error);
      throw error;
    }
  }

  /**
   * Maneja entrada del usuario
   */
  async handleUserInput(input: string): Promise<AgentResponse> {
    this.cancelCurrentRequest = false;

    if (this.isProcessing) {
      this.cancelCurrentResponse();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    this.isProcessing = true;

    try {
      if (!input.trim()) {
        this.isProcessing = false;
        return {
          success: false,
          message: 'Por favor, escribe una pregunta.',
          metadata: { error: 'Empty input' },
          agentUsed: 'coordinator'
        };
      }

      // 1. Agregar mensaje del usuario
      const userMessage = {
        id: Date.now().toString(),
        role: 'user' as const,
        text: input,
        timestamp: new Date(),
        metadata: {}
      };
      await this.contextAgent.addMessage(userMessage);

      // 2. Obtener contexto relevante
      const contextWindow = await this.contextAgent.getRelevantContext(input);

      // 3. Verificar cancelación
      if (this.cancelCurrentRequest) {
        throw new Error('Solicitud cancelada');
      }

      // 4. Construir contexto para RAG
      const conversationContext = {
        studentId: this.currentContext!.user.id,
        courseId: this.currentContext!.course.id,
        moduleId: this.currentContext!.course.moduleId,
        conversationId: this.currentContext!.conversation.id,
        pedagogicalSettings: this.currentContext!.pedagogical,
        studentProfile: this.currentContext!.student,
        recentMessages: contextWindow.messages
      };

      // 5. Consultar RAG
      const ragResponse = await this.ragAgent.query(input, conversationContext);

      // 6. Personalizar respuesta
      const personalizedResponse = this.ragAgent.applyStudentProfile(
        ragResponse.answer,
        this.currentContext!.student
      );

      // 7. Guardar respuesta
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        text: personalizedResponse,
        timestamp: new Date(),
        metadata: {
          confidence: ragResponse.confidence,
          sources: ragResponse.sources
        }
      };
      this.contextAgent.addMessage(assistantMessage).catch(console.warn);

      // 8. Actualizar progreso (background)
      this.updateStudentProgress(input, personalizedResponse).catch(console.warn);

      this.emitEvent({
        type: 'message_received',
        agent: 'rag',
        data: { userMessage: input, response: personalizedResponse },
        timestamp: new Date()
      });

      this.isProcessing = false;

      return {
        success: true,
        message: personalizedResponse,
        metadata: {
          confidence: ragResponse.confidence,
          sources: ragResponse.sources,
          userMessage: input
        },
        agentUsed: 'rag'
      };

    } catch (error) {
      this.isProcessing = false;
      console.error('Error handling input:', error);

      this.emitEvent({
        type: 'error_occurred',
        agent: 'coordinator',
        data: { error: error instanceof Error ? error.message : 'Unknown' },
        timestamp: new Date()
      });

      return {
        success: false,
        message: 'Lo siento, ocurrió un error. Intenta de nuevo.',
        metadata: { error: error instanceof Error ? error.message : 'Unknown' },
        agentUsed: 'coordinator'
      };
    }
  }

  /**
   * Cancela la solicitud actual
   */
  cancelCurrentResponse(): void {
    this.cancelCurrentRequest = true;
    this.isProcessing = false;
  }

  /**
   * Obtiene estado del sistema
   */
  getSystemStatus() {
    return {
      isProcessing: this.isProcessing,
      contextAgent: this.contextAgent.getCurrentConversation(),
      currentContext: this.currentContext
    };
  }

  /**
   * Event listeners
   */
  addEventListener(listener: AgentEventListener): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: AgentEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) this.eventListeners.splice(index, 1);
  }

  private emitEvent(event: AgentEvent): void {
    this.eventListeners.forEach(listener => {
      try { listener(event); } catch (e) { console.error('Event listener error:', e); }
    });
  }

  /**
   * Actualiza progreso del estudiante
   */
  private async updateStudentProgress(userMessage: string, response: string): Promise<void> {
    if (!this.currentContext) return;

    try {
      const progress = await this.contextAgent.analyzeStudentProgress();
      
      const updates: Partial<StudentProfile> = {
        interactionCount: progress.interactionCount + 1,
        lastUpdated: new Date()
      };

      // Detectar dificultades o maestría
      const strugglingIndicators = ['no entiendo', 'confuso', 'difícil', 'ayuda'];
      const masteryIndicators = ['entendido', 'claro', 'perfecto', 'gracias'];

      if (strugglingIndicators.some(i => userMessage.toLowerCase().includes(i))) {
        updates.topicsStruggled = [...this.currentContext.student.topicsStruggled];
      }

      if (masteryIndicators.some(i => userMessage.toLowerCase().includes(i))) {
        updates.topicsMastered = [...this.currentContext.student.topicsMastered];
      }

      await this.contextAgent.updateStudentContext(
        this.currentContext.user.id,
        this.currentContext.course.id,
        updates
      );
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  /**
   * Limpieza
   */
  cleanup(): void {
    this.contextAgent.clearContext();
    this.eventListeners = [];
    this.isProcessing = false;
    this.currentContext = null;
  }

  private getDefaultPedagogicalSettings(courseId: string) {
    return {
      id: 'default', courseId, teacherId: 'unknown',
      teachingStyle: 'constructivista' as const,
      tonePreference: 'amigable' as const,
      detailLevel: 'medio' as const,
      useExamples: true, encourageQuestions: true,
      voiceName: 'Kore' as const, voiceSpeed: 1.0,
      createdAt: new Date(), updatedAt: new Date()
    };
  }

  private getDefaultStudentProfile(studentId: string, courseId: string) {
    return {
      id: 'default', studentId, courseId,
      preferredLearningStyle: 'lectoescritor' as const,
      interactionCount: 0, avgSessionDuration: 0,
      topicsStruggled: [], topicsMastered: [],
      lastUpdated: new Date()
    };
  }
}
```

### 8. RAG Service (`services/ragService.ts`) - Simplificado

```typescript
// =====================================================
// Servicio RAG - Core con Gemini y Supabase
// =====================================================

import { supabase } from '../lib/supabase';
import { resolveGeminiApiKey } from '../utils/env';
import type { ConversationContext, SupabaseResponse } from '../types/agents';

interface RAGServiceResponse {
  message: string;
  metadata: {
    model: string;
    source: string;
    contextUsed: string;
    timestamp: string;
    confidence: number;
    sources: string[];
  };
}

class RAGService {
  private readonly model = 'gemini-2.0-flash-exp';
  private readonly maxContextLength = 4000;
  private readonly maxSources = 5;

  async processQueryWithContext(
    query: string,
    context: ConversationContext
  ): Promise<SupabaseResponse<RAGServiceResponse>> {
    try {
      const { key: apiKey, missing } = resolveGeminiApiKey();
      
      if (missing) {
        return {
          success: false,
          error: 'GEMINI_API_KEY no configurada',
          data: null
        };
      }

      // 1. Obtener contenido relevante
      const relevantContent = await this.getRelevantContent(query, context.courseId);

      // 2. Construir prompt con contexto
      const contextText = relevantContent.map(c => c.content).join('\n\n').slice(0, this.maxContextLength);
      
      const systemPrompt = `Eres un tutor de IA. Responde basándote ÚNICAMENTE en este contexto:

${contextText}

Si la información no está en el contexto, di: "No encuentro esa información en el material disponible."`;

      const fullPrompt = `${systemPrompt}\n\nPregunta del estudiante: ${query}`;

      // 3. Llamar a Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
              topP: 0.8,
              topK: 40
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const result = await response.json();
      const answerText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';

      return {
        success: true,
        data: {
          message: answerText,
          metadata: {
            model: this.model,
            source: 'gemini-direct',
            contextUsed: contextText.slice(0, 500),
            timestamp: new Date().toISOString(),
            confidence: 0.85,
            sources: relevantContent.map(c => c.title || 'Material del curso')
          }
        },
        error: null
      };

    } catch (error) {
      console.error('RAG processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  }

  private async getRelevantContent(
    query: string,
    courseId: string
  ): Promise<Array<{ title: string; content: string }>> {
    try {
      const courseIdInt = parseInt(courseId, 10);
      if (isNaN(courseIdInt)) return [];

      // Primero: búsqueda de texto completo (sin costo)
      const { data: textResults, error: textError } = await supabase.rpc(
        'search_course_content_chunks_text',
        {
          search_query: query,
          course_id_param: courseIdInt,
          result_limit: this.maxSources
        }
      );

      if (!textError && textResults && textResults.length > 0) {
        return textResults.map((chunk: any) => ({
          title: chunk.metadata?.sourceFileName || 'Material',
          content: chunk.content
        }));
      }

      // Fallback: búsqueda vectorial (requiere embedding)
      const { key: apiKey } = resolveGeminiApiKey();
      if (!apiKey) return [];

      // Generar embedding
      const embeddingResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text: query }] },
            taskType: 'RETRIEVAL_QUERY'
          })
        }
      );

      if (!embeddingResponse.ok) return [];

      const embeddingResult = await embeddingResponse.json();
      const embedding = embeddingResult.embedding?.values;
      if (!embedding) return [];

      // Búsqueda vectorial
      const { data: vectorResults, error: vectorError } = await supabase.rpc(
        'search_course_content_chunks',
        {
          query_embedding: `[${embedding.join(',')}]`,
          course_id_param: courseId,
          match_threshold: 0.5,
          match_count: this.maxSources
        }
      );

      if (vectorError || !vectorResults) return [];

      return vectorResults.map((chunk: any) => ({
        title: chunk.metadata?.sourceFileName || 'Material',
        content: chunk.content
      }));

    } catch (error) {
      console.error('Error getting relevant content:', error);
      return [];
    }
  }
}

export const ragService = new RAGService();
```

---

## 🎯 EJEMPLO DE USO

### Hook de React

```typescript
// hooks/useAgentSystem.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { AgentCoordinator } from '../agents/AgentCoordinator';
import type { AgentResponse, ChatMessage } from '../types/agents';

interface UseAgentSystemOptions {
  studentId: string;
  courseId: string;
  user: { id: string; name?: string; role?: string };
  moduleId?: string;
}

export function useAgentSystem(options: UseAgentSystemOptions) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const coordinatorRef = useRef<AgentCoordinator | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const coordinator = new AgentCoordinator();
        await coordinator.initialize(
          options.studentId,
          options.courseId,
          options.user,
          { moduleId: options.moduleId }
        );
        coordinatorRef.current = coordinator;
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error de inicialización');
      }
    };

    init();

    return () => {
      coordinatorRef.current?.cleanup();
    };
  }, [options.studentId, options.courseId]);

  const sendMessage = useCallback(async (text: string): Promise<AgentResponse | null> => {
    if (!coordinatorRef.current || !isInitialized) {
      setError('Sistema no inicializado');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Agregar mensaje del usuario inmediatamente
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // Obtener respuesta
      const response = await coordinatorRef.current.handleUserInput(text);

      if (response.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: response.message,
          timestamp: new Date(),
          metadata: response.metadata
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setError(response.message);
      }

      return response;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error enviando mensaje');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const cancelRequest = useCallback(() => {
    coordinatorRef.current?.cancelCurrentResponse();
    setIsLoading(false);
  }, []);

  return {
    isInitialized,
    isLoading,
    messages,
    error,
    sendMessage,
    cancelRequest,
    clearError: () => setError(null)
  };
}
```

### Componente de Chat

```tsx
// components/ChatInterface.tsx
import React, { useState } from 'react';
import { useAgentSystem } from '../hooks/useAgentSystem';

interface ChatInterfaceProps {
  studentId: string;
  courseId: string;
  user: { id: string; name?: string };
}

export function ChatInterface({ studentId, courseId, user }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const { isInitialized, isLoading, messages, error, sendMessage } = useAgentSystem({
    studentId,
    courseId,
    user
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    await sendMessage(input);
    setInput('');
  };

  if (!isInitialized) {
    return <div>Inicializando tutor...</div>;
  }

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="content">{msg.text}</div>
            {msg.metadata?.sources && (
              <div className="sources">
                Fuentes: {msg.metadata.sources.join(', ')}
              </div>
            )}
          </div>
        ))}
        {isLoading && <div className="loading">Pensando...</div>}
      </div>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

1. [ ] Instalar dependencias npm
2. [ ] Configurar variables de entorno
3. [ ] Ejecutar scripts SQL en Supabase
4. [ ] Crear estructura de archivos
5. [ ] Implementar tipos base
6. [ ] Implementar cliente Supabase
7. [ ] Implementar servicios (ragService, memoryService, supabaseService)
8. [ ] Implementar agentes (ContextAgent, RAGAgent, AgentCoordinator)
9. [ ] Implementar hook useAgentSystem
10. [ ] Crear componente de chat
11. [ ] Probar flujo completo
12. [ ] Opcional: Implementar VoiceAgent

---

## 🔧 TROUBLESHOOTING

### Error: "GEMINI_API_KEY no configurada"
- Verifica que `VITE_GEMINI_API_KEY` esté en tu `.env`
- Reinicia el servidor de desarrollo

### Error: "function search_course_content_chunks does not exist"
- Ejecuta el script SQL de funciones RPC en Supabase

### Las respuestas son genéricas
- Verifica que hay chunks en `course_content_chunks` para tu curso
- Revisa que los embeddings estén generados (columna `embedding` no null)

### Error de CORS
- Configura las políticas CORS en Supabase Dashboard

---

**Fin del documento de implementación A2A Core**
