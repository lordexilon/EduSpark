# 📹 Guía de Uso: Videos con Transcripciones para RAG

## 🚀 Inicio Rápido

### Paso 1: Ejecutar la Migración SQL

Antes de usar la funcionalidad, necesitas ejecutar el script SQL en Supabase:

1. Abre tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor**
3. Crea una nueva consulta
4. Copia y pega el contenido de `sql_scripts/100_add_video_transcription_support.sql`
5. Ejecuta el script (botón "Run" o F5)

```sql
-- El script creará:
-- ✅ Columnas en la tabla materials para transcripciones
-- ✅ Tabla video_viewing_progress para tracking
-- ✅ Índices optimizados
```

### Paso 2: Verificar Configuración

Asegúrate de tener configurada la variable de entorno:

```bash
VITE_GEMINI_API_KEY=tu_api_key_aqui
```

---

## 👨‍🏫 Para Docentes: Agregar Videos

### Opción 1: Agregar Video de YouTube (Recomendado)

1. **Navegar al Editor de Unidad:**
   - Ve a tu curso
   - Selecciona una unidad
   - Haz clic en "Editar Unidad"

2. **Agregar el Video:**
   - Haz clic en el botón **"Añadir YouTube"** (botón rojo)
   - Pega la URL del video de YouTube
   - Ejemplo: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - Haz clic en "Aceptar"

3. **Esperar Extracción:**
   - Verás un badge amarillo: **"⏳ Extrayendo transcripción..."**
   - El proceso toma unos segundos
   - Cuando termine, verás: **"✓ Transcripción disponible"** (verde)

### Opción 2: Agregar Video Manualmente

1. **En el Editor de Unidad:**
   - En el formulario "Agregar material"
   - Selecciona tipo: **"Video"**
   - Pega la URL del video (YouTube o Vimeo)
   - Agrega un título (opcional)
   - Haz clic en **"Agregar"**

2. **El sistema automáticamente:**
   - Detecta la plataforma (YouTube/Vimeo)
   - Extrae el ID del video
   - Intenta obtener la transcripción
   - Indexa en el RAG

### Estados de Transcripción

Los materiales de video muestran badges de estado:

- ✅ **Verde**: `✓ Transcripción disponible` - Lista para usar en RAG
- ⏳ **Amarillo**: `⏳ Extrayendo transcripción...` - Procesando
- ✗ **Rojo**: `✗ Transcripción no disponible` - No se pudo extraer
- ⏸ **Gris**: `⏸ Sin transcripción` - Aún no procesado

---

## 👨‍🎓 Para Estudiantes: Ver Videos

### Visualizar Videos

1. **Acceder al Video:**
   - Ve a tu curso
   - Selecciona la unidad con el video
   - Haz clic en el material de video

2. **Reproducción Automática:**
   - El video se carga automáticamente
   - Si ya lo habías visto, se reanuda desde donde lo dejaste
   - Tu progreso se guarda automáticamente cada 5 segundos

3. **Indicadores de Progreso:**
   - Verás tu porcentaje de completitud
   - Ejemplo: `Progreso: 45% completado`
   - Al llegar al 90%, se marca como completado automáticamente: `✓ Completado`

4. **Marcar como Completado Manualmente:**
   - Si ya viste todo el video, puedes hacer clic en el botón **"He visto el video"**
   - El botón aparece debajo del reproductor en un recuadro azul
   - Al hacer clic:
     - Marca el video como completado (100%)
     - Calcula el tiempo de estudio basado en la duración del video
     - Actualiza tu tiempo total de estudio en el curso
     - Muestra un mensaje con el tiempo agregado
   - Una vez completado, verás un recuadro verde con la fecha de completado

### Hacer Preguntas sobre Videos

1. **Abrir el Tutor IA:**
   - Haz clic en el botón "Tutor IA" o "Chat con Tutor"
   - O navega a la página del tutor

2. **Hacer Preguntas:**
   - Puedes preguntar sobre el contenido del video
   - Ejemplos:
     - "¿Qué explicó el profesor sobre [tema]?"
     - "Resume los puntos principales del video"
     - "¿Cuál fue la conclusión del video?"
     - "Explícame el concepto de [tema] que se mencionó"

3. **El Tutor IA:**
   - Buscará en las transcripciones indexadas
   - Responderá basándose en el contenido real del video
   - Podrá citar partes específicas del video

---

## 🔍 Verificar que Funciona

### Para Docentes: Verificar Transcripción

1. **En el Editor de Unidad:**
   - Busca el material de video
   - Verifica el badge de estado
   - Debe mostrar: `✓ Transcripción disponible`

2. **En la Base de Datos (Opcional):**
   ```sql
   SELECT 
     id, 
     title, 
     transcription_status, 
     video_platform,
     LENGTH(transcription) as transcription_length
   FROM materials
   WHERE kind = 'video'
   ORDER BY created_at DESC;
   ```

### Para Estudiantes: Verificar Progreso

1. **Ver tu Progreso:**
   - Al reproducir un video, verás tu porcentaje
   - El progreso se guarda automáticamente

