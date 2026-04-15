# Guía del Panel de Configuración Pedagógica

## Resumen

El Panel de Configuración Pedagógica es una interfaz completa que permite a los docentes personalizar el comportamiento del tutor virtual de acuerdo a su metodología de enseñanza y las necesidades específicas de su curso.

## Características Principales

### 🎓 Configuración Pedagógica
- **Estilos de Enseñanza**: Socrático, Directo, Colaborativo, Constructivista
- **Tonos de Respuesta**: Amigable, Formal, Motivador, Neutro
- **Niveles de Detalle**: Básico, Medio, Avanzado
- **Opciones Adicionales**: Ejemplos, Fomento de preguntas

### 🎤 Configuración de Voz
- **5 Voces Diferentes**: Kore, Charon, Fenrir, Aoede, Puck
- **Control de Velocidad**: 0.5x a 2.0x
- **Personalización por Curso**: Cada curso puede tener su propia voz

### 📊 Escalas de Calificación
- **Escalas Personalizables**: Crear escalas específicas por curso
- **Grados Flexibles**: A+, A, B+, B, C, F o personalizados
- **Rangos de Puntaje**: Configurar rangos de 0-100
- **Descripciones**: Agregar descripciones para cada grado

### 🖼️ Gestión de Imágenes
- **Subida de Imágenes**: Para enriquecer el contenido del curso
- **Integración con Contenido**: Las imágenes se incluyen en las respuestas del tutor

### ⚙️ Configuración Avanzada
- **Prompt Personalizado**: Sobrescribir la configuración automática
- **Preview en Tiempo Real**: Ver cómo se verá el prompt generado
- **Validación**: Verificación de configuración antes de guardar

## Estructura de Componentes

### 1. PedagogicalSettings (Componente Principal)
```typescript
interface PedagogicalSettingsProps {
  courseId: string;
  course?: Course | null;
  initialSettings?: PedagogicalSettings | null;
  initialGradingScale?: GradingScale | null;
  onSave: (settings: Partial<PedagogicalSettings>) => Promise<boolean>;
  onSaveGradingScale?: (gradingScale: Partial<GradingScale>) => Promise<boolean>;
  onUploadImage?: (file: File) => Promise<string | null>;
  isLoading?: boolean;
  isTeacher?: boolean;
}
```

### 2. PedagogicalSummary (Resumen Visual)
```typescript
interface PedagogicalSummaryProps {
  settings: PedagogicalSettings;
  gradingScale?: GradingScale | null;
  courseName?: string;
  className?: string;
}
```

### 3. usePedagogicalSettings (Hook de Gestión)
```typescript
interface UsePedagogicalSettingsReturn {
  // Estado
  settings: PedagogicalSettings | null;
  gradingScale: GradingScale | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Acciones
  updateSettings: (updates: Partial<PedagogicalSettings>) => Promise<boolean>;
  updateGradingScale: (updates: Partial<GradingScale>) => Promise<boolean>;
  resetSettings: () => void;
  refreshSettings: () => Promise<void>;
  
  // Utilidades
  hasChanges: boolean;
  canSave: boolean;
  getSettingsSummary: () => string;
}
```

## Uso Básico

### 1. Importar Componentes
```typescript
import { PedagogicalSettings } from './components/PedagogicalSettings';
import { PedagogicalSummary } from './components/PedagogicalSummary';
import { usePedagogicalSettings } from './hooks/usePedagogicalSettings';
```

### 2. Configurar Hook
```typescript
const {
  settings,
  gradingScale,
  updateSettings,
  updateGradingScale,
  isLoading,
  isSaving
} = usePedagogicalSettings({
  courseId: 'course-123',
  teacherId: 'teacher-456'
});
```

### 3. Renderizar Componente
```typescript
<PedagogicalSettings
  courseId="course-123"
  course={course}
  initialSettings={settings}
  initialGradingScale={gradingScale}
  onSave={updateSettings}
  onSaveGradingScale={updateGradingScale}
  onUploadImage={handleImageUpload}
  isLoading={isSaving}
  isTeacher={true}
/>
```

## Configuraciones Disponibles

### Estilos de Enseñanza

#### Socrático 🤔
- **Descripción**: Preguntas guiadas para que el estudiante llegue a sus propias conclusiones
- **Características**: 
  - Fomenta la reflexión
  - Usa preguntas abiertas
  - Guía el descubrimiento
- **Ejemplo**: "¿Qué crees que pasaría si...?"

#### Directo 📚
- **Descripción**: Explicaciones claras y estructuradas
- **Características**:
  - Información directa
  - Estructura clara
  - Respuestas concisas
- **Ejemplo**: "La fotosíntesis es el proceso por el cual..."

#### Colaborativo 👥
- **Descripción**: Fomenta el trabajo en equipo y la discusión
- **Características**:
  - Preguntas abiertas
  - Fomenta participación
  - Trabajo grupal
- **Ejemplo**: "¿Qué opinan ustedes sobre...?"

#### Constructivista 🏗️
- **Descripción**: Ayuda al estudiante a construir su propio conocimiento
- **Características**:
  - Conexiones con experiencias
  - Construcción gradual
  - Aplicación práctica
- **Ejemplo**: "Basándote en lo que ya sabes sobre..."

### Tonos de Respuesta

#### Amigable 😊
- **Uso**: Estudiantes jóvenes, ambiente relajado
- **Características**: Casual, cercano, accesible

#### Formal 🎩
- **Uso**: Educación superior, ambiente académico
- **Características**: Profesional, académico, estructurado

#### Motivador 💪
- **Uso**: Estudiantes que necesitan estímulo
- **Características**: Alentador, positivo, energético

#### Neutro 😐
- **Uso**: Ambiente equilibrado
- **Características**: Objetivo, balanceado, profesional

