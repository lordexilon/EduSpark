# Migración del Workflow n8n - Audio-Tutor Multi-Agente

## Resumen

Este documento describe la migración del workflow n8n existente para incluir personalización pedagógica completa del Audio-Tutor Multi-Agente.

## Cambios Principales

### 1. Nuevos Nodos Agregados

#### Load Pedagogical Context
- **Tipo**: Supabase Query
- **Tabla**: `course_pedagogical_settings`
- **Propósito**: Cargar configuración pedagógica del docente para el curso
- **Datos**: Estilo de enseñanza, tono, nivel de detalle, configuración de voz

#### Load Student Profile
- **Tipo**: Supabase Query
- **Tabla**: `student_learning_profiles`
- **Propósito**: Cargar perfil de aprendizaje del estudiante
- **Datos**: Estilo de aprendizaje, temas dominados/estudiados, nivel de dificultad

#### Load Conversation Context
- **Tipo**: Supabase Query
- **Tabla**: `tutor_conversations`
- **Propósito**: Cargar contexto de conversación persistente
- **Datos**: ID de conversación, timestamps, metadatos

#### Merge Personalization Context
- **Tipo**: Code
- **Propósito**: Combinar todos los contextos de personalización
- **Funcionalidad**: Generar system prompt personalizado

### 2. Nodos Modificados

#### Normalize Inputs
- **Cambios**: Validación mejorada de entrada
- **Nuevo**: Validación de contexto requerido (studentId, courseId)

#### Prepare Vector Search
- **Cambios**: Enriquecimiento de consulta con contexto personalizado
- **Nuevo**: Incluye estilo de aprendizaje y metodología pedagógica

#### Vector Search
- **Cambios**: Búsqueda vectorial con personalización
- **Nuevo**: Considera perfil del estudiante en la relevancia

#### Generate Answer
- **Cambios**: Generación con prompt personalizado
- **Nuevo**: Usa system prompt generado dinámicamente

#### Format Response
- **Cambios**: Respuesta con metadatos de personalización
- **Nuevo**: Incluye información de personalización aplicada

## Flujo de Datos Actualizado

```
1. Webhook Trigger
   ↓
2. Normalize Inputs
   ↓
3. Load Pedagogical Context ──┐
   ↓                         │
4. Load Student Profile ─────┼──┐
   ↓                         │  │
5. Load Conversation Context ┼──┼──┐
   ↓                         │  │  │
6. Load Course Materials     │  │  │
   ↓                         │  │  │
7. Prepare Vector Search     │  │  │
   ↓                         │  │  │
8. Generate Query Embedding  │  │  │
   ↓                         │  │  │
9. Vector Search             │  │  │
   ↓                         │  │  │
10. Merge Personalization Context ←┘
    ↓
11. Generate Answer (personalizado)
    ↓
12. Format Response (con personalización)
    ↓
13. Return Response
```

## Configuración Requerida

### 1. Credenciales de n8n

#### Supabase API
- **ID**: `supabase-credentials`
- **URL**: `https://your-project.supabase.co`
- **Service Key**: `your_service_role_key`

#### Google Gemini API
- **ID**: `gemini-credentials`
- **API Key**: `your_gemini_api_key`

#### OpenAI API
- **ID**: `openai-credentials`
- **API Key**: `your_openai_api_key`

### 2. Variables de Entorno

```bash
# n8n
N8N_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# APIs
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Base de Datos

Asegúrate de que las siguientes tablas existan:

```sql
-- Configuración pedagógica
CREATE TABLE course_pedagogical_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id),
  teacher_id UUID REFERENCES users(id),
  teaching_style TEXT,
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

-- Perfiles de aprendizaje
CREATE TABLE student_learning_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  preferred_learning_style TEXT DEFAULT 'visual',
  topics_struggled TEXT[],
  topics_mastered TEXT[],
  difficulty_level TEXT DEFAULT 'medio',
  preferred_examples TEXT DEFAULT 'practicos',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- Conversaciones del tutor
CREATE TABLE tutor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  started_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Materiales del curso
CREATE TABLE course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Proceso de Migración

### 1. Preparación

```bash
# Validar workflow
npm run n8n:validate

# Crear backup del workflow actual
cp n8n-workflows/rag-student-query.json n8n-workflows/backups/rag-student-query-backup.json
```

### 2. Migración Automática

```bash
# Ejecutar migración
npm run n8n:migrate
```

### 3. Migración Manual

Si la migración automática falla:

1. **Importar workflow**:
   - Abrir n8n en el navegador
   - Ir a Workflows > Import
   - Seleccionar `n8n-workflows/rag-student-query-personalized.json`

2. **Configurar credenciales**:
   - Configurar credenciales de Supabase
   - Configurar credenciales de Google Gemini
   - Configurar credenciales de OpenAI

3. **Activar workflow**:
   - Hacer clic en "Activate"
   - Verificar que el webhook esté funcionando

### 4. Validación Post-Migración

