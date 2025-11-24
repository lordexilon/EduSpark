# 📝 Plan de Implementación: Quizzes y Trivias

**Fecha:** Diciembre 2024  
**Estado:** 🚧 Scripts SQL Listos - Pendiente Frontend

---

## ✅ Completado

### Base de Datos:
- ✅ `88_create_quizzes_assessments.sql` - Creado
- ✅ Tablas: `assessments`, `questions`, `assessment_attempts`, `question_responses`
- ✅ Políticas RLS configuradas
- ✅ Triggers para cálculo automático de puntuaciones

### Servicios:
- ✅ `services/quizService.ts` - Creado
- ✅ Interfaces TypeScript: `Assessment`, `Question`, `AssessmentAttempt`, `QuestionResponse`

---

## 🎯 Características del Sistema

### Tipos de Assessments:
1. **Quiz:** Evaluación rápida con opción múltiple
2. **Trivia:** Evaluación lúdica, menos formal
3. **Exam:** Examen formal con límite de tiempo
4. **Project:** Proyecto o trabajo práctico
5. **Assignment:** Tarea o deberes

### Tipos de Preguntas:
1. **multiple_choice:** Opción múltiple
2. **true_false:** Verdadero/Falso
3. **short_answer:** Respuesta corta
4. **essay:** Ensayo o respuesta larga
5. **matching:** Emparejamiento

---

## 🚧 Implementación Pendiente (Frontend)

### Fase 1: Administración de Quizzes (Docentes)

#### Página: `pages/QuizBuilderPage.tsx`
- **Ruta:** `/teacher/quizzes/new` o `/teacher/quizzes/edit/:id`
- **Funcionalidad:**
  - Formulario para crear/editar quiz
  - Campos: título, descripción, tipo, límite de tiempo, intentos máximos
  - Selector de unidad/sesión asociada
  - Configuración de fechas y disponibilidad
  - Botones: Guardar Borrador, Publicar

#### Página: `pages/QuestionEditorPage.tsx`
- **Ruta:** `/teacher/quizzes/:id/questions`
- **Funcionalidad:**
  - Agregar/editar/eliminar preguntas
  - Drag & drop para reordenar
  - Editor de opciones múltiples
  - Configuración de puntos por pregunta
  - Vista previa del quiz

#### Componente: `components/QuestionBuilder.tsx`
- **Props:** `question`, `onChange`, `onDelete`
- **Funcionalidad:**
  - Selector de tipo de pregunta
  - Editor de texto con rich formatting
  - Para opción múltiple: agregar/eliminar opciones
  - Marcar respuesta correcta
  - Configurar puntos

#### Vista: `pages/TeacherQuizzesPage.tsx`
- **Ruta:** `/teacher/quizzes`
- **Funcionalidad:**
  - Lista de todos los quizzes del docente
  - Filtros: por curso, por tipo, por estado
  - Estadísticas: intentos, promedio de calificaciones
  - Acciones: Editar, Duplicar, Eliminar, Ver resultados

---

### Fase 2: Tomar Quizzes (Estudiantes)

#### Página: `pages/TakeQuizPage.tsx`
- **Ruta:** `/quiz/:id`
- **Funcionalidad:**
  - Obtener quiz y preguntas
  - Mostrar instrucciones y límite de tiempo
  - Renderizar preguntas con inputs apropiados
  - Timer visible (si hay límite)
  - Navegación entre preguntas
  - Botón "Enviar Respuestas"

#### Página: `pages/QuizResultsPage.tsx`
- **Ruta:** `/quiz/:id/results/:attemptId`
- **Funcionalidad:**
  - Mostrar puntuación total
  - Desglose por pregunta
  - Indicar respuestas correctas/incorrectas
  - Explicaciones (si configuradas)
  - Botón "Ver otros intentos" (si permitido)

#### Componente: `components/QuizTimer.tsx`
- **Props:** `timeLimit`, `onTimeUp`
- **Funcionalidad:**
  - Cuenta regresiva visual
  - Alerta cuando quedan 5 minutos
  - Auto-submit al llegar a 0

#### Componente: `components/QuestionCard.tsx`
- **Props:** `question`, `onAnswer`, `initialAnswer`
- **Funcionalidad:**
  - Renderizar según tipo de pregunta
  - Inputs apropiados (checkboxes, radio, textarea)
  - Indicador de obligatorio
  - Guardar respuesta al cambiar

---

### Fase 3: Resultados y Análisis (Docentes)

#### Página: `pages/QuizAnalyticsPage.tsx`
- **Ruta:** `/teacher/quizzes/:id/analytics`
- **Funcionalidad:**
  - Estadísticas generales del quiz
  - Tabla de resultados por estudiante
  - Histograma de calificaciones
  - Preguntas más falladas
  - Tasa de aprobación

