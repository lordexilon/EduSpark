# Sistema de Roles Basado en Instituciones

## 📋 Resumen

Sistema implementado para separar permisos por institución, donde solo el **Admin** (super administrador) puede ver todo, y todos los demás roles están limitados a su institución.

## 🎭 Roles y Permisos

### 1. **Admin** (Super Administrador)
- ✅ Ve **TODAS** las instituciones
- ✅ Ve **TODOS** los usuarios
- ✅ Ve **TODOS** los cursos
- ✅ Puede gestionar todo sin restricciones
- ❌ **NO** necesita pertenecer a una institución

### 2. **Admin-Campus** (Administrador de Institución)
- ✅ Ve **SOLO** su institución
- ✅ Ve usuarios de **SU** institución
- ✅ Ve cursos de **SU** institución
- ✅ Puede gestionar usuarios y cursos de su institución
- ✅ Puede actualizar información de su institución
- ❌ **DEBE** pertenecer a una institución (marcada como primaria)

### 3. **Coordinador**
- ✅ Ve **SOLO** su institución
- ✅ Ve usuarios de **SU** institución
- ✅ Ve cursos de **SU** institución
- ✅ Puede gestionar usuarios y cursos de su institución
- ✅ Puede actualizar información de su institución
- ❌ **DEBE** pertenecer a una institución (marcada como primaria)

### 4. **Teacher** (Docente)
- ✅ Ve **SOLO** cursos de **SU** institución
- ✅ Puede crear y gestionar cursos en su institución
- ✅ Ve sus propios cursos (incluso si no tienen institution_id)
- ❌ **DEBE** pertenecer a una institución

### 5. **Student** (Estudiante)
- ✅ Ve **SOLO** cursos de **SU** institución
- ✅ Puede inscribirse en cursos de su institución
- ❌ **DEBE** pertenecer a una institución

## 🔧 Implementación Técnica

### Script SQL Principal
**Archivo:** `sql_scripts/implement_institution_based_roles.sql`

Este script:
1. ✅ Crea el rol `admin-campus`
2. ✅ Crea funciones helper para verificar roles y obtener institución
3. ✅ Actualiza políticas RLS para todas las tablas relevantes
4. ✅ Implementa filtrado automático por institución

### Funciones Helper Creadas

```sql
-- Verificar si es admin (sin restricción de institución)
public.is_admin()

-- Obtener institución primaria del usuario
public.get_user_institution_id()

-- Verificar si pertenece a una institución específica
public.user_belongs_to_institution(p_institution_id)

-- Verificar si tiene acceso a una institución
public.has_institution_access(p_institution_id)

-- Verificar roles específicos
public.is_admin_campus()
public.is_coordinator()
public.is_teacher()
public.is_student()
```

### Políticas RLS Implementadas

Las políticas RLS filtran automáticamente según el rol:

1. **Admin**: Ve todo (sin restricción)
2. **Otros roles**: Solo ven datos de su institución primaria

**Tablas con políticas actualizadas:**
- ✅ `institutions` - Solo ve su institución
- ✅ `users` - Solo ve usuarios de su institución
- ✅ `user_institutions` - Solo ve asignaciones de su institución
- ✅ `courses` - Solo ve cursos de su institución
- ✅ `course_units` - Solo ve unidades de cursos de su institución
- ✅ `sessions` - Solo ve sesiones de cursos de su institución
- ✅ `materials` - Solo ve materiales de cursos de su institución
- ✅ `careers` - Solo ve carreras de su institución ⭐ NUEVO
- ✅ `subjects` - Solo ve materias de su institución ⭐ NUEVO
- ✅ `career_enrollments` - Solo ve inscripciones de estudiantes de su institución ⭐ NUEVO
- ✅ `course_enrollments` - Solo ve inscripciones de estudiantes de su institución ⭐ NUEVO

## 📝 Cómo Usar

### 1. Ejecutar el Script SQL

```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: sql_scripts/implement_institution_based_roles.sql
```

### 2. Asignar Usuarios a Instituciones

**IMPORTANTE:** Todos los usuarios (excepto admin) deben tener una institución asignada.

```sql
-- Asignar usuario a institución (marcar como primaria)
INSERT INTO public.user_institutions (user_id, institution_id, is_primary)
VALUES ('user-uuid', 1, true);
```

**Desde la UI:**
1. Ir a `/admin/institutions`
2. Clic en "Gestionar Usuarios" (botón verde)
3. Buscar y asignar usuarios a la institución
4. Marcar como "Primaria" si es necesario

### 3. Crear Usuarios con Rol Admin-Campus

```sql
-- Crear usuario admin-campus
UPDATE public.users
SET role_id = (SELECT id FROM public.roles WHERE name = 'admin-campus')
WHERE id = 'user-uuid';

-- Asignar a institución
INSERT INTO public.user_institutions (user_id, institution_id, is_primary)
VALUES ('user-uuid', 1, true);
```

## ⚠️ Consideraciones Importantes

### 1. Institución Primaria
- Cada usuario debe tener **UNA** institución marcada como `is_primary = true`
- La función `get_user_institution_id()` usa la institución primaria
- Si un usuario tiene múltiples instituciones, solo la primaria se usa para filtros

