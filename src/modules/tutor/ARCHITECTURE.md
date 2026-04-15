# Arquitectura del Audio-Tutor Multi-Agente

## Documentación operativa actualizada (2026-03)

El flujo RAG **no usa n8n** en la ruta principal: consultas directas vía **`RAGService`** (Supabase + Gemini). Para arquitectura A2A, flujo de mensajes, cambios recientes y **motivos** de cada ajuste, ver en el repo:

`AI_CONTEXT/04_FEATURES/TUTOR_A2A_AGENTES_DOCUMENTACION_2026-03-26.md`

## Visión General

El Audio-Tutor Multi-Agente implementa una arquitectura distribuida donde diferentes agentes especializados colaboran para proporcionar una experiencia de tutoría personalizada y contextual.

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                        │
├─────────────────────────────────────────────────────────────────┤
│  App.tsx                                                       │
│  ├── useAgentSystem()                                         │
│  ├── useCourseContext()                                       │
│  ├── CourseSelector                                           │
│  └── PedagogicalSettings                                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Coordinator                           │
├─────────────────────────────────────────────────────────────────┤
│  - Orquesta la comunicación entre agentes                     │
│  - Gestiona el ciclo de vida de conversaciones                │
│  - Prioriza respuestas y maneja errores                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│   Voice Agent       │ │   RAG Agent     │ │  Context Agent      │
├─────────────────────┤ ├─────────────────┤ ├─────────────────────┤
│ - Speech-to-Text    │ │ - n8n Webhook   │ │ - Memoria Supabase  │
│ - Text-to-Speech    │ │ - Vector Search │ │ - Perfiles Usuario  │
│ - Audio Control     │ │ - Context Enrich│ │ - Config Pedagógica │
└─────────────────────┘ └─────────────────┘ └─────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│   Gemini 2.5 Flash  │ │   n8n Workflow  │ │   Supabase DB       │
│   - TTS Avanzado    │ │   - RAG Pipeline│ │   - PostgreSQL      │
│   - Text Generation │ │   - Personaliz. │ │   - pgvector        │
│   - Voice Synthesis │ │   - Context Mgmt│ │   - RLS Policies    │
└─────────────────────┘ └─────────────────┘ └─────────────────────┘
```

## Componentes Principales

### 1. Agent Coordinator

**Responsabilidad**: Orquestación central de todos los agentes

```typescript
class AgentCoordinator {
  private voiceAgent: VoiceAgent;
  private ragAgent: RAGAgent;
  private contextAgent: ContextAgent;
  
  async handleUserInput(input: string | AudioBlob): Promise<Response>
  private async route(message: Message): Promise<AgentResponse>
  private async orchestrate(query: string, context: FullContext): Promise<string>
}
```

**Flujo de Procesamiento**:
1. Recibe entrada del usuario (texto o audio)
2. Si es audio, delega a VoiceAgent para transcripción
3. Enriquece contexto con ContextAgent
4. Consulta información con RAGAgent
5. Genera respuesta con Gemini
6. Sintetiza audio con VoiceAgent
7. Almacena en memoria con ContextAgent

### 2. Voice Agent

**Responsabilidad**: Manejo de entrada/salida de audio

```typescript
class VoiceAgent {
  // Entrada de audio
  async startListening(): Promise<string>
  stopListening(): void
  
  // Salida de audio
  async speak(text: string, voiceSettings?: VoiceConfig): Promise<void>
  pauseSpeech(): void
  resumeSpeech(): void
  stopSpeech(): void
  
