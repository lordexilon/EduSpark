# Resumen del Sistema de Instituciones

## 📋 Visión General

EduSpark implementa un sistema multi-tenant basado en instituciones, donde cada institución educativa tiene su propio espacio aislado con sus usuarios, cursos, carreras y materiales.

## 🏛️ Concepto de Institución

Una **institución** es una organización educativa (universidad, colegio, instituto) que tiene:
- Sus propios usuarios (estudiantes, docentes, coordinadores, admin-campus)
- Sus propias carreras y materias
- Sus propios cursos y materiales
- Aislamiento completo de otras instituciones

## 🎭 Roles y Permisos por Institución

### Admin Global
- ✅ Ve **TODAS** las instituciones
- ✅ Ve **TODOS** los usuarios
- ✅ Puede gestionar todo sin restricciones
- ❌ **NO** necesita pertenecer a una institución

### Admin-Campus
- ✅ Ve **SOLO** su institución
- ✅ Gestiona usuarios, cursos, carreras, materias de su institución
- ✅ Puede actualizar información de su institución
- ❌ **DEBE** pertenecer a una institución

### Coordinador
- ✅ Ve **SOLO** su institución
- ✅ Gestiona usuarios, cursos, carreras, materias de su institución
- ✅ Puede actualizar información de su institución
- ❌ **DEBE** pertenecer a una institución

### Teacher
- ✅ Ve **SOLO** cursos de su institución
- ✅ Puede crear y gestionar cursos en su institución
- ❌ **DEBE** pertenecer a una institución

### Student
- ✅ Ve **SOLO** cursos de su institución
- ✅ Puede inscribirse en cursos de su institución
- ❌ **DEBE** pertenecer a una institución

## 🔧 Cómo Funciona

### 1. Identificación de Institución

El sistema identifica la institución de un usuario mediante:

```sql
-- Tabla de relación
user_institutions
├── user_id → ID del usuario
├── institution_id → ID de la institución
└── is_primary → TRUE para la institución principal

-- Función helper
get_user_institution_id()
→ Retorna la institución primaria del usuario autenticado
```

### 2. Filtrado Automático

Las políticas RLS (Row Level Security) filtran automáticamente:

```sql
-- Ejemplo: Ver usuarios de mi institución
EXISTS (
  SELECT 1 FROM user_institutions ui
  WHERE ui.user_id = users.id
    AND ui.institution_id = get_user_institution_id()
    AND ui.is_primary = true
)
```

### 3. Tablas con Filtrado por Institución

- ✅ `institutions` - Solo ve su institución
- ✅ `users` - Solo ve usuarios de su institución
- ✅ `careers` - Solo ve carreras de su institución
- ✅ `subjects` - Solo ve materias de su institución
- ✅ `courses` - Solo ve cursos de su institución
- ✅ `course_units` - Solo ve unidades de su institución
- ✅ `sessions` - Solo ve sesiones de su institución
- ✅ `materials` - Solo ve materiales de su institución
- ✅ `career_enrollments` - Solo ve inscripciones de estudiantes de su institución
- ✅ `course_enrollments` - Solo ve inscripciones de estudiantes de su institución

## 📝 Requisitos Importantes

### 1. Todos los Usuarios Deben Tener Institución

**EXCEPTO** el admin global, todos los usuarios deben tener una institución asignada:

- ✅ Estudiantes
- ✅ Teachers
- ✅ Coordinadores
- ✅ Admin-campus

### 2. Institución Primaria

Cada usuario debe tener **SOLO UNA** institución marcada como `is_primary = true`.

### 3. Asignación de Institución

```sql
-- Asignar institución a un usuario
INSERT INTO user_institutions (user_id, institution_id, is_primary, joined_at)
VALUES ('user_id', institution_id, true, NOW());
```

## 🚀 Scripts SQL Principales

1. **`implement_institution_based_roles.sql`**
   - Crea el rol admin-campus
   - Crea funciones helper
   - Configura políticas RLS básicas

2. **`fix_enrollments_rls_for_institutions.sql`**
   - Políticas RLS para enrollments por institución

3. **`fix_users_rls_policies.sql`**
   - Corrección de políticas RLS de usuarios

4. **`ensure_users_have_institution.sql`**
   - Verificación de usuarios con institución

5. **`verify_and_fix_institution_relationships.sql`**
   - Verificación de relaciones con instituciones

## 📚 Documentación Relacionada

- **`SISTEMA_ROLES_INSTITUCIONES.md`** - Sistema completo de roles
- **`PERMISOS_ADMIN_CAMPUS.md`** - Permisos detallados de admin-campus
- **`REQUISITO_INSTITUCIONES_USUARIOS.md`** - Requisitos de instituciones
- **`COMO_IDENTIFICA_INSTITUCION_USUARIO.md`** - Cómo identifica el sistema la institución

## ✅ Estado de Implementación

- ✅ Sistema de instituciones implementado
- ✅ Políticas RLS configuradas para todas las tablas
- ✅ Funciones helper creadas
- ✅ UI actualizada para admin-campus y coordinator
- ✅ Filtrado automático funcionando
- ✅ Verificación de usuarios con institución implementada
- ✅ Políticas RLS para enrollments configuradas

## 🔍 Verificación

### Verificar institución de un usuario

```sql
SELECT u.email, i.name as institution_name, ui.is_primary
FROM users u
JOIN user_institutions ui ON ui.user_id = u.id
JOIN institutions i ON i.id = ui.institution_id
WHERE u.id = 'user_id' AND ui.is_primary = true;
```

### Verificar usuarios sin institución

```sql
-- Ejecutar: sql_scripts/ensure_users_have_institution.sql
```

### Verificar políticas RLS

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'courses', 'careers', 'subjects', 'institutions')
ORDER BY tablename, policyname;
```