2. **Ver Estadísticas (Futuro):**
   - Próximamente habrá un dashboard de progreso
   - Por ahora, el progreso se muestra en cada video

---

## ❓ Preguntas Frecuentes

### ¿Por qué no se extrae la transcripción?

**Posibles causas:**
1. **El video no tiene transcripciones habilitadas:**
   - YouTube requiere que el creador haya habilitado subtítulos
   - Algunos videos solo tienen transcripciones automáticas (funcionan)
   - Otros no tienen ninguna transcripción disponible

2. **Problemas de CORS:**
   - Algunos navegadores bloquean las peticiones
   - **Solución temporal**: Usar otro navegador o esperar a Edge Function

3. **Video de Vimeo:**
   - Requiere API key de Vimeo (aún no implementado completamente)
   - Por ahora solo funciona con YouTube

### ¿Cómo sé si un video de YouTube tiene transcripciones?

1. Ve al video en YouTube
2. Haz clic en los tres puntos (⋯)
3. Selecciona "Mostrar transcripción"
4. Si aparece texto, el video tiene transcripciones disponibles

### ¿Puedo re-extraer una transcripción?

**Por ahora:**
- No hay botón en la UI
- Puedes eliminar y volver a agregar el material
- O actualizar manualmente en la BD: `UPDATE materials SET transcription_status = 'pending' WHERE id = '...'`

**Próximamente:**
- Botón "Re-extraer transcripción" en el editor

### ¿El progreso se guarda automáticamente?

**Sí:**
- Se guarda cada 5 segundos mientras ves el video
- Se guarda la última posición vista
- Se marca como completado automáticamente al 90%

**Marcado Manual:**
- Puedes usar el botón "He visto el video" para marcar como completado inmediatamente
- Esto actualiza tu tiempo de estudio total en el curso
- El tiempo se calcula basado en la duración del video (en minutos)

**No se guarda:**
- Si no estás autenticado
- Si hay error de conexión (se reintenta automáticamente)

---

## 🎯 Casos de Uso

### Caso 1: Clase con Video Tutorial

**Docente:**
1. Encuentra un video tutorial en YouTube sobre el tema
2. Agrega el video a la unidad correspondiente
3. El sistema extrae la transcripción automáticamente
4. Los estudiantes pueden hacer preguntas sobre el video al tutor IA

**Estudiante:**
1. Ve el video en la plataforma
2. Su progreso se guarda automáticamente
3. Puede hacer preguntas al tutor IA sobre el contenido
4. El tutor responde basándose en la transcripción real

### Caso 2: Video de Clase Grabada

**Docente:**
1. Sube su propia clase grabada a YouTube
2. Asegúrate de tener subtítulos habilitados
3. Agrega el video a la unidad
4. Los estudiantes pueden buscar contenido específico

**Estudiante:**
1. Ve la clase grabada
2. Si necesita revisar algo, pregunta al tutor IA
3. El tutor puede citar la parte exacta del video

### Caso 3: Seguimiento de Progreso

**Docente:**
1. Ve qué videos han visto los estudiantes
2. Identifica qué contenido necesita más atención
3. Puede hacer preguntas sobre videos específicos en evaluaciones

**Estudiante:**
1. Ve su progreso en cada video
2. Puede reanudar desde donde lo dejó
3. Sabe qué videos ha completado

---

## 🔧 Solución de Problemas

### Problema: "Transcripción no disponible"

**Solución:**
1. Verifica que el video tenga transcripciones en YouTube
2. Intenta con otro video que sepas que tiene subtítulos
3. Espera unos segundos y recarga la página

### Problema: El video no se reproduce

**Solución:**
1. Verifica que la URL sea correcta
2. Asegúrate de que el video sea público (no privado)
3. Prueba abrir el video directamente en YouTube/Vimeo

### Problema: El progreso no se guarda

**Solución:**
1. Verifica que estés autenticado
2. Revisa la consola del navegador para errores
3. Intenta recargar la página

---

## 📊 Ejemplos de URLs Soportadas

### YouTube (✅ Funcional)

```
✅ https://www.youtube.com/watch?v=dQw4w9WgXcQ
✅ https://youtu.be/dQw4w9WgXcQ
✅ https://www.youtube.com/embed/dQw4w9WgXcQ
```

### Vimeo (⚠️ Estructura lista, requiere API key)

```
⚠️ https://vimeo.com/123456789
```

---

## 🚧 Próximas Mejoras

- [x] Botón "He visto el video" para marcar como completado manualmente
- [x] Cálculo automático de tiempo de estudio
- [ ] Botón para re-extraer transcripciones
- [ ] Vista previa de transcripción en el editor
- [ ] Dashboard de progreso por estudiante
- [ ] Soporte completo para Vimeo
- [ ] Búsqueda temporal (encontrar contenido por minuto)
- [ ] Resúmenes automáticos de videos

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs de la consola del navegador (F12)
2. Verifica el estado en la base de datos
3. Consulta la documentación técnica: `AI_CONTEXT/IMPLEMENTACION_VIDEOS_TRANSCRIPCIONES.md`

---

**¡Listo para usar! 🎉**

Ahora puedes agregar videos con transcripciones y mejorar las respuestas del tutor IA.

