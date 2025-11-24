# Implementación de Videos con Transcripciones para RAG

## Estado: ✅ IMPLEMENTADO (Versión Inicial + Botón Completado)

### Fecha: Enero 2025
### Última Actualización: Enero 2025 - Botón "He visto el video"

---

## Resumen

Se ha implementado un sistema completo para integrar videos de YouTube y Vimeo con transcripciones automáticas que se indexan en el sistema RAG para mejorar las respuestas del tutor de IA.

---

## Componentes Implementados

### 1. Base de Datos ✅

**Script SQL:** `sql_scripts/100_add_video_transcription_support.sql`

#### Modificaciones a la tabla `materials`:
- `transcription` (TEXT) - Transcripción completa del video
- `transcription_status` (VARCHAR) - Estado: pending, processing, completed, failed
- `video_platform` (VARCHAR) - Plataforma: youtube, vimeo, other
- `video_id` (VARCHAR) - ID del video en la plataforma
- `video_duration` (INTEGER) - Duración en segundos
- `transcription_metadata` (JSONB) - Metadatos adicionales

#### Nueva tabla `video_viewing_progress`:
- Tracking completo del progreso de visualización por estudiante
- Campos: watched_seconds, total_seconds, completion_percentage, last_position, is_completed
- Índices optimizados para consultas rápidas

---

### 2. Servicios ✅

#### `services/videoTranscriptService.ts`
- **VideoTranscriptService**: Servicio principal para extraer transcripciones
- **YouTubePlatform**: Implementación para YouTube (API pública)
- **VimeoPlatform**: Estructura para Vimeo (requiere API key para producción)
- **Funcionalidades**:
  - Detección automática de plataforma
  - Extracción de transcripciones
  - Indexación automática en RAG (course_content_chunks)
  - División en chunks para mejor búsqueda

#### `services/videoProgressService.ts`
- **VideoProgressService**: Servicio para tracking de progreso
- **Funcionalidades**:
  - Actualización de progreso de visualización
  - Obtención de progreso por material, unidad o curso
  - Estadísticas de progreso (completados, en progreso, no iniciados)
  - **`markAsCompleted()`**: Marca un video como completado manualmente y calcula tiempo de estudio
  - **`updateEnrollmentStudyTime()`**: Actualiza el tiempo de estudio total en `course_enrollments.time_spent_minutes`

#### `services/geminiService.ts` (Modificado)
- **generateEmbedding()**: Nueva función para generar embeddings usando Gemini API
- Usa el modelo `text-embedding-004` de Google

---

### 3. Componentes UI ✅

#### `components/VideoPlayer.tsx`
- Componente reproductor de video con soporte para:
  - YouTube (iframe embebido)
  - Vimeo (iframe embebido)
  - Videos HTML5 (otros formatos)
- **Características**:
  - Tracking automático de progreso
  - Reanudación desde última posición vista
  - Indicador visual de progreso
  - Marcado automático como completado (≥90%)
  - **Botón "He visto el video"**: Permite marcar manualmente como completado
    - Visible solo para estudiantes
    - Calcula tiempo de estudio basado en `video_duration`
    - Actualiza `time_spent_minutes` en `course_enrollments`
    - Muestra mensaje informativo con tiempo agregado
    - Indicador visual cuando está completado

#### `pages/ModuleEditorPage.tsx` (Modificado)
- **Mejoras**:
  - Detección automática de videos al crear materiales
  - Extracción automática de transcripciones en segundo plano
  - Indicadores visuales del estado de transcripción
  - Botón mejorado para agregar videos de YouTube

---

## Flujo de Funcionamiento

### 1. Creación de Material de Video

```
1. Docente agrega URL de video (YouTube/Vimeo)
   ↓
2. Sistema detecta plataforma automáticamente
   ↓
3. Material se crea en base de datos
   ↓
4. Estado de transcripción se marca como "processing"
   ↓
5. Servicio extrae transcripción en segundo plano
   ↓
6. Transcripción se guarda en materials.transcription
   ↓
7. Transcripción se divide en chunks
   ↓
8. Cada chunk se indexa en course_content_chunks con embedding
   ↓
9. Estado se actualiza a "completed" o "failed"
```

### 2. Visualización de Video por Estudiante

```
1. Estudiante abre video en VideoPlayer
   ↓
2. Sistema carga progreso guardado (si existe)
   ↓
3. Video se reproduce desde última posición
   ↓
4. Cada 5 segundos se actualiza progreso en BD
   ↓
5. Al alcanzar ≥90% se marca como completado automáticamente
   ↓
6. O el estudiante puede hacer clic en "He visto el video"
   ↓
7. Sistema marca como completado (100%)
   ↓
8. Calcula tiempo de estudio basado en video_duration
   ↓
9. Actualiza time_spent_minutes en course_enrollments
   ↓
10. Progreso disponible para reportes y análisis
```

### 3. Uso en RAG

```
1. Estudiante hace pregunta al tutor IA
   ↓
2. Sistema genera embedding de la pregunta
   ↓
3. Búsqueda vectorial en course_content_chunks
   ↓
4. Chunks de transcripciones de videos aparecen en resultados
   ↓
5. Tutor puede responder preguntas sobre contenido de videos
```

