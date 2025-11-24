# 📊 Quizzes y Trivias - Matemática para Empresas I

**Fecha:** Diciembre 2024  
**Script:** `sql_scripts/89_crear_quizzes_trivias_matematica_empresas.sql`

---

## 📋 Resumen

Este script crea **1 Trivia general** y **4 Quizzes** (uno por unidad) para el curso "Matemática para Empresas I", con preguntas basadas en el contenido real del curso.

---

## 🎯 Contenido Creado

### 1. **Trivia General del Curso**
- **Tipo:** Trivia
- **Tiempo límite:** 15 minutos
- **Intentos:** Ilimitados
- **Puntuación de aprobación:** 50%
- **Estado:** Publicado
- **Preguntas:** 5 preguntas
  - 2 Verdadero/Falso
  - 3 Opción Múltiple
- **Temas:** Conceptos generales del curso, álgebra básica, estructura del curso

### 2. **Quiz Unidad 1: Expresiones Algebraicas**
- **Tipo:** Quiz
- **Tiempo límite:** 30 minutos
- **Intentos:** 3 máximo
- **Puntuación de aprobación:** 70%
- **Estado:** Publicado
- **Preguntas:** 6 preguntas
  - 4 Opción Múltiple
  - 1 Verdadero/Falso
  - 1 Respuesta Corta
- **Temas:** Variables, constantes, coeficientes, términos semejantes, operaciones básicas, factorización

### 3. **Quiz Unidad 2: Ecuaciones Lineales y Sistemas**
- **Tipo:** Quiz
- **Tiempo límite:** 35 minutos
- **Intentos:** 3 máximo
- **Puntuación de aprobación:** 70%
- **Estado:** Publicado
- **Preguntas:** 5 preguntas
  - 3 Opción Múltiple
  - 1 Verdadero/Falso
  - 1 Respuesta Corta
- **Temas:** Resolución de ecuaciones lineales, sistemas de ecuaciones, métodos analíticos y gráficos

### 4. **Quiz Unidad 3: Progresiones Aritméticas y Geométricas**
- **Tipo:** Quiz
- **Tiempo límite:** 30 minutos
- **Intentos:** 3 máximo
- **Puntuación de aprobación:** 70%
- **Estado:** Publicado
- **Preguntas:** 5 preguntas
  - 3 Opción Múltiple
  - 1 Verdadero/Falso
  - 1 Respuesta Corta
- **Temas:** Definición de progresiones, fórmulas, aplicación empresarial, modelización matemática

### 5. **Quiz Unidad 4: Teoría de Conjuntos**
- **Tipo:** Quiz
- **Tiempo límite:** 30 minutos
- **Intentos:** 3 máximo
- **Puntuación de aprobación:** 70%
- **Estado:** Publicado
- **Preguntas:** 5 preguntas
  - 3 Opción Múltiple
  - 1 Verdadero/Falso
  - 1 Respuesta Corta
- **Temas:** Clasificación de conjuntos, operaciones (unión, intersección, diferencia), aplicaciones empresariales

---

## 🚀 Cómo Ejecutar el Script

### Opción 1: Desde Supabase Dashboard
1. Ve a tu proyecto en Supabase
2. Abre el **SQL Editor**
3. Copia y pega el contenido de `sql_scripts/89_crear_quizzes_trivias_matematica_empresas.sql`
4. Haz clic en **Run** o **Ejecutar**
5. Verifica los mensajes de éxito en la consola

### Opción 2: Desde línea de comandos (psql)
```bash
psql -h tu-host -U tu-usuario -d tu-database -f sql_scripts/89_crear_quizzes_trivias_matematica_empresas.sql
```

---

## ✅ Verificación

Después de ejecutar el script, puedes verificar que se crearon correctamente:

```sql
-- Ver todos los assessments creados
SELECT 
    a.id,
    a.title,
    a.assessment_type,
    a.is_published,
    cu.number as unidad_numero,
    cu.title as unidad_titulo,
    (SELECT COUNT(*) FROM questions WHERE assessment_id = a.id) as total_preguntas
FROM assessments a
LEFT JOIN course_units cu ON a.unit_id = cu.id
WHERE a.course_id = 1  -- Ajusta el course_id según tu caso
ORDER BY 
    CASE WHEN cu.number IS NULL THEN 0 ELSE cu.number END,
    a.created_at;
```

---

## 📝 Detalles de las Preguntas