#### Vista: Reporte Detallado por Estudiante
- Ver todos los intentos
- Ver respuestas específicas
- Agregar feedback manual
- Re-calificar si es necesario

---

### Fase 4: Integración

#### Modificar `CourseViewPage.tsx`
- Agregar sección "Evaluaciones" después de sesiones
- Mostrar quizzes disponibles para la unidad
- Indicar estado: Disponible, En Progreso, Completado

#### Modificar `UnitEditorPage.tsx`
- Agregar pestaña "Evaluaciones"
- Listar quizzes de la unidad
- Botón "Nuevo Quiz"

#### Dashboard de Estudiantes
- Mostrar quizzes pendientes
- Indicar fecha límite
- Link directo a tomar quiz

---

## 📋 Estructura de Archivos Pendientes

```
pages/
  ├── QuizBuilderPage.tsx          ⏳ Crear
  ├── QuestionEditorPage.tsx       ⏳ Crear
  ├── TakeQuizPage.tsx             ⏳ Crear
  ├── QuizResultsPage.tsx          ⏳ Crear
  ├── TeacherQuizzesPage.tsx       ⏳ Crear
  └── QuizAnalyticsPage.tsx        ⏳ Crear

components/
  ├── QuestionBuilder.tsx          ⏳ Crear
  ├── QuizTimer.tsx                ⏳ Crear
  ├── QuestionCard.tsx             ⏳ Crear
  ├── MultipleChoiceQuestion.tsx   ⏳ Crear
  ├── TrueFalseQuestion.tsx        ⏳ Crear
  ├── ShortAnswerQuestion.tsx      ⏳ Crear
  └── EssayQuestion.tsx            ⏳ Crear
```

---

## 🎨 Wireframes Conceptuales

### Vista de Crear Quiz (Docente):
```
┌─────────────────────────────────────────┐
│ Crear Nuevo Quiz                         │
├─────────────────────────────────────────┤
│ Título: [_____________________________]  │
│ Tipo: [Quiz ▼]                          │
│ Unidad: [Unidad 1 ▼]                    │
│                                         │
│ Descripción:                            │
│ [_____________________________]         │
│ [_____________________________]         │
│                                         │
│ Configuración:                          │
│ ⏱️ Tiempo límite: [___] minutos        │
│ 🔁 Intentos máximos: [1 ▼]             │
│ ✅ Puntuación de aprobación: [70%]     │
│                                         │
│ Agregar Pregunta [+]                    │
│                                         │
│ [Cancelar]  [Guardar Borrador]  [Publicar] │
└─────────────────────────────────────────┘
```

### Vista de Tomar Quiz (Estudiante):
```
┌─────────────────────────────────────────┐
│ Quiz: Introducción a Monomios           │
├─────────────────────────────────────────┤
│ ⏱️ 05:23 | Pregunta 2 de 5              │
├─────────────────────────────────────────┤
│ 2. ¿Cuál es el coeficiente de 3x²y³?   │
│                                         │
│ ○ 3                                    │
│ ○ 2                                    │
│ ○ 3x²                                  │
│ ○ 3x²y³                                │
│                                         │
├─────────────────────────────────────────┤
│ [← Anterior]  [Siguiente →]            │
│                                         │
│ [💾 Guardar Respuestas]  [Enviar Quiz] │
└─────────────────────────────────────────┘
```

### Vista de Resultados (Estudiante):
```
┌─────────────────────────────────────────┐
│ Resultados del Quiz                      │
├─────────────────────────────────────────┤
│ 🎉 ¡Felicidades! Aprobaste              │
│                                         │
│ Puntuación: 85/100 (85%)                │
│ Puntuación de aprobación: 70%          │
│                                         │
├─────────────────────────────────────────┤
│ Desglose de Respuestas:                 │
│                                         │
│ ✅ 1. Correcta (10/10)                  │
│ ✅ 2. Correcta (10/10)                  │
│ ❌ 3. Incorrecta (5/10)                 │
│ ✅ 4. Correcta (10/10)                  │
│ ✅ 5. Correcta (10/10)                  │
│                                         │
│ [Ver Detalles]  [Volver al Curso]      │
└─────────────────────────────────────────┘
```

---

## 🔧 Ejemplo de Uso

### Crear un Quiz (Docente):

