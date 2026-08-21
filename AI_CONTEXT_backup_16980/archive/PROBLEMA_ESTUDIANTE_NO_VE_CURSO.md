# Problema: Estudiante No Ve Contenido del Curso

**Síntoma:** Los estudiantes no ven contenido en `/courses/1` aunque admin puede verlo.

---

## ✅ Lo que ya funciona:
- Admin puede ver `/teacher/courses/1`
- Estudiantes pueden ver `/session/{id}` (sesiones individuales)

## ❌ Lo que no funciona:
- Estudiantes NO pueden ver `/courses/1` (vista general del curso)

---

## 🔍 Análisis del Problema

El problema tiene DOS causas posibles:

### 1. **RLS Policies** (Ya resuelto)
- ✅ Ya ejecutaste `82_add_student_content_rls.sql`
- ✅ Las políticas para leer `course_units`, `sessions`, `materials` están activas

### 2. **Enrollment del Estudiante** (VERIFICAR)
- ❓ **¿El estudiante está inscrito en el curso 1?**
- ❓ **¿El enrollment tiene `status = 'active'`?**

---

## 🔧 Solución

### Paso 1: Verificar Enrollments
Ejecuta el script `83_verificar_enrollments_estudiante.sql` para ver:
- Quién está inscrito en qué cursos
- Si hay estudiantes inscritos en curso 1

### Paso 2: Si NO hay inscripciones
Inscribe al estudiante ejecutando:

```sql
-- Ver tu UUID de usuario actual
SELECT auth.uid() as mi_uuid;

-- Ver emails de estudiantes disponibles
SELECT id, email, first_name, last_name 
FROM users 
WHERE id IN (SELECT id FROM users);

-- Inscribir estudiante en curso 1
INSERT INTO course_enrollments (student_id, course_id, status, enrollment_date)
VALUES 
  ('UUID_DEL_ESTUDIANTE_AQUI', 1, 'active', CURRENT_DATE)
ON CONFLICT (student_id, course_id) DO UPDATE 
SET status = 'active';
```

**⚠️ IMPORTANTE:** Reemplaza `'UUID_DEL_ESTUDIANTE_AQUI'` con el UUID real del estudiante.

---

## 📋 Checklist de Verificación

- [ ] Ejecutar `82_add_student_content_rls.sql` ✅ (Ya hecho)
- [ ] Ejecutar `83_verificar_enrollments_estudiante.sql` (VERIFICAR)
- [ ] Verificar que hay inscripciones activas en curso 1
- [ ] Si no hay inscripciones, crear una
- [ ] Recargar `/courses/1` como estudiante

---

## 🎯 Resultado Esperado

Después de inscribir al estudiante:
- ✅ El estudiante puede ver `/courses/1`
- ✅ El estudiante puede ver las unidades del curso
- ✅ El estudiante puede ver las sesiones del curso
- ✅ El estudiante puede ver los materiales del curso

