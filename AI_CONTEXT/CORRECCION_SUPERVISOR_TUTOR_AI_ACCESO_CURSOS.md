# Corrección: Acceso de Supervisor al Tutor AI y Cursos

**Fecha:** Enero 2025  
**Estado:** ✅ Completado  
**Prioridad:** Alta

## Resumen Ejecutivo

Se implementaron correcciones y mejoras para permitir que los supervisores accedan al Tutor AI y vean todos los cursos activos de su institución, sin necesidad de estar inscritos como estudiantes. También se corrigieron problemas relacionados con el filtrado por institución y la asignación automática de `institution_id` a los cursos.

## Problemas Identificados y Resueltos

### 1. Error en Función `is_admin_campus()` - Nombre de Rol Incorrecto

**Problema:**
- La función `is_admin_campus()` buscaba el rol `'admin_campus'` (con guión bajo) pero el rol en la base de datos se llama `'admin-campus'` (con guión).
- Esto causaba que la función devolviera `false` incluso para usuarios con rol `admin-campus`, impidiendo que las políticas RLS funcionaran correctamente.

**Solución:**
- Script SQL creado: `sql_scripts/fix_is_admin_campus_role_name.sql`
- Corrige la función para buscar `'admin-campus'` en lugar de `'admin_campus'`.
- La función ahora reconoce correctamente a los usuarios con rol `admin-campus`.

**Archivos Modificados:**
- `sql_scripts/fix_is_admin_campus_role_name.sql` (nuevo)

**Verificación:**
- Script de diagnóstico: `sql_scripts/verify_role_name_mismatch.sql`
- Verifica el nombre exacto del rol en la BD y la definición de la función.

---

### 2. Supervisor No Podía Ver Cursos en Tutor AI

**Problema:**
- El supervisor no podía ver cursos en el selector del Tutor AI (`/teacher/tutor`).
- El componente `CourseSelector` no filtraba cursos por institución para supervisores.
- No había políticas RLS que permitieran a supervisores ver cursos de su institución.

**Solución:**

#### 2.1. Modificación del Componente CourseSelector

**Archivo:** `audio-tutor/components/CourseSelector.tsx`

**Cambios:**
- Importado `useAuth` y `useUserInstitution` para obtener el usuario y su institución.
- Agregada lógica para filtrar cursos por `institution_id` si el usuario es `supervisor`, `admin-campus`, `coordinator` o `teacher`.
- Si el usuario es `admin`, muestra todos los cursos sin filtrar.
- Agregado logging detallado para diagnóstico.
- Mensaje específico cuando no hay cursos para la institución.

**Código Clave:**
```typescript
const shouldFilterByInstitution = user?.role?.name && 
  ['supervisor', 'admin-campus', 'coordinator', 'teacher'].includes(user.role.name);
const isAdmin = user?.role?.name === 'admin';

// Filtrar por institución si es necesario
if (shouldFilterByInstitution && institution?.id && !isAdmin) {
  query = query.eq('institution_id', institution.id);
}
```

#### 2.2. Políticas RLS para Acceso a Cursos

**Script SQL:** `sql_scripts/add_supervisor_courses_access.sql`

**Políticas Creadas:**

1. **Cursos (`courses`):**
   - `supervisor_view_institution_courses`: Permite a supervisores ver cursos activos de su institución.
   - `admin_campus_coordinator_view_institution_courses`: Permite a admin-campus y coordinadores ver cursos activos de su institución.

2. **Unidades (`course_units`):**
   - `supervisor_view_institution_course_units`: Permite a supervisores ver unidades de cursos de su institución.
   - `admin_campus_coordinator_view_institution_course_units`: Permite a admin-campus y coordinadores ver unidades de cursos de su institución.

3. **Sesiones (`sessions`):**
   - `supervisor_view_institution_sessions`: Permite a supervisores ver sesiones de cursos de su institución.
   - `admin_campus_coordinator_view_institution_sessions`: Permite a admin-campus y coordinadores ver sesiones de cursos de su institución.

4. **Materiales (`materials`):**
   - `supervisor_view_institution_materials`: Permite a supervisores ver materiales de cursos de su institución.
   - `admin_campus_coordinator_view_institution_materials`: Permite a admin-campus y coordinadores ver materiales de cursos de su institución.

