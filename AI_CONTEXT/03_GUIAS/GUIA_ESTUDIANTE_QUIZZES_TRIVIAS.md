# 🎓 Guía para Estudiantes: Cómo Ver y Tomar Quizzes/Trivias

**Fecha:** Diciembre 2024

---

## 📍 Dónde Ver las Trivias y Quizzes

### 1. **Desde la Vista del Curso** (`/courses/:id`)

Los estudiantes pueden ver las trivias y quizzes en dos lugares:

#### **A. Evaluaciones Generales del Curso**
- Se muestran **al inicio de la página del curso**, antes de las unidades
- Estas son trivias/quizzes que **no están asociadas a una unidad específica**
- Ejemplo: "Trivia General: Matemática para Empresas I"

#### **B. Evaluaciones por Unidad**
- Se muestran **dentro de cada unidad expandida**
- Estas son trivias/quizzes asociadas a una unidad específica
- Para verlas:
  1. Ve a tu curso
  2. Haz clic en una unidad para expandirla
  3. Busca la sección **"Evaluaciones"**

---

## 🎯 Visualización de Trivias

### Información Visible

Cuando un estudiante ve una trivia, puede ver:

1. **Título de la trivia** - Ej: "Trivia General: Matemática para Empresas I"
2. **Badge de tipo** - Muestra "Trivia" con color morado
3. **Descripción** - Breve explicación de la trivia
4. **Información de configuración:**
   - ⏱️ **Tiempo límite** (si aplica) - Ej: "15 minutos"
   - 🔄 **Intentos** - Puede ser "X intentos" o "Intentos ilimitados"
   - ✅ **Puntuación de aprobación** - Ej: "Aprobar: 50%"

### Ejemplo Visual

```
┌─────────────────────────────────────────────────────┐
│ 📋 Trivia General: Matemática para Empresas I  [Trivia] │
│                                                       │
│ Una trivia divertida para repasar conceptos...       │
│                                                       │
│ ⏱️ 15 min  •  🔄 Intentos ilimitados  • ✅ Aprobar: 50% │
│                                                       │
│                                              →       │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Cómo Tomar una Trivia

### Paso 1: Acceder a la Trivia
1. Ve a `/my/courses` o `/courses/:id`
2. Si es una **trivia general**, la verás en la sección "Evaluaciones Generales" al inicio
3. Si es una **trivia de unidad**, expande la unidad y busca la sección "Evaluaciones"
4. Haz clic en la trivia que quieres tomar

### Paso 2: Página de Inicio del Quiz
- Serás redirigido a `/quiz/:quizId`
- Verás:
  - Título de la trivia
  - Descripción
  - Instrucciones
  - Información de tiempo e intentos
  - Botón para **"Comenzar Quiz"**

### Paso 3: Responder Preguntas
- **Preguntas de Opción Múltiple**: Selecciona una opción (A, B, C, D)
- **Verdadero/Falso**: Selecciona Verdadero o Falso
- **Respuesta Corta**: Escribe tu respuesta en el campo de texto

### Paso 4: Enviar la Trivia
- Revisa tus respuestas
- Haz clic en **"Enviar Quiz"**
- Verás tus resultados inmediatamente (si es automático)
- O recibirás un mensaje de confirmación

---

## 📊 Diferencia entre Trivia y Quiz

### **Trivia** 🎮
- **Propósito:** Aprendizaje lúdico y repaso
- **Configuración típica:**
  - Tiempo: 10-15 minutos
  - Intentos: **Ilimitados** (sin límite)
  - Aprobación: 50% (más flexible)
- **Badge:** Morado (purple)
- **Enfoque:** Divertido y relajado

### **Quiz** 📝
- **Propósito:** Evaluación formal
- **Configuración típica:**
  - Tiempo: 30-60 minutos
  - Intentos: 1-3 intentos máximo
  - Aprobación: 70% (más estricto)
- **Badge:** Azul (blue)
- **Enfoque:** Formal y evaluativo

---

## 🎨 Visualización en la Interfaz

### Colores de Badges

| Tipo | Color | Badge |
|------|-------|-------|
| Quiz | Azul | `bg-blue-100 text-blue-700` |
| Trivia | Morado | `bg-purple-100 text-purple-700` |
| Examen | Rojo | `bg-red-100 text-red-700` |
| Proyecto | Verde | `bg-green-100 text-green-700` |
| Tarea | Amarillo | `bg-yellow-100 text-yellow-700` |

### Iconos

- 📋 `IconClipboardCheck` - Icono principal de evaluaciones
- ⏱️ `IconClock` - Tiempo límite
- → `IconChevronRight` - Indicador de navegación

---

## 📱 Flujo Completo

```
1. Estudiante entra a /courses/1
   ↓
2. Ve la sección "Evaluaciones Generales" (trivias sin unidad)
   ↓
3. O expande una unidad y ve "Evaluaciones" (trivias de unidad)
   ↓
4. Haz clic en una trivia
   ↓
5. Redirige a /quiz/:quizId
   ↓
6. Ve la información de la trivia
   ↓
7. Hace clic en "Comenzar Quiz"
   ↓
8. Responde las preguntas
   ↓
9. Envía la trivia
   ↓
10. Ve resultados inmediatamente
```

---

## 🔍 Verificación de Visibilidad

### Requisitos para que un Estudiante Vea una Trivia:

1. ✅ **Debe estar inscrito en el curso** (`course_enrollments`)
2. ✅ **La trivia debe estar publicada** (`is_published = true`)
3. ✅ **La trivia debe pertenecer al curso** (`course_id` correcto)
4. ✅ **RLS policies** deben permitir lectura al estudiante

### Si no Ves una Trivia:

1. Verifica que estés inscrito en el curso
2. Verifica que la trivia esté publicada (no en borrador)
3. Verifica que estés en el curso correcto
4. Contacta al docente si crees que deberías verla

---

## 💡 Tips para Estudiantes

1. **Trivias son para practicar** - No te preocupes si no apruebas la primera vez, puedes intentar de nuevo
2. **Lee las instrucciones** - Cada trivia puede tener reglas específicas
3. **Gestiona tu tiempo** - Si hay límite de tiempo, mantén un ritmo constante
4. **Revisa antes de enviar** - Asegúrate de haber respondido todas las preguntas
5. **Usa las trivias para repasar** - Son una excelente herramienta de estudio

---

## 🎯 Ejemplo: Trivia de Matemática para Empresas I

### Ubicación:
- **Tipo:** Trivia General (sin unidad específica)
- **Donde se ve:** Sección "Evaluaciones Generales" al inicio del curso
- **Título:** "Trivia General: Matemática para Empresas I"

### Características:
- ⏱️ 15 minutos
- 🔄 Intentos ilimitados
- ✅ Aprobar: 50%
- 📝 5 preguntas (2 V/F, 3 Opción Múltiple)

### Contenido:
- Conceptos generales del curso
- Álgebra básica
- Estructura del curso
- Términos semejantes
- Variables y constantes

---

**¡Listo para tomar trivias y mejorar tu aprendizaje!** 🚀