```typescript
// 1. Crear assessment
const assessment = await quizService.createAssessment({
  course_id: 1,
  unit_id: 'unit-uuid',
  title: 'Quiz de Repaso: Monomios',
  description: 'Evalúa tu comprensión de los conceptos básicos',
  assessment_type: 'quiz',
  instructions: 'Lee cada pregunta cuidadosamente. Tienes 30 minutos.',
  time_limit: 30,
  max_attempts: 3,
  passing_score: 70,
  total_points: 100,
  is_published: true,
  created_by: user.id
});

// 2. Agregar preguntas
await quizService.createQuestion({
  assessment_id: assessment.id,
  question_text: '¿Cuál es el coeficiente de 3x²y³?',
  question_type: 'multiple_choice',
  order_index: 1,
  options: [
    { id: '1', text: '3', correct: true },
    { id: '2', text: '2', correct: false },
    { id: '3', text: '3x²', correct: false },
    { id: '4', text: '3x²y³', correct: false }
  ],
  points: 20,
  explanation: 'El coeficiente es el número que multiplica las variables.'
});
```

### Tomar un Quiz (Estudiante):

```typescript
// 1. Ver quizzes disponibles
const quizzes = await quizService.getCourseAssessments(courseId, ['quiz']);

// 2. Obtener quiz con preguntas
const { assessment, questions } = await quizService.getAssessmentWithQuestions(quizId);

// 3. Iniciar intento
const existingAttempts = await quizService.getExistingAttempts(studentId, quizId);
const attemptNumber = existingAttempts.length + 1;
const attempt = await quizService.startAttempt(studentId, quizId, attemptNumber);

// 4. Enviar respuestas
for (const question of questions) {
  await quizService.submitResponse({
    attempt_id: attempt.id,
    question_id: question.id,
    student_id: studentId,
    response_data: { answer: '3' }, // La respuesta del estudiante
    is_correct: false, // Se puede calcular o dejar que lo haga el trigger
    points_earned: 0
  });
}

// 5. Enviar intento
const result = await quizService.submitAttempt(attempt.id, 25);
```

---

## 📊 Métricas de Evaluación

### Por Assessment:
- Total de intentos
- Promedio de calificaciones
- Tasa de aprobación
- Tiempo promedio
- Preguntas más falladas
- Estudiantes que no completaron

### Por Estudiante:
- Última calificación
- Mejor calificación
- Intentos utilizados
- Tasa de mejora
- Tiempo invertido

---

## 🎯 Próximos Pasos

### Inmediato:
1. Ejecutar `88_create_quizzes_assessments.sql` en Supabase
2. Verificar que las tablas se crearon correctamente
3. Probar las políticas RLS

### Corto Plazo:
1. Crear `pages/QuizBuilderPage.tsx`
2. Crear `components/QuestionBuilder.tsx`
3. Integrar en `UnitEditorPage.tsx`

### Mediano Plazo:
1. Crear `pages/TakeQuizPage.tsx`
2. Implementar timer
3. Crear página de resultados

### Largo Plazo:
1. Dashboard de analytics
2. Preguntas aleatorias
3. Bancos de preguntas
4. Autocompletado con IA

---

## 🔗 Integración con Sistema Existente

### Flujo Pedagógico Actualizado:
```
Curso
 └─ Unidad
    ├─ Contenido (HTML/Markdown)
    ├─ Objetivos de Aprendizaje
    ├─ Materiales (PDFs, Videos)
    ├─ Sesiones
    │  ├─ Contenido de sesión
    │  ├─ Actividades
    │  └─ Quiz de comprensión ⭐ NUEVO
    └─ Evaluación Final ⭐ NUEVO
```

### Evaluación Completa:
1. **Participación:** Unidades marcadas como "Entendido"
2. **Comprensión:** Quizzes de práctica
3. **Evaluación Formativa:** Tareas/proyectos
4. **Evaluación Sumativa:** Examen final

---

## ✅ Checklist de Implementación

### Base de Datos:
- [x] Script SQL creado
- [ ] Ejecutado en Supabase
- [ ] Verificado creación de tablas
- [ ] Verificado políticas RLS

### Servicios:
- [x] `quizService.ts` creado
- [ ] Probar crear assessment
- [ ] Probar crear pregunta
- [ ] Probar iniciar intento
- [ ] Probar enviar respuestas

### Frontend - Admin:
- [ ] Página de lista de quizzes
- [ ] Página de crear/editar quiz
- [ ] Editor de preguntas
- [ ] Vista de resultados

### Frontend - Estudiante:
- [ ] Página de tomar quiz
- [ ] Componente de timer
- [ ] Renderizado de preguntas
- [ ] Página de resultados

### Integración:
- [ ] Agregar quizzes a CourseViewPage
- [ ] Agregar a UnitEditorPage
- [ ] Mostrar en dashboard
- [ ] Notificaciones de quizzes pendientes

---

## 📝 Notas Importantes

1. **Calificación Automática:** Solo para opción múltiple y V/F
2. **Calificación Manual:** Para respuestas cortas y ensayos
3. **Retroalimentación:** Configurable por pregunta
4. **Intentos:** Controlados por el sistema
5. **Timer:** Frontend + verificación backend (security)
6. **Privacidad:** Estudiantes solo ven sus propias respuestas antes de calificar

