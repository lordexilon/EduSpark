# Guía de Migración del Workflow n8n

## Resumen

Esta guía describe cómo actualizar el workflow de n8n existente para soportar la personalización pedagógica del Audio-Tutor Multi-Agente.

## Cambios Requeridos

### 1. Nuevos Nodos a Agregar

#### Nodo "Load Pedagogical Context"
**Posición**: Después de "Normalize Inputs"
**Tipo**: Supabase Query

```json
{
  "name": "Load Pedagogical Context",
  "type": "n8n-nodes-base.supabase",
  "parameters": {
    "operation": "select",
    "table": "course_pedagogical_settings",
    "filterType": "manual",
    "conditions": {
      "course_id": "={{ $json.courseId }}"
    }
  }
}
```

#### Nodo "Load Student Profile"
**Posición**: Paralelo a "Load Pedagogical Context"
**Tipo**: Supabase Query

```json
{
  "name": "Load Student Profile",
  "type": "n8n-nodes-base.supabase",
  "parameters": {
    "operation": "select",
    "table": "student_learning_profiles",
    "filterType": "manual",
    "conditions": {
      "student_id": "={{ $json.studentId }}",
      "course_id": "={{ $json.courseId }}"
    }
  }
}
```

#### Nodo "Merge Personalization Context"
**Posición**: Antes de "Generate Answer"
**Tipo**: Code

```javascript
// Código para combinar contextos
const pedagogicalSettings = $input.first().json;
const studentProfile = $input.last().json;
const originalQuery = $('Normalize Inputs').first().json.query;

// Crear contexto personalizado
const personalizedContext = {
  originalQuery,
  pedagogicalSettings: pedagogicalSettings[0] || {},
  studentProfile: studentProfile[0] || {},
  timestamp: new Date().toISOString()
};

// Generar system prompt personalizado
const systemPrompt = generatePersonalizedPrompt(personalizedContext);

return {
  json: {
    ...personalizedContext,
    systemPrompt
  }
};

function generatePersonalizedPrompt(context) {
  const { pedagogicalSettings, studentProfile, originalQuery } = context;
  
  let prompt = `Eres EduSpark, un tutor de IA para el curso "{{course_name}}".\n\n`;
  
  // Estilo pedagógico
  if (pedagogicalSettings.teaching_style) {
    prompt += `ESTILO PEDAGÓGICO DEL DOCENTE:\n`;
    prompt += `- Metodología: ${pedagogicalSettings.teaching_style}\n`;
    prompt += `- Tono: ${pedagogicalSettings.tone_preference || 'amigable'}\n`;
    prompt += `- Nivel de detalle: ${pedagogicalSettings.detail_level || 'medio'}\n`;
    
    if (pedagogicalSettings.use_examples) {
      prompt += `- Incluye ejemplos prácticos\n`;
    }
    
    if (pedagogicalSettings.encourage_questions) {
      prompt += `- Fomenta preguntas del estudiante\n`;
    }
    prompt += `\n`;
  }
  
  // Perfil del estudiante
  if (studentProfile.preferred_learning_style) {
    prompt += `PERFIL DEL ESTUDIANTE:\n`;
    prompt += `- Estilo de aprendizaje: ${studentProfile.preferred_learning_style}\n`;
    
    if (studentProfile.topics_struggled && studentProfile.topics_struggled.length > 0) {
      prompt += `- Temas que requieren refuerzo: ${studentProfile.topics_struggled.join(', ')}\n`;
    }
    
    if (studentProfile.topics_mastered && studentProfile.topics_mastered.length > 0) {
      prompt += `- Temas dominados: ${studentProfile.topics_mastered.join(', ')}\n`;
    }
    prompt += `\n`;
  }
  
  // Instrucciones
  prompt += `INSTRUCCIONES:\n`;
  prompt += `1. Responde basándote ÚNICAMENTE en el contexto del material\n`;
  prompt += `2. Adapta tu respuesta al estilo pedagógico indicado\n`;
  prompt += `3. Considera el estilo de aprendizaje del estudiante\n`;
  prompt += `4. Si no encuentras la respuesta: "No encuentro esa información en el material del curso"\n`;
  prompt += `5. Mantén un tono ${pedagogicalSettings.tone_preference || 'amigable'}\n`;
  
  return prompt;
}
```

### 2. Modificar Nodo "Generate Answer"

**Cambios**:
- Usar el system prompt personalizado
- Ajustar temperatura según nivel de detalle
- Incluir contexto de personalización

```json
{
  "name": "Generate Answer",
  "type": "n8n-nodes-base.googleGemini",
  "parameters": {
    "model": "gemini-2.5-flash",
    "systemPrompt": "={{ $json.systemPrompt }}",
    "prompt": "={{ $json.originalQuery }}\n\nCONTEXTO DEL MATERIAL:\n{{ $json.ragContext }}",
    "temperature": "={{ $json.pedagogicalSettings.detail_level === 'avanzado' ? 0.7 : 0.5 }}",
    "maxTokens": 1000
  }
}
```

### 3. Actualizar Nodo "Format Response"

**Cambios**:
- Incluir información de personalización aplicada
- Agregar metadatos de contexto

