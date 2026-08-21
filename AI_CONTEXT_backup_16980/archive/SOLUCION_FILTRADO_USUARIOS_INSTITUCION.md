# Corrección: Filtrado de Usuarios por Institución para Admin-Campus

**Fecha:** 19 de noviembre de 2025  
**Problema:** Admin-campus estaba viendo estudiantes de TODAS las instituciones  
**Solución:** Actualización de servicios para filtrar correctamente por institución

---

## 🔧 Cambios Realizados

### 1. **Servicio de Estudiantes** (`services/studentService.ts`)

**Antes:**
```typescript
async getAllStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role_id', 1)
    .order('last_name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}
```

**Después:**
```typescript
async getAllStudents(): Promise<Student[]> {
  // Las políticas RLS filtran automáticamente por institución
  // Agregamos join explícito con user_institutions para asegurar el filtrado
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      user_institutions!inner(institution_id, is_primary)
    `)
    .eq('role_id', 1)
    .eq('user_institutions.is_primary', true) // Solo institución primaria
    .order('last_name', { ascending: true });
  
  // Mapear los datos para incluir institution_id
  const students = (data || []).map((student: any) => ({
    id: student.id,
    email: student.email,
    first_name: student.first_name,
    last_name: student.last_name,
    role_id: student.role_id,
    is_active: student.is_active,
    created_at: student.created_at,
    institution_id: student.user_institutions?.[0]?.institution_id
  }));
  
  return students;
}
```

**Cambios clave:**
- ✅ Agregado `user_institutions!inner(...)` - El `!inner` asegura que SOLO se devuelvan usuarios que tengan institución
- ✅ Filtro por `is_primary = true` - Solo la institución principal del usuario
- ✅ Mapeo de datos para incluir `institution_id` en cada estudiante
- ✅ Las políticas RLS de Supabase filtran automáticamente según la institución del usuario autenticado

### 2. **Servicio de Usuarios** (`services/api.ts`)

**Antes:**
```typescript
async getUsers(): Promise<ApiResponse<User[]>> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, email, first_name, last_name, is_active,
      created_at, updated_at,
      role:roles(id, name)
    `)
    .order('created_at', { ascending: false });
  
  return { success: true, data: data as User[] };
}
```

**Después:**
```typescript
async getUsers(): Promise<ApiResponse<User[]>> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, email, first_name, last_name, is_active,
      created_at, updated_at,
      role:roles(id, name),
      user_institutions!left(institution_id, is_primary)
    `)
    .order('created_at', { ascending: false });
  
  // Mapear los datos para incluir institution_id
  const users = (data || []).map((user: any) => ({
    ...user,
    institution_id: user.user_institutions?.find((ui: any) => ui.is_primary)?.institution_id
  }));
  
  return { success: true, data: users as User[] };
}
```

**Cambios clave:**
- ✅ Agregado `user_institutions!left(...)` - El `!left` permite ver usuarios incluso si no tienen institución (para admin global)
- ✅ Mapeo de datos para incluir `institution_id` en cada usuario
- ✅ Las políticas RLS filtran automáticamente para admin-campus y coordinator

---

## 🔒 Cómo Funcionan las Políticas RLS

Las políticas RLS (Row Level Security) de Supabase filtran automáticamente los datos según el usuario autenticado:

### Para Admin Global (`admin`):
- ✅ Ve TODOS los usuarios de TODAS las instituciones
- ✅ No se aplica filtrado por institución

### Para Admin-Campus (`admin-campus`):
- ✅ Ve SOLO usuarios de SU institución
- ❌ NO ve usuarios de otras instituciones
- 🔐 Filtrado automático por `get_user_institution_id()`

### Para Coordinator (`coordinator`):
- ✅ Ve SOLO usuarios de SU institución
- ❌ NO ve usuarios de otras instituciones
- 🔐 Filtrado automático por `get_user_institution_id()`

---

## 🧪 Cómo Verificar que Funciona

### 1. **Verificar la institución del usuario admin-campus**

Ejecutar en SQL Editor de Supabase:

```sql
-- Ver la institución del usuario admin-campus
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  i.id as institution_id,
  i.name as institution_name,
  ui.is_primary
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
LEFT JOIN public.institutions i ON i.id = ui.institution_id
WHERE r.name = 'admin-campus'
  AND u.email = 'tu_email_admin_campus@ejemplo.com';
```

**Resultado esperado:**
- Debe mostrar el usuario con su institución asignada
- `is_primary` debe ser `true`
- `institution_id` debe tener un valor (ej: 1, 2, 3, etc.)

### 2. **Verificar estudiantes de la institución**

```sql
-- Ver todos los estudiantes de una institución específica
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  i.id as institution_id,
  i.name as institution_name
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
JOIN public.institutions i ON i.id = ui.institution_id
WHERE r.name = 'student'
  AND ui.institution_id = 1  -- Cambiar por el ID de tu institución