**Características de las Políticas:**
- Todas usan `SECURITY DEFINER` functions (`is_supervisor()`, `is_admin_campus()`, `is_coordinator()`, `get_user_primary_institution_id()`).
- Filtran por `institution_id` y `status = 'active'`.
- Solo permiten `SELECT` (lectura), no modificación.

---

### 3. Asignación Automática de `institution_id` a Cursos

**Problema:**
- Al crear o editar un curso en `/teacher/courses/:id/edit`, no se asignaba automáticamente el `institution_id`.
- Los cursos quedaban sin institución asignada, impidiendo que supervisores los vieran.

**Solución:**

#### 3.1. Actualización de la Interfaz Course

**Archivo:** `src/services/teacherCourses.ts`

**Cambios:**
- Agregado `institution_id?: number` a la interfaz `Course`.

#### 3.2. Lógica de Asignación Automática

**Archivo:** `src/pages/CreateCoursePage.tsx`

**Cambios:**
- Agregada lógica en `handleSubmit` para obtener `institution_id` automáticamente:
  1. Si hay `subject_id` seleccionado: obtiene `institution_id` de la materia.
  2. Si no hay materia pero hay `career_id`: obtiene `institution_id` de la carrera.
  3. Asigna el `institution_id` al curso al guardarlo.

**Código Clave:**
```typescript
// Obtener institution_id de la materia o carrera seleccionada
let institutionId: number | undefined = undefined;

if (formData.subject_id) {
  const subject = await subjectService.getSubject(parseInt(formData.subject_id));
  if (subject?.institution_id) {
    institutionId = subject.institution_id;
  }
}

if (!institutionId && formData.career_id) {
  const career = await careerService.getCareer(parseInt(formData.career_id));
  if (career?.institution_id) {
    institutionId = career.institution_id;
  }
}

const courseData = {
  // ... otros campos
  institution_id: institutionId
};
```

---

### 4. Corrección de Iconos en Panel de Contenido del Curso

**Problema:**
- Los iconos en el panel "Contenido del Curso" del Tutor AI no eran los adecuados.
- Las sesiones usaban `IconVideo` (icono genérico de video) en lugar de un icono más apropiado.

**Solución:**

**Archivo:** `audio-tutor/components/CourseContentPanel.tsx`

**Cambios:**
- **Sesiones:** Cambiado de `IconVideo` a `IconCalendar` (más apropiado para sesiones/clases programadas).
- **Materiales de video:** Cambiado de `IconVideo` a `IconVideoCamera` (más específico).
- **Materiales por defecto:** Cambiado de `IconBookOpen` a `IconFileText` (más apropiado para documentos).

**Iconos Actualizados:**
- Título de sección "Sesiones del Curso": `IconCalendar`
- Cada sesión individual: `IconCalendar`
- Materiales agrupados por sesión: `IconCalendar`
- Materiales de tipo 'video': `IconVideoCamera`
- Materiales por defecto: `IconFileText`

---

## Scripts SQL Creados

### 1. `sql_scripts/fix_is_admin_campus_role_name.sql`
- Corrige la función `is_admin_campus()` para buscar el rol correcto (`'admin-campus'`).
- Incluye verificación de funciones helper y pruebas de funcionamiento.

### 2. `sql_scripts/add_supervisor_courses_access.sql`
- Crea políticas RLS para permitir a supervisores, admin-campus y coordinadores ver cursos de su institución.
- Incluye políticas para `courses`, `course_units`, `sessions` y `materials`.
- Incluye verificación de políticas creadas.

### 3. `sql_scripts/check_courses_for_supervisor.sql`
- Script de diagnóstico para verificar cursos disponibles para supervisores.
- Verifica institución del supervisor, todos los cursos, cursos por institución, y cursos activos.

### 4. `sql_scripts/diagnose_supervisor_courses.sql`
- Script de diagnóstico más completo (actualmente vacío, puede ser completado si es necesario).

---

## Archivos Modificados

### Frontend

1. **`audio-tutor/components/CourseSelector.tsx`**
   - Agregado filtrado por institución.
   - Agregado logging detallado.
   - Mejorados mensajes de error.

2. **`audio-tutor/components/CourseContentPanel.tsx`**
   - Corregidos iconos para sesiones y materiales.
   - Cambiado `IconVideo` a `IconCalendar` para sesiones.
   - Cambiado `IconVideo` a `IconVideoCamera` para materiales de video.

3. **`src/pages/CreateCoursePage.tsx`**
   - Agregada lógica para asignar automáticamente `institution_id` desde carrera/materia.
   - Mejorado manejo de errores.

