# Scripts SQL del Tutor Virtual Multi-Agente

## Resumen

Este directorio contiene todos los scripts SQL necesarios para implementar el sistema de tutor virtual multi-agente con personalización pedagógica por curso-docente-estudiante.

## Estructura de Scripts

### 📋 Scripts Principales

| Script | Descripción | Orden |
|--------|-------------|-------|
| `05_tutor_virtual_tables.sql` | Creación de tablas del sistema | 1º |
| `06_tutor_virtual_rls.sql` | Políticas de seguridad (RLS) | 2º |
| `07_validate_tutor_virtual_tables.sql` | Validación del sistema | 3º |
| `08_tutor_virtual_sample_data.sql` | Datos de ejemplo | 4º |
| `09_cleanup_tutor_virtual_data.sql` | Limpieza de datos | 5º |

## Tablas del Sistema

### 🗣️ Conversaciones y Mensajes
- **`tutor_conversations`**: Conversaciones del tutor por estudiante y curso
- **`tutor_messages`**: Mensajes individuales con metadata y audio

### 🎓 Configuración Pedagógica
- **`course_pedagogical_settings`**: Estilos de enseñanza, tonos, voces por curso
- **`course_grading_scales`**: Escalas de calificación personalizadas
- **`student_learning_profiles`**: Perfiles de aprendizaje de estudiantes

### 📚 Contenido y Recursos
- **`course_materials`**: Materiales de contenido del curso
- **`course_images`**: Gestión de imágenes para cursos
- **`agent_configurations`**: Configuraciones específicas de cada agente

### 📊 Métricas y Análisis
- **`tutor_usage_metrics`**: Métricas de uso y rendimiento del tutor

## Características de Seguridad

### 🔒 Row Level Security (RLS)
- **Estudiantes**: Solo pueden ver sus propias conversaciones y perfiles
- **Docentes**: Pueden gestionar configuraciones de sus cursos
- **Sistema**: Puede insertar métricas y mensajes automáticamente

### 🛡️ Políticas de Acceso
- Conversaciones privadas por estudiante
- Configuraciones pedagógicas por docente
- Materiales accesibles por inscripción en curso
- Métricas visibles por estudiante y docente del curso

## Instalación

### 1. Ejecutar Scripts en Orden
```bash
# 1. Crear tablas
psql -d tu_base_de_datos -f 05_tutor_virtual_tables.sql

# 2. Configurar RLS
psql -d tu_base_de_datos -f 06_tutor_virtual_rls.sql

# 3. Validar instalación
psql -d tu_base_de_datos -f 07_validate_tutor_virtual_tables.sql

# 4. Insertar datos de ejemplo (opcional)
psql -d tu_base_de_datos -f 08_tutor_virtual_sample_data.sql
```

### 2. Verificar Instalación
El script de validación verificará:
- ✅ Todas las tablas creadas
- ✅ Todas las políticas RLS configuradas
- ✅ Todos los índices creados
- ✅ Todas las columnas críticas presentes

## Uso

### Datos de Ejemplo
El script `08_tutor_virtual_sample_data.sql` incluye:
- 1 configuración pedagógica completa
- 1 escala de calificación personalizada
- 1 perfil de estudiante con preferencias
- 1 conversación con 6 mensajes
- 3 materiales de curso
- 2 imágenes de curso
- 2 métricas de uso
- 4 configuraciones de agentes

### Limpieza
Para resetear el sistema:
```bash
psql -d tu_base_de_datos -f 09_cleanup_tutor_virtual_data.sql
```

## Estructura de Datos

### Configuración Pedagógica
```sql
-- Estilos de enseñanza
teaching_style: 'socratico' | 'directo' | 'colaborativo' | 'constructivista'

-- Tonos de respuesta
tone_preference: 'amigable' | 'formal' | 'motivador' | 'neutro'

-- Niveles de detalle
detail_level: 'basico' | 'medio' | 'avanzado'

-- Voces disponibles
voice_name: 'Kore' | 'Charon' | 'Fenrir' | 'Aoede' | 'Puck'
```

### Escalas de Calificación
```json
{
  "name": "Escala de Biología",
  "scale": [
    {
      "grade": "A+",
      "minScore": 95,
      "maxScore": 100,
      "description": "Excelente comprensión"
    }
  ]
}
```

### Perfiles de Estudiantes
```sql
-- Estilos de aprendizaje
preferred_learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'reading'

-- Niveles de dificultad
difficulty_level: 'basico' | 'medio' | 'avanzado'

-- Tipos de ejemplos preferidos
preferred_examples: 'practicos' | 'teoricos' | 'visuales' | 'auditivos'
```

