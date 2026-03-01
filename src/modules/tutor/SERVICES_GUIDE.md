# Guía de Servicios del Sistema Multi-Agente

## Resumen

Esta guía documenta todos los servicios implementados para el sistema de tutor virtual multi-agente con personalización pedagógica por curso-docente-estudiante.

## Arquitectura de Servicios

### 🏗️ Servicios Principales

| Servicio | Propósito | Dependencias |
|----------|-----------|--------------|
| `supabaseService` | Gestión de datos y persistencia | Supabase Client |
| `n8nService` | Integración con workflow RAG | n8n Webhook |
| `memoryService` | Gestión de memoria híbrida | Supabase + localStorage |
| `geminiService` | Integración con IA | Google Gemini API |
| `configService` | Configuración centralizada | localStorage |

### 🔧 Servicios de Utilidad

| Servicio | Propósito | Dependencias |
|----------|-----------|--------------|
| `agentUtils` | Utilidades para agentes | Tipos del sistema |
| `supabase` | Cliente de Supabase | @supabase/supabase-js |

## Servicios Detallados

### 1. SupabaseService

**Propósito**: Gestión completa de datos y persistencia en Supabase.

#### Funcionalidades Principales

##### Conversaciones y Mensajes
```typescript
// Crear conversación
const conversation = await saveConversation(studentId, courseId, metadata);

// Guardar mensaje
const message = await saveMessage(conversationId, 'user', content, audioUrl);

// Obtener historial
const history = await getConversationHistory(conversationId, limit);
```

##### Configuración Pedagógica
```typescript
// Obtener configuración
const settings = await getPedagogicalSettings(courseId);

// Guardar configuración
const saved = await savePedagogicalSettings(settings);
```

##### Perfiles de Estudiantes
```typescript
// Obtener perfil
const profile = await getStudentProfile(studentId, courseId);

// Actualizar perfil
const updated = await updateStudentProfile(studentId, courseId, updates);
```

##### Escalas de Calificación
```typescript
// Obtener escala
const scale = await getGradingScale(courseId);

// Guardar escala
const saved = await saveGradingScale(scale);
```

##### Gestión de Imágenes
```typescript
// Subir imagen
const image = await uploadCourseImage(courseId, url, type, uploadedBy, size, mime);

// Obtener imágenes
const images = await getCourseImages(courseId);
```

##### Métricas de Uso
```typescript
// Guardar métrica
const metric = await saveUsageMetric(conversationId, studentId, courseId, type, value);

// Obtener métricas
const metrics = await getUsageMetrics(courseId, studentId, type);
```

##### Configuraciones de Agentes
```typescript
// Obtener configuración de agente
const config = await getAgentConfiguration(courseId, 'voice');

// Guardar configuración de agente
const saved = await saveAgentConfiguration(courseId, 'voice', config);
```

#### Características

- **Manejo de Errores**: Todas las funciones retornan `SupabaseResponse<T>`
- **Tipado Fuerte**: Interfaces TypeScript para todos los datos
- **Validación**: Validación de datos antes de guardar
- **Optimización**: Consultas optimizadas con índices

### 2. N8nService

**Propósito**: Integración con el workflow de n8n para RAG y procesamiento de consultas.

#### Funcionalidades Principales

##### Consultas con Contexto
```typescript
// Consulta con contexto completo
const response = await n8nService.sendQueryWithContext(query, context);

// Consulta simple
const response = await n8nService.sendSimpleQuery(query, courseId, studentId);
```

##### Gestión de Configuración
```typescript
// Actualizar configuración
n8nService.updateConfig({
  webhookUrl: 'https://nuevo-webhook.com',
  timeout: 45000
});

// Verificar salud
const healthy = await n8nService.healthCheck();
```

##### Utilidades
```typescript
// Crear contexto
const context = createConversationContext(studentId, courseId, conversationId, settings, profile, messages);

// Validar respuesta
const isValid = isValidN8nResponse(response);

// Extraer información de debug
const debugInfo = getDebugInfo(response);
```

#### Características

- **Retry Logic**: Reintentos automáticos en caso de fallo
- **Timeout Management**: Control de tiempo de espera
- **Error Handling**: Manejo robusto de errores
- **Flexible Parsing**: Adaptable a diferentes formatos de respuesta

### 3. MemoryService

**Propósito**: Gestión unificada de memoria híbrida (local + Supabase).

#### Funcionalidades Principales

##### Gestión de Memoria
```typescript
// Inicializar conversación
await memoryService.initializeConversation(conversationId);

// Guardar mensaje
const saved = await memoryService.saveToMemory(message, conversationId);

// Obtener contexto relevante
const context = await memoryService.getRelevantContext(query);
```

##### Análisis de Conversación
```typescript
// Obtener estadísticas
const stats = memoryService.getConversationStats();

// Buscar mensajes
const results = memoryService.searchMessages('fotosíntesis');

// Obtener resumen
const summary = await memoryService.getConversationSummary(conversationId);
```

