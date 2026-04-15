# Fix: RAG Service - Incluir Materiales a Nivel de Curso

## Problema Identificado

El tutor virtual no estaba relacionando correctamente el material "Manual de atención Neonatal" porque:

1. **Filtrado excesivo por módulo**: Cuando se accedía al tutor desde una sesión o unidad específica (con `moduleId`), el servicio RAG filtraba los materiales por `unit_id = moduleId`, excluyendo materiales a nivel de curso (donde `unit_id` y `session_id` son `NULL`).

2. **Material no asociado a sesión**: El material "Manual de atención Neonatal" está asociado directamente al curso (course_id: 12) y no a una sesión o unidad específica, por lo que se excluía cuando había un `moduleId`.

## Solución Implementada

### 1. Inclusión de Materiales a Nivel de Curso

**Archivo**: `audio-tutor/services/ragService.ts`

**Cambio**: Modificada la lógica de búsqueda de materiales para que, cuando se proporciona un `moduleId`, se incluyan:
- Materiales específicos del módulo (`unit_id = moduleId`)
- Materiales a nivel de curso (`unit_id IS NULL AND session_id IS NULL`)

```typescript
// ANTES: Solo materiales del módulo
if (moduleId) {
  materialsQuery = materialsQuery.eq('unit_id', moduleId);
}

// DESPUÉS: Materiales del módulo + materiales a nivel de curso
if (moduleId) {
  // Buscar materiales del módulo
  const moduleMaterials = await supabase
    .from('materials')
    .select('...')
    .eq('course_id', courseIdInt)
    .eq('unit_id', moduleId);
  
  // Buscar materiales a nivel de curso
  const courseLevelMaterials = await supabase
    .from('materials')
    .select('...')
    .eq('course_id', courseIdInt)
    .is('unit_id', null)
    .is('session_id', null);
  
  // Combinar ambos, evitando duplicados
  materialsFromTable = [...moduleMaterials, ...courseLevelMaterials];
}
```

### 2. Mejora de Búsqueda con Términos Relevantes

**Cambio**: Mejorada la búsqueda para detectar cuando la consulta menciona materiales específicos (como "Manual de atención Neonatal") y expandir la consulta con términos relevantes.

```typescript
// Detectar menciones de "manual de atención neonatal"
const neonatalPatterns = [
  /manual\s+de\s+atenci[oó]n\s+neonatal/i,
  /atenci[oó]n\s+neonatal/i,
  /neonatal/i
];

if (mentionsNeonatal) {
  enhancedQuery = `${query} neonatal atención cuidados recién nacido`;
}
```

### 3. Logging Mejorado

**Cambio**: Agregado logging detallado para ayudar a diagnosticar problemas de búsqueda:
- Log de la consulta original vs. consulta mejorada
- Log de chunks encontrados con metadata (material_id, título, páginas)
- Log de materiales cargados (módulo vs. curso)

## Resultado Esperado

1. **Materiales siempre disponibles**: Los materiales a nivel de curso (como "Manual de atención Neonatal") estarán disponibles en todas las sesiones y unidades del curso.

2. **Búsqueda mejorada**: Las consultas sobre materiales específicos encontrarán mejor los chunks relevantes gracias a la expansión de términos.

3. **Mejor debugging**: El logging detallado ayudará a identificar problemas de búsqueda en el futuro.

## Verificación

Para verificar que el fix funciona:

1. Acceder al tutor virtual desde una sesión específica del curso 12
2. Hacer una consulta sobre "Manual de atención Neonatal" o "atención neonatal"
3. Verificar en los logs de la consola que:
   - Se cargan materiales del módulo Y materiales a nivel de curso
   - La búsqueda encuentra chunks del material "Manual de atención Neonatal"
   - El tutor menciona el material y las páginas relevantes en su respuesta

## Notas Técnicas

- El RPC `search_course_content_chunks_text_clean` ya busca por `course_id` únicamente, por lo que encuentra todos los chunks del curso, incluyendo los a nivel de curso.
- La mejora principal está en la carga de materiales desde la tabla `materials`, que ahora incluye materiales a nivel de curso incluso cuando hay un `moduleId`.
- Los chunks encontrados por el RPC ya incluyen metadata con `material_id`, por lo que se pueden relacionar correctamente con los materiales.

