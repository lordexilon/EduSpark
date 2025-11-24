# 📚 Guía de Acceso a Quizzes y Trivias

**Fecha:** Diciembre 2024

---

## 🎓 Para Docentes: Crear Quizzes/Trivias

### Método 1: Desde el Editor de Unidad (Recomendado)

1. **Navegar a la unidad:**
   - Ve a `/teacher/courses`
   - Selecciona un curso
   - Haz clic en "Módulos" o "Unidades"
   - Selecciona una unidad para editarla

2. **Crear nuevo quiz:**
   - En la parte superior verás un banner azul "Evaluaciones"
   - Haz clic en el botón **"Nuevo Quiz"**
   - Esto te llevará a `/teacher/quizzes/new?courseId=X&unitId=Y`

3. **Configurar el quiz:**
   - Completa el título y descripción
   - Selecciona el tipo: **Quiz**, **Trivia** o **Exam**
   - Configura límite de tiempo (opcional)
   - Establece intentos máximos
   - Define la puntuación de aprobación
   - Escribe instrucciones para estudiantes

4. **Guardar y publicar:**
   - **"Guardar Borrador"** - Para guardar sin publicar
   - **"Publicar Quiz"** - Para hacerlo visible a estudiantes

5. **Agregar preguntas:**
   - Después de guardar, aparecerá el botón "Agregar Pregunta"
   - Selecciona el tipo de pregunta:
     - **Opción Múltiple** - Agrega opciones y marca la correcta
     - **Verdadero/Falso** - Selecciona la respuesta correcta
     - **Respuesta Corta** - Define la respuesta esperada
     - **Ensayo** - Para respuestas largas (calificación manual)

6. **Ver Analytics:**
   - Desde el editor de quiz, haz clic en **"Ver Analytics"**
   - O navega directamente a `/teacher/quizzes/:quizId/analytics`

### Método 2: Desde la URL Directa

```
/teacher/quizzes/new?courseId=1&unitId=UUID-de-unidad
```

Reemplaza `courseId` y `unitId` con los valores correctos.

---

## 👨‍🎓 Para Estudiantes: Acceder a Quizzes/Trivias

### Método 1: Desde la Vista del Curso (Recomendado)

1. **Navegar al curso:**
   - Ve a `/my/courses` o `/courses/:id`
   - Selecciona el curso

2. **Ver quizzes disponibles:**
   - En cada unidad expandida, verás una sección **"Evaluaciones"**
   - Los quizzes publicados aparecerán listados

3. **Tomar un quiz:**
   - Haz clic en el quiz que quieres tomar
   - Esto te llevará a `/quiz/:quizId`
   - Lee las instrucciones
   - Responde las preguntas
   - Envía el quiz al finalizar

### Método 2: Desde la URL Directa

```
/quiz/UUID-del-quiz
```

---

## 🔗 Rutas Disponibles

### Docentes:
- `/teacher/quizzes/new` - Crear nuevo quiz
- `/teacher/quizzes/edit/:quizId` - Editar quiz existente
- `/teacher/quizzes/:quizId/analytics` - Ver estadísticas

### Estudiantes:
- `/quiz/:quizId` - Tomar un quiz
- `/quiz/:quizId/results/:attemptId` - Ver resultados (pendiente)

---

## 📋 Tipos de Evaluaciones

### Quiz
- Evaluación rápida
- Ideal para verificar comprensión
- Generalmente 10-20 preguntas
- Tiempo limitado opcional

### Trivia
- Evaluación lúdica
- Menos formal que un quiz
- Puede ser más corta
- Enfoque en diversión y aprendizaje

### Exam (Examen)
- Evaluación formal
- Generalmente más largo
- Tiempo limitado recomendado
- Mayor peso en calificación

---

## ⚙️ Configuración Recomendada

### Para Quizzes de Práctica:
- Tiempo límite: 15-30 minutos
- Intentos máximos: 3-5
- Puntuación de aprobación: 60-70%
- Publicar inmediatamente

### Para Trivias:
- Tiempo límite: 10-15 minutos
- Intentos máximos: Ilimitados (null)
- Puntuación de aprobación: 50%
- Publicar inmediatamente

### Para Exámenes:
- Tiempo límite: 60-90 minutos
- Intentos máximos: 1
- Puntuación de aprobación: 70-80%
- Publicar con fecha de disponibilidad

---

## 🎯 Próximos Pasos

1. **Integrar en CourseViewPage** - Mostrar quizzes disponibles
2. **Página de Resultados** - Para estudiantes ver su desempeño
3. **Dashboard de Quizzes** - Lista de todos los quizzes del docente
4. **Notificaciones** - Alertar sobre nuevos quizzes disponibles

---

## 💡 Tips

- **Crea quizzes después de cada unidad** para reforzar el aprendizaje
- **Usa trivias** para hacer el aprendizaje más divertido
- **Revisa analytics** regularmente para identificar áreas problemáticas
- **Agrega explicaciones** a las preguntas para ayudar a los estudiantes
- **Configura fechas** de disponibilidad para controlar cuándo se pueden tomar

---

**¡Listo para crear y tomar quizzes!** 🚀

