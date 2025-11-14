# Extracción de Transcripciones de Videos para RAG

## Objetivo
Permitir que el sistema RAG pueda responder preguntas sobre videos de YouTube extrayendo y utilizando sus transcripciones como material de contexto.

## Estado
**PENDIENTE DE IMPLEMENTACIÓN** - Documentación para desarrollo futuro

---

## Problema Actual
Actualmente, cuando un material tiene solo una URL de video de YouTube (sin contenido de texto), el RAG solo puede:
- Saber que existe el recurso
- Mencionarlo por título y URL
- **NO puede** responder preguntas sobre el contenido del video porque no tiene acceso a la transcripción

## Solución Propuesta

### 1. Extracción de Transcripciones de YouTube

#### Opciones de Implementación:

**Opción A: YouTube Data API v3 + YouTube Transcript API**
- **Ventajas**: Oficial, confiable, acceso a metadatos del video
- **Desventajas**: Requiere API key, quota limits
- **Librería**: `youtube-transcript-api` (Python) o `youtube-transcript` (JavaScript)

**Opción B: Librería de terceros (sin API key)**
- **Ventajas**: No requiere API key, más simple
- **Desventajas**: Puede romperse si YouTube cambia su estructura
- **Librería**: `youtube-transcript-api` o `@ytdl-core` (Node.js)

**Opción C: Web scraping directo**
- **Ventajas**: Sin dependencias externas
- **Desventajas**: Frágil, puede violar términos de servicio
- **NO RECOMENDADO**

#### Recomendación: Opción A o B
- Usar `youtube-transcript-api` (JavaScript/Node.js compatible)
- Procesar en el backend (Edge Function de Supabase o servicio separado)

---

## Arquitectura Propuesta

### Flujo de Ingesta

```
1. Docente agrega video de YouTube
   ↓
2. Sistema detecta URL de YouTube en course_materials
   ↓
3. Trigger o proceso batch extrae transcripción
   ↓
4. Transcripción se guarda en campo `transcription` o `content` de course_materials
   ↓
5. Transcripción se indexa en RAG (course_content_chunks o directamente en materials)
```

### Modificaciones al Esquema

#### Tabla `course_materials`
```sql
-- Agregar columna para almacenar transcripciones
ALTER TABLE course_materials 
ADD COLUMN transcription text;

-- Índice para búsqueda
CREATE INDEX idx_course_materials_transcription 
ON course_materials USING gin(to_tsvector('spanish', transcription));
```

### Servicio de Extracción

#### Edge Function de Supabase (Recomendado)
```typescript
// supabase/functions/extract-youtube-transcript/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Usar librería compatible con Deno para extraer transcripciones
serve(async (req) => {
  const { materialId, videoUrl } = await req.json()
  
  // Extraer transcripción (implementar con librería apropiada)
  const transcript = await extractYouTubeTranscript(videoUrl)
  
  // Guardar en course_materials
  const supabase = createClient(...)
  await supabase
    .from('course_materials')
    .update somos { transcription: transcript })
    .eq('id', materialId)
  
  return new Response(JSON.stringify({ success: true }))
})
```

#### Alternativa: Proceso en Frontend (Menos Recomendado)
- Solo para desarrollo/testing
- Requiere CORS habilitado
- Más lento y menos confiable

---

## Implementación Frontend

### Modificar RAGService

```typescript
// audio-tutor/services/ragService.ts

private async getRelevantContent(
  query: string, 
  courseId: string, 
  studentProfile: StudentProfile,
  moduleId?: string
): Promise<CourseContent[]> {
  // ... código existente ...
  
  // Si material tiene transcripción, usarla como contenido
  materials.map((material: any HC) => {
    let contentText = material.content || '';
    
    // Si tiene transcripción, usarla como contenido principal
    if (material.transcription && !contentText) {
      contentText = `Transcripción del video: ${material.transcription}`;
    } else if (material.transcription && contentText) {
      contentText = `${contentText}\n\nTranscripción del video: ${material.transcription}`;
    }
    
    // ... resto del código ...
  })
}
```

### Trigger Automático