## Índices de Rendimiento

### Conversaciones
- `idx_tutor_conversations_student`: Búsqueda por estudiante
- `idx_tutor_conversations_course`: Búsqueda por curso
- `idx_tutor_conversations_activity`: Ordenamiento por actividad

### Mensajes
- `idx_tutor_messages_conversation`: Mensajes por conversación
- `idx_tutor_messages_created`: Ordenamiento temporal
- `idx_tutor_messages_role`: Filtrado por rol

### Perfiles y Configuraciones
- `idx_student_profiles_lookup`: Búsqueda por estudiante-curso
- `idx_course_grading_scales_course`: Escalas por curso
- `idx_agent_configs_course`: Configuraciones por curso

## Integración con el Sistema

### Supabase
- Compatible con Supabase PostgreSQL
- Utiliza `gen_random_uuid()` para IDs
- Soporte completo para RLS
- Funciona con `auth.uid()`

### n8n Workflow
- Las tablas están diseñadas para integrarse con n8n
- Metadata JSONB para información adicional
- Estructura optimizada para consultas RAG

### Frontend React
- Tipos TypeScript disponibles en `types/pedagogical.ts`
- Servicios de integración en `services/supabaseService.ts`
- Hooks de gestión en `hooks/usePedagogicalSettings.ts`

## Troubleshooting

### Problemas Comunes

#### 1. Error de Foreign Key
```sql
-- Verificar que las tablas referenciadas existen
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('users', 'courses', 'course_enrollments');
```

#### 2. RLS No Funciona
```sql
-- Verificar que RLS está habilitado
SELECT relname, relrowsecurity FROM pg_class 
WHERE relname IN ('tutor_conversations', 'tutor_messages');
```

#### 3. Índices Faltantes
```sql
-- Verificar índices
SELECT indexname FROM pg_indexes 
WHERE indexname LIKE 'idx_tutor_%';
```

### Soluciones

#### Resetear RLS
```sql
-- Deshabilitar RLS temporalmente
ALTER TABLE tutor_conversations DISABLE ROW LEVEL SECURITY;

-- Rehabilitar RLS
ALTER TABLE tutor_conversations ENABLE ROW LEVEL SECURITY;
```

#### Recrear Índices
```sql
-- Recrear índice específico
DROP INDEX IF EXISTS idx_tutor_conversations_student;
CREATE INDEX idx_tutor_conversations_student ON tutor_conversations(student_id);
```

## Monitoreo

### Consultas Útiles

#### Verificar Uso del Sistema
```sql
-- Conversaciones activas
SELECT COUNT(*) as active_conversations
FROM tutor_conversations 
WHERE last_activity_at > NOW() - INTERVAL '24 hours';

-- Mensajes por día
SELECT DATE(created_at) as date, COUNT(*) as messages
FROM tutor_messages 
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### Verificar Configuraciones
```sql
-- Configuraciones pedagógicas por curso
SELECT c.name as course_name, 
       ps.teaching_style, 
       ps.tone_preference, 
       ps.voice_name
FROM courses c
JOIN course_pedagogical_settings ps ON c.id = ps.course_id;
```

#### Verificar Métricas
```sql
-- Tiempo promedio de respuesta
SELECT AVG(metric_value) as avg_response_time
FROM tutor_usage_metrics 
WHERE metric_type = 'response_time';
```

## Mantenimiento

### Limpieza Regular
```sql
-- Eliminar conversaciones antiguas (más de 6 meses)
DELETE FROM tutor_conversations 
WHERE last_activity_at < NOW() - INTERVAL '6 months';

-- Limpiar métricas antiguas (más de 1 año)
DELETE FROM tutor_usage_metrics 
WHERE recorded_at < NOW() - INTERVAL '1 year';
```

### Optimización
```sql
-- Analizar tablas para optimización
ANALYZE tutor_conversations;
ANALYZE tutor_messages;
ANALYZE course_pedagogical_settings;
```

## Conclusión

Estos scripts proporcionan una base sólida para el sistema de tutor virtual multi-agente con:

- ✅ **Seguridad completa** con RLS
- ✅ **Escalabilidad** con índices optimizados
- ✅ **Flexibilidad** con metadata JSONB
- ✅ **Integración** con Supabase y n8n
- ✅ **Mantenimiento** con scripts de validación y limpieza

El sistema está listo para producción y puede manejar miles de conversaciones simultáneas con personalización completa por curso, docente y estudiante.

---

**Versión**: 2.0.0  
**Última actualización**: $(date)  
**Estado**: ✅ COMPLETADO
