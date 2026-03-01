# Instrucciones: Filtrar Quizzes y Flashcards por Disponibilidad

## Contexto
Acabamos de agregar campos `available_from` y `available_until` a assessments y flashcards en la base de datos. Ahora necesitamos que la vista del estudiante (CourseViewPage.tsx) oculte automáticamente los quizzes y flashcards que no estén disponibles según sus fechas.

## Paso 1: Agregar Función de Validación de Quiz

**Archivo:** `src/pages/CourseViewPage.tsx`

**Ubicación:** Después de la función `loadCourseData` (alrededor de línea 240)

**Agregar:**

```typescript
// Función para validar si un quiz está disponible según fechas
const isQuizAvailable = (quiz: Assessment): boolean => {
  // Si el usuario no es estudiante, siempre disponible
  if (user?.role?.name !== 'student') return true;
  
  const now = new Date();
  
  // Si tiene fechas available_from y available_until, validar contra ellas
  if (quiz.available_from && quiz.available_until) {
    const startDate = new Date(quiz.available_from);
    const endDate = new Date(quiz.available_until);
    return now >= startDate && now <= endDate;
  }
  
  // Si solo tiene available_from, validar que ya haya comenzado
  if (quiz.available_from) {
    const startDate = new Date(quiz.available_from);
    return now >= startDate;
  }
  
  // Si solo tiene available_until, validar que no haya finalizado
  if (quiz.available_until) {
    const endDate = new Date(quiz.available_until);
    return now <= endDate;
  }
  
  // Si no tiene fechas, está disponible
  return true;
};
```

## Paso 2: Aplicar Filtro a Quizzes en el Render

**Buscar en CourseViewPage.tsx:** Donde se renderizan los quizzes (busca `quizzesByUnit[unit.id]`)

**Patrón original:**
```typescript
const unitQuizzes = quizzesByUnit[unit.id] || [];
```

**Cambiar a:**
```typescript
const unitQuizzes = (quizzesByUnit[unit.id] || []).filter(isQuizAvailable);
```

**También buscar:**
```typescript
{generalQuizzes.map((quiz) => (
```

**Cambiar a:**
```typescript
{generalQuizzes.filter(isQuizAvailable).map((quiz) => (
```

**Y para el examen final:**
```typescript
{finalExam && (
```

**Cambiar a:**
```typescript
{finalExam && isQuizAvailable(finalExam) && (
```

## Paso 3: Agregar Función para Flashcards

**Agregar después de isQuizAvailable:**

```typescript
// Función para validar si una flashcard está disponible según fechas
const isFlashcardAvailable = (flashcard: any): boolean => {
  // Si el usuario no es estudiante, siempre disponible
  if (user?.role?.name !== 'student') return true;
  
  const now = new Date();
  
  // Si tiene fechas, validar contra ellas
  if (flashcard.available_from && flashcard.available_until) {
    const startDate = new Date(flashcard.available_from);
    const endDate = new Date(flashcard.available_until);
    return now >= startDate && now <= endDate;
  }
  
  // Si solo tiene available_from
  if (flashcard.available_from) {
    const startDate = new Date(flashcard.available_from);
    return now >= startDate;
  }
  
  // Si solo tiene available_until
  if (flashcard.available_until) {
    const endDate = new Date(flashcard.available_until);
    return now <= endDate;
  }
  
  // Si no tiene fechas, está disponible
  return true;
};
```

## Paso 4: Aplicar Filtro a Flashcards

**Buscar:** Donde se cargan o muestran flashcards

**Aplicar filtro:**
```typescript
// Si tienes algo como:
const flashcards = await flashcardService.getCourseFlashcards(courseId);

// Cambia a:
const allFlashcards = await flashcardService.getCourseFlashcards(courseId);
const flashcards = allFlashcards.filter(isFlashcardAvailable);
```

## Paso 5: Actualizar Contador de Flashcards Disponibles

**Buscar:** `setTotalFlashcards`

**Asegúrate de contar solo las disponibles:**
```typescript
const availableFlashcards = flashcards.filter(isFlashcardAvailable);
setTotalFlashcards(availableFlashcards.length);
```

## Verificación

Después de hacer estos cambios:

1. **Recarga la aplicación** (F5)
2. **Como estudiante**, no deberías ver quizzes/flashcards con fechas futuras
3. **Como profesor/admin**, deberías ver TODO (porque el rol no es 'student')

## Notas Importantes

- ✅ Los campos ya existen en la BD
- ✅ Las interfaces TypeScript ya están actualizadas
- ⚠️ Si no encuentras alguna parte exacta, busca patrones similares
- 💡 Los profesores SIEMPRE ven todo el contenido (para poder configurarlo)
- 💡 Si no hay fechas configuradas, el contenido está SIEMPRE disponible

## Testing Recomendado

1. Crea un quiz con `available_from` en el FUTURO → No debería verse
2. Crea un quiz con `available_until` en el PASADO → No debería verse
3. Crea un quiz sin fechas → Siempre visible
4. Verifica como PROFESOR → Todo visible siempre
