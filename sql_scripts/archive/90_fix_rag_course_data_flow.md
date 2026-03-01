# Fix: RAG Service - Flujo de Datos del Curso Corregido

## Problema Identificado

El tutor virtual estaba generando información genérica/inventada (como "Fundamentos de la Gestión de Proyectos") en lugar de usar los datos reales del curso (unidades, sesiones, materiales procesados). El mensaje mostraba:

```
Hola! Soy tu tutor virtual especializado en "este curso".
...
Dado que la descripción del curso es genérica ("..."), he creado una para "este curso"...
Título del Curso: Fundamentos de la Gestión de Proyectos (INVENTADO)
```

## Causas Raíz

1. **Tipo incorrecto del curso**: El curso se agregaba a `allContent` con `type: 'chapter'` pero el código buscaba `type === 'course'`, por lo que nunca lo encontraba.

2. **Curso filtrado**: Después del filtrado por relevancia, el curso podía quedar excluido de los resultados finales.

3. **Prompt incompleto**: El prompt no incluía información detallada de unidades, sesiones y materiales procesados del curso.

4. **Falta de fallback**: Si el curso no estaba en `relevantContent`, no había un mecanismo para obtenerlo directamente de la base de datos.

## Solución Implementada

### 1. Corrección del Tipo del Curso

**Archivo**: `audio-tutor/services/ragService.ts` (línea ~950)

**Cambio**: Corregido el tipo del curso de `'chapter'` a `'course'`:

```typescript
// ANTES
{
  id: courseData.id.toString(),
  title: courseData.title,
  content: courseData.description || '',
  type: 'chapter', // ❌ INCORRECTO
  ...
}

// DESPUÉS
{
  id: courseData.id.toString(),
  title: courseData.title,
  content: courseData.description || courseData.title || 'Curso sin descripción',
  type: 'course', // ✅ CORRECTO
  courseId: courseIdInt.toString()
}
```

### 2. Asegurar Inclusión del Curso

**Archivo**: `audio-tutor/services/ragService.ts` (línea ~1020)

**Cambio**: Modificada la lógica de filtrado para garantizar que el curso siempre esté incluido:

```typescript
// IMPORTANTE: Asegurar que el curso siempre esté incluido
const courseContent = filteredContent.find(c => c.type === 'course') 
  || allContent.find(c => c.type === 'course');

// Si el curso no está en los primeros maxSources, agregarlo al inicio
if (courseContent && !limitedContent.find(c => c.type === 'course')) {
  limitedContent.unshift(courseContent);
}
```

### 3. Fallback a Base de Datos

**Archivo**: `audio-tutor/services/ragService.ts` (línea ~1283)

**Cambio**: Agregado fallback para obtener el curso directamente de la BD si no está en `relevantContent`:

```typescript
// Si no encontramos el curso en relevantContent, obtenerlo directamente de la BD
if (!courseInfo || courseTitle === 'este curso' || !courseDescription) {
  console.warn('⚠️ RAGService - Curso no encontrado en relevantContent, obteniendo de BD...');
  const { data: courseData } = await supabase
    .from('courses')
    .select('id, title, description, code')
    .eq('id', courseIdInt)
    .single();
  
  if (courseData) {
    courseTitle = courseData.title || 'este curso';
    courseDescription = courseData.description || courseData.title || '';
  }
}
```

### 4. Prompt Mejorado con Información Detallada

**Archivo**: `audio-tutor/services/ragService.ts` (línea ~1417)

**Cambio**: El prompt ahora incluye:
- Información completa del curso (título y descripción real)
- Lista de unidades del curso con sus descripciones
- Lista de sesiones del curso con sus descripciones y unidades asociadas
- Materiales procesados disponibles con información de páginas
- Instrucciones explícitas para NO inventar contenido