ORDER BY u.last_name, u.first_name;
```

**Resultado esperado:**
- Debe mostrar SOLO estudiantes de la institución especificada
- Cada estudiante debe tener `institution_id` igual al filtrado

### 3. **Probar en la aplicación**

1. **Iniciar sesión como admin-campus:**
   - Email: `tu_email_admin_campus@ejemplo.com`
   - Contraseña: `tu_contraseña`

2. **Ir a "Gestión de Estudiantes"** (`/admin/students`)

3. **Verificar que solo se muestran estudiantes de tu institución:**
   - Contar cuántos estudiantes se muestran
   - Comparar con la consulta SQL del paso 2
   - Deben coincidir los números

4. **Ir a "Gestión de Usuarios"** (`/admin/users`)

5. **Verificar que solo se muestran usuarios de tu institución:**
   - Verificar que NO aparezcan usuarios de otras instituciones
   - Todos los usuarios mostrados deben pertenecer a tu institución

---

## ⚠️ Solución de Problemas

### Problema: Admin-campus sigue viendo usuarios de otras instituciones

**Causa posible:** El usuario no tiene institución asignada o las políticas RLS no están configuradas

**Solución:**

1. **Verificar que el usuario tiene institución asignada:**

```sql
SELECT ui.*, i.name as institution_name
FROM user_institutions ui
JOIN institutions i ON i.id = ui.institution_id
WHERE ui.user_id = 'ID_DEL_USUARIO_ADMIN_CAMPUS'
  AND ui.is_primary = true;
```

Si no devuelve resultados, asignar institución:

```sql
INSERT INTO public.user_institutions (user_id, institution_id, is_primary, joined_at)
VALUES ('ID_DEL_USUARIO_ADMIN_CAMPUS', 1, true, NOW())
ON CONFLICT (user_id, institution_id) DO UPDATE
SET is_primary = true;
```

2. **Verificar que las políticas RLS están habilitadas:**

```sql
-- Verificar políticas RLS en la tabla users
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;
```

3. **Ejecutar script de verificación:**

```bash
# Ejecutar en SQL Editor de Supabase
-- Ver: sql_scripts/ensure_admin_campus_rls_complete.sql
```

### Problema: No se muestran estudiantes

**Causa posible:** Los estudiantes no tienen institución asignada

**Solución:**

```sql
-- Ver estudiantes sin institución
SELECT u.id, u.email, u.first_name, u.last_name
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE r.name = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_institutions ui
    WHERE ui.user_id = u.id AND ui.is_primary = true
  );
```

Si hay estudiantes sin institución, asignarlos:

```sql
-- Asignar estudiantes a una institución (cambiar IDs según corresponda)
INSERT INTO public.user_institutions (user_id, institution_id, is_primary, joined_at)
SELECT u.id, 1, true, NOW()  -- Cambiar '1' por el ID de la institución
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE r.name = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_institutions ui
    WHERE ui.user_id = u.id
  )
ON CONFLICT (user_id, institution_id) DO NOTHING;
```

---

## 📚 Documentación Relacionada

- `AI_CONTEXT/COMO_IDENTIFICA_INSTITUCION_USUARIO.md` - Cómo funciona la identificación de institución
- `AI_CONTEXT/PERMISOS_ADMIN_CAMPUS.md` - Permisos completos de admin-campus
- `AI_CONTEXT/SISTEMA_ROLES_INSTITUCIONES.md` - Sistema completo de roles
- `sql_scripts/implement_institution_based_roles.sql` - Script de implementación de roles
- `sql_scripts/ensure_admin_campus_rls_complete.sql` - Verificación de políticas RLS

---

## ✅ Resumen

**Cambios realizados:**
1. ✅ Actualizado `studentService.getAllStudents()` para incluir join con `user_institutions`
2. ✅ Actualizado `usersAPI.getUsers()` para incluir join con `user_institutions`
3. ✅ Agregado filtrado explícito por `is_primary = true`
4. ✅ Mapeo de datos para incluir `institution_id` en cada registro

**Resultado esperado:**
- Admin-campus solo ve usuarios de su institución
- Coordinator solo ve usuarios de su institución
- Admin global sigue viendo todos los usuarios
- El filtrado es automático y transparente

**Próximos pasos:**
1. Probar en la aplicación con un usuario admin-campus
2. Verificar que solo se muestran usuarios de su institución
3. Si hay problemas, ejecutar las consultas SQL de verificación