### 2. Cursos sin Institución
- Los cursos creados por teachers **deben** tener `institution_id`
- Si un curso no tiene `institution_id`, solo el teacher propietario puede verlo
- Se recomienda siempre asignar `institution_id` al crear cursos

### 3. Migración de Datos Existentes
Si ya tienes usuarios y cursos sin institución:

```sql
-- 1. Crear una institución por defecto
INSERT INTO public.institutions (name, description, is_active)
VALUES ('Institución por Defecto', 'Institución para usuarios sin asignar', true)
RETURNING id;

-- 2. Asignar todos los usuarios a esta institución
INSERT INTO public.user_institutions (user_id, institution_id, is_primary)
SELECT id, (SELECT id FROM public.institutions WHERE name = 'Institución por Defecto' LIMIT 1), true
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.user_institutions WHERE is_primary = true)
  AND id NOT IN (
    SELECT u.id FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE r.name = 'admin'
  );

-- 3. Asignar institution_id a cursos sin institución
UPDATE public.courses
SET institution_id = (
  SELECT ui.institution_id
  FROM public.user_institutions ui
  WHERE ui.user_id = courses.teacher_id
    AND ui.is_primary = true
  LIMIT 1
)
WHERE institution_id IS NULL;
```

## 🔍 Verificación

### Verificar que las políticas funcionan:

```sql
-- Como admin, deberías ver todas las instituciones
SELECT * FROM public.institutions;

-- Como admin-campus, deberías ver solo tu institución
SELECT * FROM public.institutions;

-- Verificar institución del usuario actual
SELECT public.get_user_institution_id();

-- Verificar rol del usuario actual
SELECT 
  public.is_admin() as is_admin,
  public.is_admin_campus() as is_admin_campus,
  public.is_coordinator() as is_coordinator,
  public.is_teacher() as is_teacher,
  public.is_student() as is_student;
```

## 📚 Archivos Relacionados

### Scripts SQL
- `sql_scripts/implement_institution_based_roles.sql` - Script principal ⭐ ACTUALIZADO
- `sql_scripts/fix_enrollments_rls_for_institutions.sql` - Políticas RLS para enrollments ⭐ NUEVO
- `sql_scripts/fix_users_rls_policies.sql` - Corrección de políticas de usuarios ⭐ NUEVO
- `sql_scripts/ensure_users_have_institution.sql` - Verificación de usuarios con institución ⭐ NUEVO
- `sql_scripts/ensure_admin_campus_rls_complete.sql` - Verificación completa ⭐ NUEVO
- `sql_scripts/verify_and_fix_institution_relationships.sql` - Verificación de relaciones ⭐ NUEVO
- `sql_scripts/ensure_institutions_structure.sql` - Estructura de instituciones

### Servicios y Componentes
- `services/institutionService.ts` - Servicios de instituciones
- `services/studentService.ts` - Servicios de estudiantes (filtrado por institución)
- `pages/InstitutionManagementPage.tsx` - UI de gestión de instituciones ⭐ ACTUALIZADO
- `pages/StudentsManagementPage.tsx` - Gestión de estudiantes (filtrado por institución) ⭐ ACTUALIZADO

### Documentación
- `AI_CONTEXT/PERMISOS_ADMIN_CAMPUS.md` - Permisos detallados de admin-campus
- `AI_CONTEXT/REQUISITO_INSTITUCIONES_USUARIOS.md` - Requisitos de instituciones
- `AI_CONTEXT/COMO_IDENTIFICA_INSTITUCION_USUARIO.md` - Cómo identifica el sistema la institución

## ✅ Estado de Implementación

1. ✅ Script SQL ejecutado
2. ✅ Políticas RLS configuradas para todas las tablas
3. ✅ Funciones helper creadas
4. ✅ UI actualizada para admin-campus y coordinator
5. ✅ Filtrado automático por institución funcionando
6. ✅ Verificación de usuarios con institución implementada
7. ✅ Políticas RLS para enrollments configuradas ⭐ NUEVO

## 🔍 Verificación y Troubleshooting

### Verificar que las políticas funcionan:

```sql
-- Como admin, deberías ver todas las instituciones
SELECT * FROM public.institutions;

-- Como admin-campus, deberías ver solo tu institución
SELECT * FROM public.institutions;

-- Verificar institución del usuario actual
SELECT public.get_user_institution_id();

-- Verificar rol del usuario actual
SELECT 
  public.is_admin() as is_admin,
  public.is_admin_campus() as is_admin_campus,
  public.is_coordinator() as is_coordinator,
  public.is_teacher() as is_teacher,
  public.is_student() as is_student;
```

### Scripts de Verificación

1. **Verificar usuarios sin institución:**
   ```sql
   -- sql_scripts/ensure_users_have_institution.sql
   ```

2. **Verificar políticas RLS:**
   ```sql
   -- sql_scripts/ensure_admin_campus_rls_complete.sql
   ```

3. **Verificar relaciones:**
   ```sql
   -- sql_scripts/verify_and_fix_institution_relationships.sql
   ```