```typescript
// Obtener información detallada de unidades y sesiones
const { data: units } = await supabase
  .from('course_units')
  .select('id, number, title, description')
  .eq('course_id', courseIdInt)
  .order('number', { ascending: true });

const { data: sessions } = await supabase
  .from('sessions')
  .select('id, title, description, starts_at, ends_at, unit_id')
  .eq('course_id', courseIdInt)
  .order('starts_at', { ascending: true });

// Incluir en el prompt
const contentInfo = `
INFORMACIÓN DEL CURSO:
- Título: ${courseTitle}
- Descripción: ${courseDescription || 'Sin descripción disponible'}

UNIDADES DEL CURSO (${units.length}):
${units.map(u => `- Unidad ${u.number}: ${u.title}${u.description ? ` - ${u.description}` : ''}`).join('\n')}

SESIONES DEL CURSO (${sessions.length}):
${sessions.map(s => `- ${s.title}${s.description ? ` - ${s.description}` : ''}`).join('\n')}

LIBROS Y MATERIALES DISPONIBLES:
${materialsList.join('\n')}
`;
```

### 5. Instrucciones Explícitas en el Prompt

**Archivo**: `audio-tutor/services/ragService.ts` (línea ~1439)

**Cambio**: Agregadas instrucciones explícitas para evitar que el modelo invente contenido:

```typescript
INSTRUCCIONES IMPORTANTES:
1. SIEMPRE usa la información real del curso proporcionada arriba. NO inventes títulos, descripciones o contenido.
2. Si el curso tiene unidades y sesiones listadas, refiérete a ellas específicamente.
3. Si hay materiales procesados (chunks) disponibles, úsalos como fuente principal y menciona las páginas exactas.
4. Si la descripción del curso está vacía o es genérica, enfócate en los materiales, unidades y sesiones disponibles.
5. Responde basándote únicamente en el contenido real del curso proporcionado.
```

### 6. Logging Mejorado

**Archivo**: `audio-tutor/services/ragService.ts`

**Cambio**: Agregado logging detallado para verificar que los datos se están obteniendo correctamente:

```typescript
console.log('📚 RAGService - Contenido final para el prompt:', {
  total: limitedContent.length,
  curso: limitedContent.find(c => c.type === 'course')?.title || 'NO ENCONTRADO',
  unidades: limitedContent.filter(c => c.type === 'unit').length,
  sesiones: limitedContent.filter(c => c.type === 'session').length,
  materiales: limitedContent.filter(c => c.type === 'material').length,
  chunks: limitedContent.filter(c => c.id?.startsWith('chunk-')).length
});
```

## Resultado Esperado

1. **Datos reales del curso**: El tutor usará siempre el título y descripción reales del curso desde la base de datos.

2. **Información completa**: El prompt incluirá:
   - Título y descripción del curso
   - Lista completa de unidades con sus descripciones
   - Lista completa de sesiones con sus descripciones y unidades asociadas
   - Materiales procesados disponibles con información de páginas

3. **Sin contenido inventado**: Las instrucciones explícitas evitarán que el modelo invente títulos o descripciones.

4. **Mejor debugging**: El logging detallado ayudará a identificar problemas en el flujo de datos.

## Verificación

Para verificar que el fix funciona:

1. Acceder al tutor virtual para un curso específico (ej: curso ID 12)
2. Verificar en los logs de la consola que:
   - Se obtiene el curso de la BD correctamente
   - El curso está incluido en `relevantContent` con `type: 'course'`
   - El prompt incluye información de unidades, sesiones y materiales
3. Verificar que el tutor menciona:
   - El título real del curso (no "este curso")
   - Las unidades y sesiones reales del curso
   - Los materiales procesados disponibles (como "Manual de atención Neonatal")
   - NO inventa títulos o descripciones

## Notas Técnicas

- El curso ahora siempre se incluye en los resultados, incluso después del filtrado por relevancia.
- Si el curso no está en `relevantContent`, se obtiene directamente de la BD como fallback.
- El prompt incluye información estructurada de unidades, sesiones y materiales para que el modelo tenga contexto completo.
- Las instrucciones explícitas en el prompt previenen la generación de contenido inventado.