  // Estado
  getStatus(): VoiceAgentStatus
}
```

**Características**:
- Speech-to-Text usando Web Speech API
- Text-to-Speech con Gemini 2.5 Flash TTS
- Soporte para 5 voces diferentes (Kore, Charon, Fenrir, Aoede, Puck)
- Control de velocidad, tono y expresividad
- Manejo de interrupciones naturales

### 3. RAG Agent

**Responsabilidad**: Búsqueda contextual de información

```typescript
class RAGAgent {
  async query(question: string, context: ConversationContext): Promise<RAGResponse>
  enrichContextWithPedagogy(baseContext: string, settings: PedagogicalSettings): string
  applyStudentProfile(response: string, profile: StudentProfile): string
}
```

**Integración con n8n**:
- Envía consultas con contexto enriquecido
- Incluye configuración pedagógica del docente
- Incorpora perfil de aprendizaje del estudiante
- Procesa respuestas contextuales

### 4. Context Agent

**Responsabilidad**: Gestión de memoria y personalización

```typescript
class ContextAgent {
  // Gestión de conversación
  async initConversation(studentId: string, courseId: string): Promise<Conversation>
  async loadConversation(conversationId: string): Promise<Conversation>
  
  // Memoria
  async addMessage(message: ChatMessage): Promise<void>
  async getRelevantContext(query: string): Promise<ContextWindow>
  
  // Personalización
  async getPedagogicalContext(courseId: string): Promise<PedagogicalSettings>
  async getStudentContext(studentId: string, courseId: string): Promise<StudentProfile>
}
```

**Tipos de Memoria**:
- **Memoria de Sesión**: localStorage para contexto inmediato
- **Memoria a Largo Plazo**: Supabase para persistencia
- **Memoria Contextual**: Ventana deslizante de conversación
- **Memoria Personalizada**: Perfiles y configuraciones

## Flujo de Datos

### 1. Inicialización
```
Usuario → App.tsx → useAgentSystem → AgentCoordinator
                ↓
        ContextAgent.initConversation()
                ↓
        Supabase: Crear/recuperar conversación
```

### 2. Procesamiento de Entrada
```
Usuario (audio/texto) → VoiceAgent (si audio)
                ↓
        ContextAgent.getRelevantContext()
                ↓
        RAGAgent.query() → n8n Webhook
                ↓
        Gemini 2.5 Flash (generación)
                ↓
        VoiceAgent.speak() (si audio)
                ↓
        ContextAgent.addMessage()
```

### 3. Personalización
```
Query → ContextAgent.getPedagogicalContext()
                ↓
        Supabase: course_pedagogical_settings
                ↓
        ContextAgent.getStudentContext()
                ↓
        Supabase: student_learning_profiles
                ↓
        RAGAgent.enrichContextWithPedagogy()
```

## Base de Datos

### Tablas Principales

#### `tutor_conversations`
```sql
CREATE TABLE tutor_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    started_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);
```

#### `tutor_messages`
```sql
CREATE TABLE tutor_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES tutor_conversations(id),
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    audio_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);
```

#### `course_pedagogical_settings`
```sql
CREATE TABLE course_pedagogical_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    teacher_id UUID REFERENCES users(id),
    teaching_style TEXT, -- 'socratico', 'directo', 'colaborativo', 'constructivista'
    tone_preference TEXT DEFAULT 'amigable',
    detail_level TEXT DEFAULT 'medio',
    use_examples BOOLEAN DEFAULT true,
    encourage_questions BOOLEAN DEFAULT true,
    voice_name TEXT DEFAULT 'Kore',
    voice_speed NUMERIC DEFAULT 1.0,
    system_prompt_override TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(course_id)
);
```

### Políticas RLS

```sql
-- Estudiantes pueden ver sus propias conversaciones
CREATE POLICY "Students can view own conversations"
    ON tutor_conversations FOR SELECT
    USING (auth.uid() = student_id);

-- Docentes pueden gestionar configuración de sus cursos
CREATE POLICY "Teachers can manage course settings"
    ON course_pedagogical_settings FOR ALL
    USING (teacher_id = auth.uid());