#### Opción 1: Database Trigger
```sql
-- Función para extraer transcripción cuando se crea/actualiza material con URL de YouTube
CREATE OR REPLACE FUNCTION extract_youtube_transcript()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.file_url LIKE '%youtube.com%' OR NEW.file_url LIKE '%youtu.be%' THEN
    -- Llamar a Edge Function o proceso async para extraer transcripción
    PERFORM net.http_post(
      url := 'https://<project>.supabase.co/functions/v1/extract-youtube-transcript',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('materialId', NEW.id, 'videoUrl', NEW.file_url)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_extract_transcript
AFTER INSERT OR UPDATE ON course_materials
FOR EACH ROW
WHEN (NEW.file_url LIKE '%youtube.com%' OR NEW.file_url LIKE '%youtu.be%')
EXECUTE FUNCTION extract_youtube_transcript();
```

#### Opción 2: Proceso Manual/On-Demand
- Agregar botón "Extraer Transcripción" en ModuleEditorPage
- Llamar a Edge Function manualmente
- Útil para videos existentes

---

## Librerías Recomendadas

### JavaScript/TypeScript
1. **`youtube-transcript-api`** (no oficial, pero popular)
   ```bash
   npm install youtube-transcript
   ```
   - Funciona con Node.js y Deno
   - No requiere API key
   - Puede extraer transcripciones automáticas y manuales

2. **YouTube Data API v3** (oficial)
   - Requiere API key de Google Cloud
   - Solo para metadatos, no transcripciones directas
   - Combinar con librería de transcripciones

### Python (si se usa backend Python)
1. **`youtube-transcript-api`**
   ```bash
   pip install youtube-transcript-api
   ```

---

## Ejemplo de Implementación

### Función de Extracción (Node.js/Deno)

```typescript
// utils/youtubeTranscript.ts

export async function extractYouTubeTranscript(videoUrl: string): Promise<string | null尽量 {
  try {
    // Extraer video ID de la URL
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return null;
    
    // Usar librería para obtener transcripción
    // Ejemplo con youtube-transcript-api
    const transcriptResponse = await fetch(
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=es`
    );
    
    if (!transcriptResponse.ok) {
      // Intentar con librería alternativa
      return await extractWithLibrary(videoId);
    }
    
    // Parsear XML de transcripción
    const transcriptXml = await transcriptResponse.text();
    const transcript = parseTranscriptXml(transcriptXml);
    
    return transcript;
  } catch (error) {
    console.error('Error extracting YouTube transcript:', error);
    return null;
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
```

---

## Consideraciones Importantes

### 1. Límites y Restricciones
- **Términos de Servicio de YouTube**: Verificar que la extracción esté permitida
- **Quota Limits**: Si se usa API oficial, monitorear límites
- **Tasa de errores**: No todos los videos tienen transcripciones disponibles

### 2. Idiomas
- Intentar extraer en español primero
- Fallback a inglés si no está disponible
- Permitir selección manual de idioma

### 3. Procesamiento
- **Chunking**: Dividir transcripciones largas en fragmentos para RAG
- **Límite de tokens**: Algunas transcripciones pueden ser muy largas
- **Cache**: Evitar re-extraer transcripciones que ya existen

### 4. UX
- Mostrar estado "Transcripción disponible" en materiales
- Permitir re-extraer si falla inicialmente
- Mostrar progreso durante extracción

---

## Pasos de Implementación (Futuro)

1. **Fase 1: Setup**
   - Instalar librería de transcripciones
   - Crear Edge Function o servicio de extracción
   - Agregar columna `transcription` a `course_materials`

2. **Fase 2: Extracción Manual**
   - Agregar botón "Extraer Transcripción" en editor
   - Implementar función de extracción
   - Guardar transcripciones en base de datos

3. **Fase 3: Integración con RAG**
   - Modificar RAGService para usar transcripciones
   - Actualizar detección de tipo de URL
   - Probar que el RAG pueda responder sobre videos

4. **Fase 4: Automatización**
   - Implementar trigger automático
   - Proceso batch para videos existentes
   - Manejo de errores y reintentos

---

## Referencias

- [YouTube Transcript API Elements](https://developers.google.com/youtube/v3/docs/captions)
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- Librerías populares: `youtube-transcript-api`, `yt-dlp`

---

## Notas Adicionales

- **PDFs**: Similar proceso podría aplicarse para extraer texto de PDFs usando servicios como:
  - PDF.js (frontend)
  - pdf-parse (Node.js)
  - Google Cloud Document AI (backend)

- **Otros formatos**: Considerar transcripciones de:
  - Zoom/Meet (si hay grabaciones)
  - Podcasts
  - Otros servicios de video