##### Gestión de Perfiles
```typescript
// Actualizar perfil desde conversación
const updated = await memoryService.updateStudentProfileFromConversation(studentId, courseId, messages);

// Guardar métricas
const saved = await memoryService.saveUsageMetrics(conversationId, studentId, courseId, metrics);
```

##### Utilidades Avanzadas
```typescript
// Marcar mensaje como importante
memoryService.markMessageAsImportant(messageId);

// Obtener mensajes importantes
const important = memoryService.getImportantMessages();

// Limpiar mensajes antiguos
await memoryService.cleanupOldMessages(20);

// Exportar memoria
const exported = memoryService.exportMemoryForAnalysis();
```

#### Características

- **Memoria Híbrida**: Combina localStorage y Supabase
- **Análisis Inteligente**: Extracción automática de temas y progreso
- **Gestión de Memoria**: Limpieza automática de mensajes antiguos
- **Búsqueda**: Búsqueda semántica en mensajes
- **Exportación**: Exportación para análisis externo

### 4. ConfigService

**Propósito**: Configuración centralizada y gestión de estado del sistema.

#### Funcionalidades Principales

##### Gestión de Configuración
```typescript
// Obtener configuración completa
const config = configService.getConfig();

// Obtener sección específica
const memoryConfig = configService.getSection('memory');

// Actualizar sección
configService.updateSection('memory', { maxLocalMessages: 100 });

// Actualizar valor específico
configService.updateValue('gemini', 'temperature', 0.8);
```

##### Gestión de Agentes
```typescript
// Verificar si agente está habilitado
const enabled = configService.isAgentEnabled('voice');

// Habilitar/deshabilitar agente
configService.setAgentEnabled('voice', true);

// Obtener configuración de agente
const voiceConfig = configService.getAgentConfig('voice');
```

##### Validación y Utilidades
```typescript
// Validar configuración
const validation = configService.validate();

// Exportar configuración
const exported = configService.exportConfig();

// Importar configuración
const imported = configService.importConfig(configJson);

// Resetear a valores por defecto
configService.resetToDefaults();
```

##### Suscripción a Cambios
```typescript
// Suscribirse a cambios
const unsubscribe = configService.subscribe((newConfig) => {
  console.log('Configuración actualizada:', newConfig);
});

// Desuscribirse
unsubscribe();
```

#### Características

- **Configuración Centralizada**: Un solo lugar para toda la configuración
- **Validación**: Validación automática de configuración
- **Persistencia**: Guardado automático en localStorage
- **Suscripciones**: Notificaciones de cambios
- **Entornos**: Configuración específica por entorno

### 5. AgentUtils

**Propósito**: Utilidades y funciones de apoyo para el sistema multi-agente.

#### Funcionalidades Principales

##### Gestión de Contexto
```typescript
// Crear contexto de conversación
const context = createConversationContext(studentId, courseId, conversationId, settings, profile, messages);

// Enriquecer contexto
const enriched = enrichContext(context, { courseMaterials, courseImages });

// Extraer contexto para agente específico
const voiceContext = extractContextForAgent(context, 'voice');
```

##### Personalización
```typescript
// Generar prompt personalizado
const prompt = generatePersonalizedPrompt(basePrompt, settings, profile);
```

##### Gestión de Respuestas
```typescript
// Validar respuesta de agente
const isValid = validateAgentResponse(response);

// Mejorar respuesta
const enhanced = enhanceAgentResponse(response, context);

// Combinar respuestas múltiples
const combined = combineAgentResponses(responses, context);
```

##### Análisis y Métricas
```typescript
// Analizar calidad de respuesta
const quality = analyzeResponseQuality(response);

// Extraer métricas de conversación
const metrics = extractConversationMetrics(messages, context);

// Generar información de debug
const debugInfo = generateDebugInfo('voice', response, context, processingTime);
```

#### Características

- **Utilidades de Contexto**: Gestión avanzada de contexto
- **Personalización**: Generación de prompts personalizados
- **Análisis**: Análisis de calidad y métricas
- **Debugging**: Herramientas de debugging
- **Validación**: Validación de respuestas

## Uso Integrado

### Inicialización del Sistema

```typescript
import { initializeServices, getServicesStatus } from './services';

// Inicializar todos los servicios
const initResult = await initializeServices();

if (initResult.success) {
  console.log('Servicios inicializados correctamente');
  if (initResult.warnings.length > 0) {
    console.warn('Advertencias:', initResult.warnings);
  }
} else {
  console.error('Errores de inicialización:', initResult.errors);
}

// Verificar estado de servicios
const status = await getServicesStatus();
console.log('Estado de servicios:', status);
```

### Uso en Agentes