```

## Integración con n8n

### Webhook de Entrada
```json
{
  "query": "¿Qué es la fotosíntesis?",
  "context": {
    "studentId": "uuid",
    "courseId": "uuid",
    "conversationId": "uuid",
    "pedagogicalSettings": {
      "teachingStyle": "constructivista",
      "tonePreference": "amigable",
      "detailLevel": "medio"
    },
    "studentProfile": {
      "learningStyle": "visual",
      "topicsStruggled": ["química orgánica"],
      "topicsMastered": ["biología celular"]
    }
  }
}
```

### Respuesta del Webhook
```json
{
  "response": "La fotosíntesis es el proceso...",
  "sources": [
    {
      "title": "Capítulo 3: Fotosíntesis",
      "url": "https://...",
      "relevance": 0.95
    }
  ],
  "personalization": {
    "appliedStyle": "constructivista",
    "examplesIncluded": true,
    "questionsEncouraged": true
  }
}
```

## Configuración de Voces

### Voces Disponibles
- **Kore**: Voz femenina, cálida y profesional
- **Charon**: Voz masculina, profunda y autoritaria
- **Fenrir**: Voz neutra, clara y directa
- **Aoede**: Voz femenina, expresiva y motivadora
- **Puck**: Voz masculina, amigable y conversacional

### Configuración de Voz
```typescript
interface VoiceConfig {
  voiceName: 'Kore' | 'Charon' | 'Fenrir' | 'Aoede' | 'Puck';
  speed: number; // 0.5 a 2.0
  pitch?: number; // Opcional
  volume?: number; // Opcional
}
```

## Personalización Pedagógica

### Estilos de Enseñanza

#### Socrático
- Preguntas guiadas
- Fomenta el descubrimiento
- Respuestas reflexivas

#### Directo
- Explicaciones claras
- Información estructurada
- Respuestas concisas

#### Colaborativo
- Fomenta la participación
- Preguntas abiertas
- Respuestas interactivas

#### Constructivista
- Construcción del conocimiento
- Conexiones con experiencias
- Respuestas contextuales

### Niveles de Detalle

#### Básico
- Conceptos fundamentales
- Lenguaje simple
- Ejemplos básicos

#### Medio
- Explicaciones balanceadas
- Términos técnicos explicados
- Ejemplos prácticos

#### Avanzado
- Conceptos complejos
- Terminología técnica
- Ejemplos especializados

## Monitoreo y Métricas

### KPIs Principales
- **Latencia de Respuesta**: < 3 segundos
- **Tasa de Personalización**: 100%
- **Persistencia de Memoria**: 100%
- **Satisfacción de Usuario**: > 4.5/5

### Logs Importantes
- Interacciones entre agentes
- Errores de personalización
- Rendimiento de n8n
- Uso de memoria y contexto

### Alertas
- Latencia > 5 segundos
- Error de personalización
- Fallo de n8n
- Memoria llena

## Escalabilidad

### Horizontal
- Múltiples instancias de agentes
- Load balancing en n8n
- Replicación de Supabase

### Vertical
- Optimización de consultas SQL
- Cache de configuración pedagógica
- Compresión de mensajes

## Seguridad

### Autenticación
- JWT tokens de Supabase
- Verificación de roles
- Expiración de sesiones

### Autorización
- RLS en todas las tablas
- Validación de permisos
- Auditoría de accesos

### Privacidad
- Encriptación de mensajes sensibles
- Anonimización de datos
- Cumplimiento GDPR

## Troubleshooting

### Problemas Comunes

#### Latencia Alta
1. Verificar conexión a n8n
2. Revisar consultas SQL
3. Optimizar contexto

#### Personalización Fallida
1. Verificar configuración pedagógica
2. Revisar perfil de estudiante
3. Validar datos de Supabase

#### Error de Audio
1. Verificar permisos del navegador
2. Revisar configuración de voz
3. Validar API de Gemini

### Logs de Debug
```typescript
// Habilitar logs detallados
const DEBUG_MODE = process.env.NODE_ENV === 'development';

if (DEBUG_MODE) {
  console.log('Agent interaction:', {
    agent: 'VoiceAgent',
    action: 'speak',
    text: text.substring(0, 100),
    voiceConfig
  });
}
```