---

## Uso

### Para Docentes

1. **Agregar video de YouTube:**
   - Ir a Editor de Unidad
   - Hacer clic en "Añadir YouTube"
   - Pegar URL del video
   - El sistema extraerá la transcripción automáticamente

2. **Agregar video manualmente:**
   - Seleccionar tipo "Video" en el formulario
   - Pegar URL del video
   - El sistema detectará la plataforma y extraerá transcripción

3. **Ver estado de transcripción:**
   - Los materiales de video muestran badges de estado:
     - ✓ Verde: Transcripción disponible
     - ⏳ Amarillo: Extrayendo transcripción...
     - ✗ Rojo: Transcripción no disponible
     - ⏸ Gris: Sin transcripción

### Para Estudiantes

1. **Visualizar videos:**
   - Los videos se reproducen con tracking automático
   - El progreso se guarda automáticamente
   - Pueden reanudar desde donde dejaron

2. **Marcar video como completado:**
   - Botón "He visto el video" visible debajo del reproductor
   - Al hacer clic, marca el video como completado (100%)
   - Calcula y agrega el tiempo de estudio al total del curso
   - Muestra mensaje con el tiempo agregado
   - Una vez completado, muestra indicador verde con fecha

3. **Hacer preguntas sobre videos:**
   - El tutor IA puede responder preguntas sobre el contenido de los videos
   - Las transcripciones están indexadas en el RAG

---

## Limitaciones Actuales

### YouTube
- ✅ Funciona con videos que tienen transcripciones automáticas habilitadas
- ⚠️ Puede tener problemas de CORS en algunos navegadores
- 💡 **Solución futura**: Implementar Edge Function de Supabase para extracción

### Vimeo
- ⚠️ Requiere API key de Vimeo para extraer transcripciones
- 💡 **Solución futura**: Crear Edge Function con autenticación Vimeo

### Otros
- ⚠️ Videos HTML5 requieren que el navegador soporte MediaSource API para tracking preciso
- ✅ El tracking funciona con cualquier video HTML5

---

## Próximos Pasos (Mejoras Futuras)

### Corto Plazo
1. **Edge Functions de Supabase:**
   - Crear función para extraer transcripciones de YouTube (evitar CORS)
   - Crear función para extraer transcripciones de Vimeo (con API key)

2. **Mejoras en UI:**
   - Botón para re-extraer transcripción si falla
   - Vista previa de transcripción en el editor
   - Estadísticas de visualización por unidad/curso

### Mediano Plazo
1. **Soporte para más plataformas:**
   - Loom
   - Wistia
   - Panopto

2. **Análisis avanzado:**
   - Reportes de progreso por estudiante
   - Identificación de videos más/menos vistos
   - Recomendaciones basadas en progreso

3. **Mejoras en RAG:**
   - Búsqueda temporal (encontrar contenido por minuto del video)
   - Resúmenes automáticos de videos
   - Preguntas sugeridas basadas en contenido del video

---

## Archivos Creados/Modificados

### Nuevos Archivos
- `sql_scripts/100_add_video_transcription_support.sql`
- `services/videoTranscriptService.ts`
- `services/videoProgressService.ts`
- `components/VideoPlayer.tsx`
- `AI_CONTEXT/IMPLEMENTACION_VIDEOS_TRANSCRIPCIONES.md`

### Archivos Modificados
- `services/geminiService.ts` - Agregada función `generateEmbedding()`
- `pages/ModuleEditorPage.tsx` - Integración de extracción automática

---

## Instalación y Configuración

### 1. Ejecutar Script SQL

```sql
-- Ejecutar en Supabase SQL Editor
\i sql_scripts/100_add_video_transcription_support.sql
```

### 2. Verificar Variables de Entorno

Asegúrate de tener configurado:
- `VITE_GEMINI_API_KEY` - Para generar embeddings

### 3. Probar Funcionalidad

1. Crear un curso y unidad
2. Agregar un video de YouTube con transcripciones habilitadas
3. Verificar que se extrae la transcripción
4. Verificar que aparece en el RAG

---

## Notas Técnicas

### Embeddings
- Modelo usado: `text-embedding-004` de Google Gemini
- Dimensiones: 768
- Almacenamiento: Array en formato `[1,2,3,...]` en PostgreSQL

### Chunking
- Tamaño de chunk: 1000 caracteres
- División por oraciones para mantener contexto
- Cada chunk se indexa independientemente

### Tracking de Progreso
- Actualización cada 5 segundos (configurable)
- Completado automático al 90% de visualización
- Completado manual con botón "He visto el video" (100%)
- Última posición guardada para reanudación
- Cálculo de tiempo de estudio basado en `video_duration` (en minutos)
- Actualización de `time_spent_minutes` en `course_enrollments`

---

## Soporte

Para problemas o preguntas:
1. Revisar logs de consola del navegador
2. Verificar estado de transcripción en base de datos
3. Verificar que el video tenga transcripciones habilitadas (YouTube)

---

## Referencias

- [YouTube Transcript API](https://developers.google.com/youtube/v3/docs/captions)
- [Vimeo API Documentation](https://developer.vimeo.com/)
- [Gemini Embeddings API](https://ai.google.dev/docs/embeddings)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