```json
{
  "name": "Format Response",
  "type": "n8n-nodes-base.code",
  "parameters": {
    "jsCode": "// Formatear respuesta con personalización\nconst geminiResponse = $input.first().json;\nconst personalizationContext = $('Merge Personalization Context').first().json;\n\nreturn {\n  json: {\n    response: geminiResponse.text,\n    sources: geminiResponse.sources || [],\n    personalization: {\n      appliedStyle: personalizationContext.pedagogicalSettings.teaching_style,\n      examplesIncluded: personalizationContext.pedagogicalSettings.use_examples,\n      questionsEncouraged: personalizationContext.pedagogicalSettings.encourage_questions,\n      learningStyle: personalizationContext.studentProfile.preferred_learning_style\n    },\n    metadata: {\n      timestamp: new Date().toISOString(),\n      courseId: personalizationContext.courseId,\n      studentId: personalizationContext.studentId,\n      conversationId: personalizationContext.conversationId\n    }\n  }\n}"
  }
}
```

## Estructura del Workflow Actualizado

```
1. Webhook Trigger
   ↓
2. Normalize Inputs
   ↓
3. Load Pedagogical Context ──┐
   ↓                         │
4. Load Student Profile ─────┼──┐
   ↓                         │  │
5. Load Course Materials     │  │
   ↓                         │  │
6. Vector Search             │  │
   ↓                         │  │
7. Merge Personalization Context ←┘
   ↓
8. Generate Answer (personalizado)
   ↓
9. Format Response (con personalización)
   ↓
10. Return Response
```

## Configuración de Supabase

### Variables de Entorno en n8n
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

### Configuración del Nodo Supabase
1. **URL**: `{{ $env.SUPABASE_URL }}`
2. **API Key**: `{{ $env.SUPABASE_SERVICE_KEY }}`
3. **Table**: `course_pedagogical_settings` / `student_learning_profiles`

## Testing del Workflow

### Casos de Prueba

#### 1. Estudiante con Perfil Visual
```json
{
  "query": "¿Cómo funciona la fotosíntesis?",
  "studentId": "student-visual-uuid",
  "courseId": "biology-course-uuid",
  "conversationId": "conv-uuid"
}
```

**Resultado Esperado**:
- Respuesta con diagramas mentales
- Explicaciones visuales
- Referencias a imágenes

#### 2. Docente con Estilo Socrático
```json
{
  "query": "¿Qué es la evolución?",
  "studentId": "student-uuid",
  "courseId": "socratic-course-uuid",
  "conversationId": "conv-uuid"
}
```

**Resultado Esperado**:
- Preguntas guiadas
- Fomento de reflexión
- Respuestas exploratorias

#### 3. Nivel de Detalle Avanzado
```json
{
  "query": "Explica la síntesis de proteínas",
  "studentId": "advanced-student-uuid",
  "courseId": "advanced-biology-uuid",
  "conversationId": "conv-uuid"
}
```

**Resultado Esperado**:
- Terminología técnica
- Explicaciones detalladas
- Referencias especializadas

## Monitoreo y Debugging

### Logs Importantes
```javascript
// En cada nodo, agregar logs de debug
console.log('Personalization Context:', {
  pedagogicalSettings: $json.pedagogicalSettings,
  studentProfile: $json.studentProfile,
  query: $json.originalQuery
});
```

### Métricas a Monitorear
- Tiempo de respuesta del workflow
- Tasa de personalización exitosa
- Errores de consulta a Supabase
- Calidad de respuestas personalizadas

### Alertas
- Error en consulta de configuración pedagógica
- Perfil de estudiante no encontrado
- Fallo en generación de prompt personalizado
- Latencia > 5 segundos

## Rollback Plan

### Si la Migración Falla
1. **Revertir a workflow anterior**
2. **Mantener compatibilidad con clientes existentes**
3. **Identificar y corregir problemas**
4. **Reintentar migración gradual**

### Estrategia de Rollout
1. **Fase 1**: Deploy en ambiente de testing
2. **Fase 2**: Rollout gradual (10% de tráfico)
3. **Fase 3**: Rollout completo
4. **Fase 4**: Monitoreo y optimización

## Validación Post-Migración

### Checklist de Validación
- [ ] Workflow responde correctamente
- [ ] Personalización se aplica correctamente
- [ ] Consultas a Supabase funcionan
- [ ] Respuestas mantienen calidad
- [ ] Latencia dentro de límites
- [ ] Logs de debug funcionan
- [ ] Alertas configuradas
- [ ] Rollback plan probado

### Pruebas de Carga
```bash
# Simular carga de trabajo
for i in {1..100}; do
  curl -X POST $N8N_WEBHOOK_URL \
    -H "Content-Type: application/json" \
    -d '{"query":"test query","studentId":"test","courseId":"test","conversationId":"test"}'
done
```

## Documentación Adicional

### Para Desarrolladores
- [Arquitectura del Sistema](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### Para Usuarios
- [Guía de Usuario](./USER_GUIDE.md)
- [Configuración Pedagógica](./PEDAGOGICAL_SETUP.md)
- [FAQ](./FAQ.md)
