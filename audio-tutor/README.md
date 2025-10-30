# EduSpark Audio-Tutor Multi-Agente

Sistema de tutor virtual inteligente con arquitectura multi-agente, personalización pedagógica y capacidades de voz avanzadas usando Gemini 2.5 Flash.

## 🚀 Características Principales

### Arquitectura Multi-Agente
- **VoiceAgent**: Manejo de entrada/salida de audio con Gemini 2.5 Flash TTS
- **RAGAgent**: Búsqueda contextual de información con n8n
- **ContextAgent**: Gestión de memoria y personalización
- **AgentCoordinator**: Orquestación entre agentes

### Personalización Pedagógica
- Configuración por curso-docente-estudiante
- Estilos de enseñanza (socrático, directo, colaborativo, constructivista)
- Tonos de respuesta (amigable, formal, motivador, neutro)
- Niveles de detalle (básico, medio, avanzado)
- Sistema de calificaciones personalizable

### Capacidades Avanzadas
- Memoria a largo plazo en Supabase
- Integración con sistema RAG de n8n
- Soporte de imágenes en cursos
- Gestión de perfiles de aprendizaje
- Voces expresivas de Gemini 2.5 Flash

## 🛠️ Instalación

### Prerrequisitos
- Node.js 18+
- Cuenta de Google Cloud (Gemini API)
- Instancia de Supabase
- n8n (opcional, para RAG avanzado)

### Configuración

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   # Crear archivo .env.local
   GEMINI_API_KEY=your_gemini_api_key_here
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/rag-student-query
   ```

3. **Configurar base de datos:**
   ```bash
   # Ejecutar scripts SQL en Supabase
   # Ver: sql_scripts/05_tutor_virtual_tables.sql
   # Ver: sql_scripts/06_tutor_virtual_rls.sql
   ```

4. **Ejecutar la aplicación:**
   ```bash
   npm run dev
   ```

## 📁 Estructura del Proyecto

```
audio-tutor/
├── agents/                    # Agentes especializados
│   ├── VoiceAgent.ts         # Agente de voz
│   ├── RAGAgent.ts           # Agente RAG
│   ├── ContextAgent.ts       # Agente de contexto
│   └── AgentCoordinator.ts   # Orquestador
├── services/                  # Servicios de backend
│   ├── geminiService.ts      # Servicio de Gemini
│   ├── n8nService.ts         # Cliente de n8n
│   ├── supabaseService.ts    # Gestión de Supabase
│   └── memoryService.ts      # Gestión de memoria
├── hooks/                     # Hooks de React
│   ├── useAudioCapabilities.ts
│   ├── useAgentSystem.ts     # Hook principal
│   └── useCourseContext.ts   # Contexto de curso
├── components/                # Componentes UI
│   ├── PedagogicalSettings.tsx
│   ├── CourseSelector.tsx
│   └── icons.tsx
├── types/                     # Tipos TypeScript
│   ├── agents.ts
│   └── pedagogical.ts
└── App.tsx                    # Componente principal
```

## 🎯 Uso

### Para Estudiantes
1. Seleccionar un curso
2. Iniciar conversación con el tutor virtual
3. Hacer preguntas por texto o voz
4. Recibir respuestas personalizadas según el perfil

### Para Docentes
1. Configurar preferencias pedagógicas del curso
2. Personalizar escalas de calificación
3. Subir imágenes y materiales
4. Monitorear progreso de estudiantes

## 🔧 Configuración Avanzada

### Personalización de Voces
```typescript
// Configurar voz del tutor
const voiceConfig = {
  voiceName: 'Kore',     // Kore, Charon, Fenrir, Aoede, Puck
  speed: 1.0,            // 0.5 a 2.0
  pitch: 1.0             // Opcional
};
```

### Configuración Pedagógica
```typescript
// Estilo de enseñanza
const pedagogicalSettings = {
  teachingStyle: 'constructivista',  // socratico, directo, colaborativo, constructivista
  tonePreference: 'amigable',        // amigable, formal, motivador, neutro
  detailLevel: 'medio',              // basico, medio, avanzado
  useExamples: true,
  encourageQuestions: true
};
```

## 📊 Base de Datos

### Tablas Principales
- `tutor_conversations`: Conversaciones del tutor
- `tutor_messages`: Mensajes individuales
- `course_pedagogical_settings`: Configuración pedagógica
- `student_learning_profiles`: Perfiles de aprendizaje
- `course_grading_scales`: Escalas de calificación
- `course_images`: Gestión de imágenes

### Políticas RLS
- Estudiantes: Acceso a sus propias conversaciones
- Docentes: Gestión de configuración de sus cursos
- Administradores: Acceso completo

## 🔌 Integración con n8n

El sistema se integra con n8n para funcionalidades RAG avanzadas:

1. **Webhook de Consulta**: Recibe preguntas con contexto enriquecido
2. **Personalización**: Incluye configuración pedagógica y perfil del estudiante
3. **Respuesta Contextual**: Devuelve respuestas basadas en el material del curso

## 🧪 Testing

### Escenarios de Prueba
1. **Personalización por Curso**: Verificar que diferentes cursos tengan diferentes comportamientos
2. **Memoria Persistente**: Cerrar y reabrir para verificar persistencia
3. **Configuración Docente**: Modificar configuración y verificar impacto inmediato
4. **Múltiples Estudiantes**: Verificar aislamiento de conversaciones

### Ejecutar Tests
```bash
# Tests unitarios (cuando estén implementados)
npm test

# Tests de integración
npm run test:integration
```

## 🚀 Despliegue

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm run preview
```

### Variables de Entorno de Producción
```bash
GEMINI_API_KEY=prod_gemini_key
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod_anon_key
VITE_N8N_WEBHOOK_URL=https://prod-n8n.com/webhook/rag-student-query
```

## 📈 Métricas y Monitoreo

### KPIs Principales
- Latencia de respuesta < 3 segundos
- Tasa de personalización exitosa: 100%
- Persistencia de memoria: 100%
- Satisfacción de usuarios

### Logs Importantes
- Interacciones de agentes
- Errores de personalización
- Rendimiento de n8n
- Uso de memoria

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:
- Crear issue en GitHub
- Contactar al equipo de desarrollo
- Revisar documentación en `AI_CONTEXT/`

## 🔄 Changelog

### v2.0.0 - Audio-Tutor Multi-Agente
- ✅ Arquitectura multi-agente implementada
- ✅ Personalización pedagógica por curso-docente-estudiante
- ✅ Memoria a largo plazo con Supabase
- ✅ Integración con n8n mejorada
- ✅ Soporte de imágenes en cursos
- ✅ Sistema de calificaciones personalizable
- ✅ Voces avanzadas de Gemini 2.5 Flash

### v1.0.0 - Audio-Tutor Básico
- ✅ Funcionalidad básica de chat con voz
- ✅ Integración con Gemini TTS
- ✅ Procesamiento de documentos
- ✅ Interfaz de usuario moderna