4. **`src/services/teacherCourses.ts`**
   - Agregado `institution_id?: number` a la interfaz `Course`.

### Backend (SQL)

1. **`sql_scripts/fix_is_admin_campus_role_name.sql`** (nuevo)
2. **`sql_scripts/add_supervisor_courses_access.sql`** (nuevo)
3. **`sql_scripts/check_courses_for_supervisor.sql`** (nuevo)

---

## Flujo de Trabajo Actualizado

### Creación/Edición de Curso

1. Usuario accede a `/teacher/courses/:id/edit`.
2. Selecciona una carrera (opcional).
3. Selecciona una materia (opcional, requiere carrera).
4. Al guardar:
   - Si hay materia seleccionada: se obtiene `institution_id` de la materia.
   - Si no hay materia pero hay carrera: se obtiene `institution_id` de la carrera.
   - El `institution_id` se asigna automáticamente al curso.

### Acceso de Supervisor al Tutor AI

1. Supervisor accede a `/teacher/tutor`.
2. El sistema carga su institución asignada.
3. El `CourseSelector` filtra cursos por `institution_id` y `status = 'active'`.
4. Las políticas RLS permiten ver solo cursos de su institución.
5. El supervisor puede seleccionar cualquier curso de su institución.
6. Puede acceder al Tutor AI sin estar inscrito como estudiante.

---

## Verificación y Testing

### Verificar Acceso de Supervisor

1. **Verificar institución asignada:**
   ```sql
   SELECT u.email, ui.institution_id, i.name
   FROM users u
   JOIN user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
   JOIN institutions i ON i.id = ui.institution_id
   WHERE u.email = 'supervisor@example.com';
   ```

2. **Verificar cursos disponibles:**
   ```sql
   SELECT id, title, institution_id, status
   FROM courses
   WHERE institution_id = 2 AND status = 'active';
   ```

3. **Verificar políticas RLS:**
   ```sql
   SELECT policyname, cmd, qual
   FROM pg_policies
   WHERE tablename = 'courses'
     AND policyname LIKE '%supervisor%';
   ```

### Verificar Asignación de institution_id

1. Crear/editar un curso seleccionando una carrera o materia.
2. Verificar que el curso tenga `institution_id` asignado:
   ```sql
   SELECT id, title, institution_id, subject_id
   FROM courses
   WHERE id = <course_id>;
   ```

---

## Próximos Pasos Recomendados

1. **Verificar cursos existentes sin `institution_id`:**
   - Crear script para asignar `institution_id` a cursos existentes basándose en su `subject_id` o `career_id`.

2. **Mejorar manejo de errores:**
   - Agregar validación para asegurar que carrera/materia tengan `institution_id` antes de asignar al curso.

3. **Documentación de usuario:**
   - Crear guía para supervisores sobre cómo usar el Tutor AI.
   - Documentar el proceso de creación de cursos con asignación de institución.

---

## Notas Técnicas

### Funciones Helper Usadas

- `is_supervisor()`: Verifica si el usuario es supervisor.
- `is_admin_campus()`: Verifica si el usuario es admin-campus (corregida para buscar `'admin-campus'`).
- `is_coordinator()`: Verifica si el usuario es coordinador.
- `get_user_primary_institution_id()`: Obtiene el ID de la institución primaria del usuario.

Todas estas funciones tienen `SECURITY DEFINER` para evitar recursión en políticas RLS.

### Consideraciones de Seguridad

- Las políticas RLS solo permiten `SELECT` (lectura), no modificación.
- Los supervisores solo pueden ver cursos activos de su institución.
- Los cursos deben tener `institution_id` asignado para ser visibles por supervisores.

---

## Referencias

- Script de corrección de nombre de rol: `sql_scripts/fix_is_admin_campus_role_name.sql`
- Script de políticas RLS: `sql_scripts/add_supervisor_courses_access.sql`
- Script de diagnóstico: `sql_scripts/check_courses_for_supervisor.sql`
- Componente selector de cursos: `audio-tutor/components/CourseSelector.tsx`
- Componente panel de contenido: `audio-tutor/components/CourseContentPanel.tsx`
- Página de creación/edición de cursos: `src/pages/CreateCoursePage.tsx`

---

**Última actualización:** Enero 2025  
**Autor:** Sistema de Asistencia AI  
**Revisado por:** Pendiente