```typescript
import { 
  memoryService, 
  n8nService, 
  createConversationContext,
  generatePersonalizedPrompt 
} from './services';

class VoiceAgent {
  async processMessage(message: string, context: ConversationContext) {
    // Obtener contexto relevante
    const relevantContext = await memoryService.getRelevantContext(message);
    
    // Generar prompt personalizado
    const prompt = generatePersonalizedPrompt(
      'Responde como tutor virtual',
      context.pedagogicalSettings,
      context.studentProfile
    );
    
    // Procesar con n8n
    const response = await n8nService.sendQueryWithContext(message, context);
    
    // Guardar en memoria
    await memoryService.saveToMemory({
      id: Date.now().toString(),
      role: 'assistant',
      text: response.message,
      timestamp: new Date(),
      metadata: response.metadata
    });
    
    return response;
  }
}
```

### Gestión de Configuración

```typescript
import { configService, updateConfigSection } from './services';

// Actualizar configuración de memoria
updateConfigSection('memory', {
  maxLocalMessages: 100,
  contextWindowSize: 20
});

// Habilitar/deshabilitar agentes
configService.setAgentEnabled('voice', true);
configService.setAgentEnabled('rag', false);

// Suscribirse a cambios
const unsubscribe = configService.subscribe((newConfig) => {
  console.log('Configuración actualizada:', newConfig);
});
```

## Mejores Prácticas

### 1. Manejo de Errores

```typescript
// Siempre verificar el resultado de las operaciones
const result = await saveMessage(conversationId, 'user', content);

if (!result.success) {
  console.error('Error guardando mensaje:', result.error);
  // Manejar error apropiadamente
  return;
}

// Usar el dato
console.log('Mensaje guardado:', result.data);
```

### 2. Gestión de Memoria

```typescript
// Inicializar memoria al comenzar conversación
await memoryService.initializeConversation(conversationId);

// Limpiar memoria periódicamente
setInterval(async () => {
  await memoryService.cleanupOldMessages(20);
}, 300000); // Cada 5 minutos
```

### 3. Configuración

```typescript
// Validar configuración al inicio
const validation = configService.validate();
if (!validation.valid) {
  console.error('Configuración inválida:', validation.errors);
  // Manejar errores de configuración
}

// Usar configuración específica por entorno
const envConfig = getEnvironmentConfig();
configService.updateSection('debug', envConfig.debug);
```

### 4. Monitoreo

```typescript
// Monitorear estado de servicios
setInterval(async () => {
  const status = await getServicesStatus();
  
  if (!status.supabase.available) {
    console.error('Supabase no disponible');
  }
  
  if (!status.n8n.available) {
    console.warn('n8n no disponible - funcionalidad RAG limitada');
  }
}, 60000); // Cada minuto
```

## Troubleshooting

### Problemas Comunes

#### 1. Supabase no disponible
```typescript
// Verificar configuración
const config = configService.getSection('supabase');
console.log('Supabase URL:', config.url);
console.log('Supabase Key:', config.anonKey ? 'Configurada' : 'No configurada');

// Verificar salud
const healthy = await supabaseHealthCheck();
console.log('Supabase saludable:', healthy);
```

#### 2. n8n no responde
```typescript
// Verificar configuración
const config = configService.getSection('n8n');
console.log('n8n URL:', config.webhookUrl);

// Verificar salud
const healthy = await n8nService.healthCheck();
console.log('n8n saludable:', healthy);

// Probar con timeout más alto
n8nService.updateConfig({ timeout: 60000 });
```

#### 3. Memoria no se guarda
```typescript
// Verificar configuración de memoria
const memoryConfig = configService.getSection('memory');
console.log('Memoria a largo plazo:', memoryConfig.enableLongTermMemory);

// Verificar Supabase
const supabaseHealthy = await supabaseHealthCheck();
console.log('Supabase disponible:', supabaseHealthy);
```

### Soluciones

#### Resetear Servicios
```typescript
import { resetAllServices } from './services';

// Resetear todos los servicios
await resetAllServices();
```

#### Exportar/Importar Configuración
```typescript
import { exportSystemConfig, importSystemConfig } from './services';

// Exportar configuración
const config = exportSystemConfig();
console.log('Configuración exportada:', config);

// Importar configuración
const imported = importSystemConfig(configString);
console.log('Configuración importada:', imported);
```

## Conclusión

Los servicios implementados proporcionan una base sólida para el sistema multi-agente con:

- ✅ **Gestión Completa de Datos** con Supabase
- ✅ **Integración RAG** con n8n
- ✅ **Memoria Híbrida** inteligente
- ✅ **Configuración Centralizada** flexible
- ✅ **Utilidades Avanzadas** para agentes
- ✅ **Manejo Robusto de Errores**
- ✅ **Monitoreo y Debugging**

El sistema está diseñado para ser escalable, mantenible y fácil de usar, proporcionando todas las funcionalidades necesarias para un tutor virtual personalizado y efectivo.

---

**Versión**: 2.0.0  
**Última actualización**: $(date)  
**Estado**: ✅ COMPLETADO
