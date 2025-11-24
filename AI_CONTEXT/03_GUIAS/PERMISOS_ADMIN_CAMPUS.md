# Permisos y Acceso de Admin-Campus

## 📋 Resumen

El rol **admin-campus** es un administrador de institución que solo puede ver y gestionar datos de **SU** institución. No puede ver datos de otras instituciones.

## ✅ Lo que Admin-Campus PUEDE ver y gestionar

### 1. **Su Institución**
- ✅ Ver información de su institución
- ✅ Actualizar información de su institución (logo, nombre, descripción, etc.)
- ❌ NO puede ver otras instituciones

### 2. **Usuarios de su Institución**
- ✅ Ver todos los usuarios asignados a su institución:
  - Docentes (teachers)
  - Coordinadores (coordinators)
  - Estudiantes (students)
  - Otros admin-campus de su institución
- ✅ Crear nuevos usuarios y asignarlos a su institución
- ✅ Actualizar información de usuarios de su institución
- ✅ Cambiar roles de usuarios de su institución
- ✅ Suspender/reactivar usuarios de su institución
- ✅ Importar usuarios masivamente a su institución
- ❌ NO puede ver usuarios de otras instituciones

### 3. **Carreras de su Institución**
- ✅ Ver todas las carreras de su institución
- ✅ Crear nuevas carreras en su institución
- ✅ Actualizar carreras de su institución
- ✅ Eliminar carreras de su institución
- ❌ NO puede ver carreras de otras instituciones

### 4. **Materias de su Institución**
- ✅ Ver todas las materias de su institución
- ✅ Crear nuevas materias en su institución
- ✅ Actualizar materias de su institución
- ✅ Eliminar materias de su institución
- ❌ NO puede ver materias de otras instituciones

### 5. **Cursos de su Institución**
- ✅ Ver todos los cursos de su institución
- ✅ Crear nuevos cursos en su institución
- ✅ Actualizar cursos de su institución
- ✅ Eliminar cursos de su institución
- ❌ NO puede ver cursos de otras instituciones

### 6. **Sesiones de su Institución**
- ✅ Ver todas las sesiones de cursos de su institución
- ✅ Crear nuevas sesiones en cursos de su institución
- ✅ Actualizar sesiones de su institución
- ✅ Eliminar sesiones de su institución
- ❌ NO puede ver sesiones de otras instituciones

### 7. **Materiales de su Institución**
- ✅ Ver todos los materiales de cursos de su institución
- ✅ Subir nuevos materiales a cursos de su institución
- ✅ Actualizar materiales de su institución
- ✅ Eliminar materiales de su institución
- ❌ NO puede ver materiales de otras instituciones

### 8. **Inscripciones de Estudiantes de su Institución** ⭐ NUEVO
- ✅ Ver inscripciones en carreras de estudiantes de su institución
- ✅ Ver inscripciones en cursos de estudiantes de su institución
- ✅ Crear inscripciones para estudiantes de su institución
- ✅ Actualizar inscripciones de estudiantes de su institución
- ❌ NO puede ver inscripciones de estudiantes de otras instituciones

## ❌ Lo que Admin-Campus NO puede ver

1. **Datos de otras instituciones**
   - ❌ Usuarios de otras instituciones
   - ❌ Carreras de otras instituciones
   - ❌ Materias de otras instituciones
   - ❌ Cursos de otras instituciones
   - ❌ Sesiones de otras instituciones
   - ❌ Materiales de otras instituciones

2. **Funciones globales del sistema**
   - ❌ Módulos del sistema (solo admin global)
   - ❌ Consumo de IA global (solo admin global)
   - ❌ Costos de procesamiento global (solo admin global)
   - ❌ Configuración del sistema (solo admin global)

## 🔧 Implementación Técnica

### Políticas RLS Configuradas

Las políticas RLS filtran automáticamente los datos según la institución del usuario:

1. **institutions**: Solo ve su institución
2. **users**: Solo ve usuarios de su institución
3. **careers**: Solo ve carreras de su institución
4. **subjects**: Solo ve materias de su institución
5. **courses**: Solo ve cursos de su institución
6. **course_units**: Solo ve unidades de cursos de su institución
7. **sessions**: Solo ve sesiones de cursos de su institución
8. **materials**: Solo ve materiales de cursos de su institución
9. **career_enrollments**: Solo ve inscripciones en carreras de estudiantes de su institución ⭐ NUEVO
10. **course_enrollments**: Solo ve inscripciones en cursos de estudiantes de su institución ⭐ NUEVO

### Funciones Helper Utilizadas

- `public.is_admin()` - Verifica si es admin global
- `public.is_admin_campus()` - Verifica si es admin-campus
- `public.get_user_institution_id()` - Obtiene la institución primaria del usuario
- `public.has_institution_access(p_institution_id)` - Verifica acceso a una institución

### Scripts SQL

1. **`sql_scripts/implement_institution_based_roles.sql`**
   - Crea el rol admin-campus
   - Crea funciones helper
   - Configura políticas RLS básicas

2. **`sql_scripts/verify_and_fix_institution_relationships.sql`**
   - Agrega `institution_id` a careers y subjects
   - Configura políticas RLS para careers y subjects

3. **`sql_scripts/ensure_admin_campus_rls_complete.sql`**
   - Verifica y asegura que todas las políticas estén correctas
   - Genera reporte de verificación

4. **`sql_scripts/fix_enrollments_rls_for_institutions.sql`** ⭐ NUEVO
   - Configura políticas RLS para `career_enrollments` y `course_enrollments`
   - Permite ver inscripciones de estudiantes de su institución

5. **`sql_scripts/fix_users_rls_policies.sql`** ⭐ NUEVO
   - Corrige las políticas RLS de la tabla `users`
   - Separa políticas SELECT y UPDATE para mayor claridad

## 📝 Cómo Verificar

### 1. Verificar que el usuario tiene el rol correcto

```sql
SELECT u.id, u.email, r.name as role_name
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.name = 'admin-campus';
```

### 2. Verificar que el usuario está asignado a una institución

```sql
SELECT ui.*, i.name as institution_name
FROM user_institutions ui
JOIN institutions i ON i.id = ui.institution_id
WHERE ui.user_id = '<user_id>'
  AND ui.is_primary = true;
```

### 3. Verificar políticas RLS

```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'careers', 'subjects', 'courses', 'sessions', 'materials', 'institutions')
ORDER BY tablename, policyname;
```

## 🚀 Uso

1. **Asignar rol admin-campus a un usuario:**
   - Ir a `/admin/users`
   - Seleccionar el usuario
   - Cambiar rol a "Admin Campus"

2. **Asignar usuario a una institución:**
   - Ir a `/admin/institutions`
   - Seleccionar la institución
   - Gestionar Usuarios
   - Asignar el usuario y marcar como primaria

3. **Verificar acceso:**
   - Iniciar sesión con el usuario admin-campus
   - Verificar que solo ve datos de su institución
   - Verificar que el sidebar muestra opciones de administración

## ⚠️ Importante

- El usuario **DEBE** tener una institución asignada con `is_primary = true`
- Si el usuario no tiene institución asignada, no podrá ver ningún dato
- Las políticas RLS son automáticas: no se requiere código adicional en el frontend
- El filtrado es transparente: las consultas SQL automáticamente filtran por institución

