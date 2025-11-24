# Verificación de Campos en UnitEditorModal

## Campos en la Base de Datos (course_units)

### Campos Base:
1. ✅ `id` - UUID (automático, no editable)
2. ✅ `course_id` - INTEGER (se pasa como prop)
3. ✅ `number` - INT (se calcula automáticamente o viene de unit existente)
4. ✅ `title` - TEXT (hay campo en formulario)
5. ✅ `description` - TEXT (hay campo en formulario)
6. ✅ `created_at` - TIMESTAMPTZ (automático, no editable)

### Campos de Contenido Rico (script 31):
7. ✅ `content_html` - TEXT (hay campo RichTextEditor)
8. ⚠️ `content_markdown` - TEXT (hay estado pero NO hay campo visible)
9. ✅ `learning_objectives` - TEXT[] (hay campo en formulario)
10. ✅ `duration_hours` - DECIMAL(5,2) (hay campo en formulario)
11. ✅ `order_index` - INTEGER (hay campo en formulario)
12. ✅ `thumbnail_url` - TEXT (hay campo en formulario)

## Campos en el Formulario (UnitEditorModal.tsx)

### Campos Visibles:
1. ✅ **Título de la Unidad** (`title`) - Campo requerido
2. ✅ **Descripción breve** (`description`) - Textarea
3. ✅ **Contenido Didáctico** (`content_html`) - RichTextEditor
4. ✅ **Objetivos de Aprendizaje** (`learning_objectives`) - Lista dinámica
5. ✅ **Duración (horas)** (`duration_hours`) - Input numérico
6. ✅ **Orden** (`order_index`) - Input numérico
7. ✅ **URL de Imagen Representativa** (`thumbnail_url`) - Input URL

### Campos en Estado pero NO Visibles:
- ⚠️ `content_markdown` - Existe en estado pero no hay campo para editarlo

## Campos que se Envían en handleSubmit

```typescript
const unitData = {
  course_id: courseId,                    // ✅
  number: unit?.number || 0,              // ✅
  title: title.trim(),                     // ✅
  description: description?.trim(),        // ✅
  content_html: contentHtml?.trim(),       // ✅
  content_markdown: contentMarkdown?.trim(), // ⚠️ Se envía pero siempre undefined (no hay campo)
  learning_objectives: learningObjectives,  // ✅
  duration_hours: durationHours,           // ✅
  order_index: orderIndex,                // ✅
  thumbnail_url: thumbnailUrl?.trim()     // ✅
};
```

## Conclusión

**Todos los campos principales están presentes**, pero:

1. **`content_markdown`** tiene estado pero no hay campo visual para editarlo. Esto está bien si:
   - Solo usamos HTML para editar
   - Markdown es opcional y puede generarse automáticamente
   - O simplemente se deja vacío

2. **Recomendación**: Si `content_markdown` no se usa, podemos:
   - Remover el estado y el campo del `unitData`
   - O agregar un campo opcional para editarlo (probablemente no necesario si ya tenemos HTML)

## Estado Actual: ✅ CORRECTO

Todos los campos principales están presentes y funcionando. El `content_markdown` es opcional y puede dejarse sin usar.