### Trivia General
1. **V/F:** El álgebra es una rama de las matemáticas que utiliza símbolos y letras
2. **Múltiple:** ¿Qué representa una variable en el contexto empresarial?
3. **Múltiple:** En la expresión I = px, ¿qué representa I?
4. **V/F:** Los términos semejantes tienen las mismas variables con los mismos exponentes
5. **Múltiple:** ¿Cuántas unidades tiene el curso?

### Quiz Unidad 1
1. **Múltiple:** ¿Qué es una constante en el contexto empresarial?
2. **Múltiple:** En la expresión 3x + 5x, ¿cuál es el resultado?
3. **V/F:** En la expresión 2x² - 4x², el resultado es -2x²
4. **Múltiple:** Si una empresa tiene costos de materiales 3x y mano de obra 2x + 100, ¿cuál es el costo total?
5. **Múltiple:** Al aplicar la propiedad distributiva en 3x(2x + 5), obtenemos...
6. **Corta:** ¿Qué es un término semejante?

### Quiz Unidad 2
1. **Múltiple:** ¿Cuál es la solución de la ecuación 2x + 5 = 13?
2. **Múltiple:** Un sistema de ecuaciones lineales con dos incógnitas puede tener...
3. **V/F:** Una ecuación lineal tiene la forma ax + b = 0
4. **Corta:** Resuelve la ecuación: 3x - 7 = 14. ¿Cuál es el valor de x?
5. **Múltiple:** Si en un sistema las dos ecuaciones son paralelas, ¿cuántas soluciones tiene?

### Quiz Unidad 3
1. **Múltiple:** En una progresión aritmética, la diferencia entre términos consecutivos es...
2. **Múltiple:** En una progresión geométrica, cada término se obtiene...
3. **V/F:** Las progresiones geométricas son útiles para modelar crecimiento exponencial
4. **Corta:** Si una progresión aritmética tiene primer término a₁ = 5 y diferencia d = 3, ¿cuál es el tercer término?
5. **Múltiple:** ¿Qué tipo de progresión sería más apropiada para modelar el crecimiento de una inversión con interés compuesto?

### Quiz Unidad 4
1. **Múltiple:** La operación de intersección de dos conjuntos A y B incluye...
2. **Múltiple:** La unión de dos conjuntos A y B incluye...
3. **V/F:** Un conjunto vacío es un conjunto que no tiene elementos
4. **Múltiple:** Si A = {1, 2, 3} y B = {3, 4, 5}, entonces A ∩ B es...
5. **Corta:** Si A = {1, 2, 3} y B = {3, 4, 5}, ¿cuál es A ∪ B?

---

## 🎓 Acceso para Estudiantes

Una vez ejecutado el script, los estudiantes podrán:

1. **Acceder a la Trivia:**
   - Desde `/courses/1` (vista del curso)
   - En la sección "Evaluaciones" (general, no asociada a unidad específica)

2. **Acceder a los Quizzes:**
   - Desde `/courses/1` (vista del curso)
   - Expandir cada unidad
   - Ver los quizzes en la sección "Evaluaciones" de cada unidad

3. **Tomar las Evaluaciones:**
   - Hacer clic en el quiz/trivia deseado
   - Ser redirigido a `/quiz/:quizId`
   - Completar las preguntas y enviar

---

## 📊 Estadísticas Esperadas

- **Total de Assessments:** 5 (1 trivia + 4 quizzes)
- **Total de Preguntas:** 26 preguntas
  - Trivia: 5 preguntas
  - Quiz 1: 6 preguntas
  - Quiz 2: 5 preguntas
  - Quiz 3: 5 preguntas
  - Quiz 4: 5 preguntas

---

## 🔧 Personalización

Si necesitas ajustar las preguntas o agregar más:

1. **Agregar más preguntas:** Agrega más `INSERT INTO questions` después de cada quiz
2. **Modificar preguntas:** Edita los `INSERT INTO questions` existentes
3. **Cambiar configuración:** Modifica los valores en `INSERT INTO assessments` (tiempo, intentos, puntuación)

---

## ✅ Checklist de Ejecución

- [ ] Script SQL creado (`89_crear_quizzes_trivias_matematica_empresas.sql`)
- [ ] Ejecutar script en Supabase
- [ ] Verificar que se crearon los 5 assessments
- [ ] Verificar que cada assessment tiene sus preguntas
- [ ] Probar acceso desde la interfaz de estudiante
- [ ] Probar que los quizzes se pueden tomar correctamente

---

**¡Listo para usar!** 🚀

Los estudiantes ya pueden acceder a las trivias y quizzes desde la vista del curso.