```bash
# Validar workflow migrado
npm run n8n:validate

# Probar webhook
curl -X POST http://localhost:5678/webhook/rag-student-query-personalized \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Qué es la fotosíntesis?",
    "context": {
      "studentId": "student-visual-001",
      "courseId": "course-biology-001",
      "conversationId": "test-conv-001"
    }
  }'
```

## Testing del Workflow

### 1. Casos de Prueba

#### Estudiante Visual + Docente Socrático
```json
{
  "query": "¿Qué es la fotosíntesis?",
  "context": {
    "studentId": "student-visual-001",
    "courseId": "course-biology-001",
    "conversationId": "test-conv-001"
  }
}
```

**Respuesta Esperada**:
- `personalization.appliedStyle`: "socratico"
- `personalization.learningStyle`: "visual"
- `personalization.examplesIncluded`: true
- `personalization.questionsEncouraged`: true

#### Estudiante Auditivo + Docente Directo
```json
{
  "query": "Explica la síntesis de proteínas",
  "context": {
    "studentId": "student-auditory-002",
    "courseId": "course-chemistry-002",
    "conversationId": "test-conv-002"
  }
}
```

**Respuesta Esperada**:
- `personalization.appliedStyle`: "directo"
- `personalization.learningStyle`: "auditory"
- `personalization.toneApplied`: "formal"

#### Estudiante Kinestésico + Docente Constructivista
```json
{
  "query": "¿Cómo funciona un laboratorio?",
  "context": {
    "studentId": "student-kinesthetic-003",
    "courseId": "course-physics-003",
    "conversationId": "test-conv-003"
  }
}
```

**Respuesta Esperada**:
- `personalization.appliedStyle`: "constructivista"
- `personalization.learningStyle`: "kinesthetic"
- `personalization.toneApplied`: "motivador"

### 2. Validación de Respuesta

La respuesta debe incluir:

```json
{
  "response": "Respuesta personalizada del tutor",
  "sources": [
    {
      "title": "Título del material",
      "url": "URL del material",
      "relevance": 0.95,
      "type": "text"
    }
  ],
  "personalization": {
    "appliedStyle": "socratico",
    "learningStyle": "visual",
    "examplesIncluded": true,
    "questionsEncouraged": true,
    "detailLevel": "medio",
    "toneApplied": "amigable",
    "voiceSettings": {
      "name": "Kore",
      "speed": 1.0
    }
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "conversationId": "conv-001",
    "courseId": "course-001",
    "studentId": "student-001",
    "query": "Pregunta original",
    "materialsUsed": 3,
    "processingTime": 1500
  }
}
```

## Monitoreo y Debugging

### 1. Logs Importantes

- **Webhook Trigger**: Entrada de consultas
- **Normalize Inputs**: Validación de datos
- **Load Pedagogical Context**: Carga de configuración
- **Load Student Profile**: Carga de perfil
- **Merge Personalization Context**: Combinación de contextos
- **Generate Answer**: Generación de respuesta
- **Format Response**: Formateo final

### 2. Métricas a Monitorear

- **Latencia**: Tiempo total de procesamiento
- **Personalización**: Tasa de personalización exitosa
- **Errores**: Errores por nodo
- **Uso de materiales**: Número de materiales utilizados

### 3. Alertas

- Error en carga de configuración pedagógica
- Error en carga de perfil de estudiante
- Error en generación de respuesta
- Latencia > 5 segundos

## Rollback

### 1. Restaurar Workflow Anterior

```bash
# Restaurar desde backup
cp n8n-workflows/backups/rag-student-query-backup.json n8n-workflows/rag-student-query.json

# Reimportar en n8n
# Ir a Workflows > Import > Seleccionar archivo de backup
```

### 2. Verificar Funcionalidad

- Probar webhook básico
- Verificar que las respuestas funcionen
- Confirmar que no hay errores críticos

### 3. Identificar Problemas

- Revisar logs de n8n
- Verificar configuración de credenciales
- Validar datos de base de datos

## Optimización

### 1. Rendimiento

- **Cache**: Implementar cache para consultas frecuentes
- **Paralelización**: Ejecutar consultas en paralelo cuando sea posible
- **Límites**: Establecer límites de tiempo para cada nodo

### 2. Escalabilidad

- **Load Balancing**: Distribuir carga entre múltiples instancias
- **Queue**: Implementar cola para procesamiento asíncrono
- **Monitoring**: Monitoreo en tiempo real

### 3. Mantenimiento

- **Logs**: Rotación automática de logs
- **Backups**: Backups automáticos del workflow
- **Updates**: Actualizaciones regulares de dependencias

## Conclusión

La migración del workflow n8n incluye:

- ✅ **Personalización pedagógica completa**
- ✅ **Perfiles de aprendizaje adaptativos**
- ✅ **Contexto de conversación persistente**
- ✅ **Respuestas contextuales inteligentes**
- ✅ **Metadatos de personalización detallados**
- ✅ **Herramientas de validación y migración**

Siguiendo esta guía, puedes migrar exitosamente el workflow n8n para soportar la personalización pedagógica del Audio-Tutor Multi-Agente.

---

**Fecha de migración**: $(date)
**Versión del workflow**: 2.0.0
**Estado**: ✅ COMPLETADO