### Niveles de Detalle

#### Básico 📖
- **Uso**: Introducción, conceptos fundamentales
- **Características**: Simple, directo, esencial

#### Medio 📚
- **Uso**: Desarrollo de conceptos
- **Características**: Balanceado, completo, práctico

#### Avanzado 📖
- **Uso**: Especialización, conceptos complejos
- **Características**: Técnico, detallado, especializado

## Configuración de Voces

### Voces Disponibles

| Voz | Género | Características | Uso Recomendado |
|-----|--------|-----------------|------------------|
| Kore | Femenina | Clara y profesional | Cursos generales |
| Charon | Masculina | Profunda y autoritaria | Cursos técnicos |
| Fenrir | Masculina | Energética y motivadora | Cursos dinámicos |
| Aoede | Femenina | Cálida y expresiva | Cursos creativos |
| Puck | Neutra | Versátil y amigable | Cursos diversos |

### Control de Velocidad
- **Rango**: 0.5x a 2.0x
- **Recomendado**: 1.0x para la mayoría de casos
- **Lento (0.5x-0.8x)**: Conceptos complejos, estudiantes principiantes
- **Rápido (1.2x-2.0x)**: Repaso, estudiantes avanzados

## Escalas de Calificación

### Escala Estándar
```
A+ : 95-100 (Excelente)
A  : 90-94  (Muy bueno)
B+ : 85-89  (Bueno)
B  : 80-84  (Satisfactorio)
C  : 70-79  (Aceptable)
F  : 0-69   (Reprobado)
```

### Escala Personalizada
Los docentes pueden crear escalas completamente personalizadas:
- **Grados**: Cualquier letra, número o símbolo
- **Rangos**: Flexibles de 0-100
- **Descripciones**: Personalizadas para cada grado

## Integración con el Sistema

### 1. Base de Datos
```sql
-- Tabla de configuración pedagógica
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

-- Tabla de escalas de calificación
CREATE TABLE course_grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id),
  name TEXT NOT NULL,
  scale JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id)
);
```

### 2. API Endpoints
```typescript
// Obtener configuración
GET /api/courses/:courseId/pedagogical-settings

// Guardar configuración
PUT /api/courses/:courseId/pedagogical-settings

// Obtener escala de calificación
GET /api/courses/:courseId/grading-scale

// Guardar escala de calificación
PUT /api/courses/:courseId/grading-scale

// Subir imagen
POST /api/courses/:courseId/images
```

### 3. Integración con n8n
El workflow de n8n utiliza la configuración pedagógica para personalizar las respuestas:

```json
{
  "query": "¿Qué es la fotosíntesis?",
  "context": {
    "studentId": "student-123",
    "courseId": "course-456",
    "pedagogicalSettings": {
      "teachingStyle": "socratico",
      "tonePreference": "amigable",
      "detailLevel": "medio",
      "useExamples": true,
      "encourageQuestions": true
    }
  }
}
```

## Mejores Prácticas

### 1. Configuración Inicial
- Configurar el estilo de enseñanza antes de que los estudiantes usen el tutor
- Probar diferentes voces para encontrar la más adecuada
- Establecer una escala de calificación clara y consistente

### 2. Personalización por Curso
- Cada curso debe tener su propia configuración
- Considerar el nivel de los estudiantes
- Adaptar el tono al tipo de materia

### 3. Monitoreo y Ajustes
- Revisar la configuración periódicamente
- Ajustar según el feedback de los estudiantes
- Usar el preview para verificar cambios

### 4. Colaboración
- Compartir configuraciones exitosas entre docentes
- Documentar qué funciona mejor para cada tipo de curso
- Mantener consistencia en la institución

## Troubleshooting

### Problemas Comunes

#### 1. Configuración no se guarda
- Verificar conexión a la base de datos
- Revisar permisos del usuario
- Comprobar validación de datos

#### 2. Voz no se aplica
- Verificar que la voz esté disponible en Gemini
- Comprobar la configuración de audio del navegador
- Revisar la integración con el sistema de voz

#### 3. Escala de calificación no funciona
- Verificar que los rangos no se superpongan
- Comprobar que los puntajes estén en el rango 0-100
- Revisar la validación de la escala

### Soluciones

#### 1. Resetear Configuración
```typescript
const { resetSettings, resetGradingScale } = usePedagogicalSettings({
  courseId,
  teacherId
});

// Resetear configuración pedagógica
resetSettings();

// Resetear escala de calificación
resetGradingScale();
```

#### 2. Recargar desde Base de Datos
```typescript
const { refreshSettings, refreshGradingScale } = usePedagogicalSettings({
  courseId,
  teacherId
});

// Recargar configuración
await refreshSettings();

// Recargar escala de calificación
await refreshGradingScale();
```

#### 3. Validar Configuración
```typescript
const { settings, gradingScale, error } = usePedagogicalSettings({
  courseId,
  teacherId
});

if (error) {
  console.error('Error en configuración:', error);
}

if (!settings) {
  console.warn('Configuración no encontrada');
}
```

## Conclusión

El Panel de Configuración Pedagógica proporciona una interfaz completa y flexible para personalizar el comportamiento del tutor virtual. Con sus múltiples opciones de configuración, escalas de calificación personalizables y gestión de imágenes, permite a los docentes crear una experiencia de tutoría verdaderamente personalizada para cada curso.

La integración con el sistema multi-agente asegura que todas las configuraciones se apliquen correctamente, proporcionando respuestas contextuales y personalizadas que se adaptan tanto al estilo de enseñanza del docente como a las necesidades específicas de cada estudiante.

---

**Versión**: 2.0.0  
**Última actualización**: $(date)  
**Estado**: ✅ COMPLETADO
