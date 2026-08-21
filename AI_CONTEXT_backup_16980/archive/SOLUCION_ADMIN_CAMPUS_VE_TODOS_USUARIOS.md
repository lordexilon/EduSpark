# Solución: Admin-Campus Sigue Viendo Usuarios de Otras Instituciones

**Problema:** El usuario admin-campus puede ver usuarios de TODAS las instituciones en lugar de solo los de SU institución.

**Causa:** Las políticas RLS (Row Level Security) en Supabase no están configuradas correctamente para filtrar usuarios por institución.

---

## 🔧 Solución: Ejecutar Script SQL en Supabase

### **Paso 1: Abrir SQL Editor en Supabase**

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: **mckfscukxcqwntpjagar**
3. En el menú lateral, haz clic en **"SQL Editor"**

### **Paso 2: Ejecutar el Script de Corrección**

1. Copia el contenido del archivo: `sql_scripts/fix_users_rls_for_admin_campus.sql`
2. Pégalo en el SQL Editor de Supabase
3. Haz clic en **"Run"** (o presiona `Ctrl+Enter`)

### **Paso 3: Verificar que se Ejecutó Correctamente**

El script mostrará:
- ✅ Lista de políticas actuales (antes de eliminar)
- ✅ Confirmación de eliminación de políticas antiguas
- ✅ Confirmación de creación de nuevas políticas
- ✅ Lista de políticas nuevas creadas
- ✅ Verificación de funciones helper

**Resultado esperado:**
```
policyname                              | cmd    | tiene_condicion
----------------------------------------|--------|------------------
admin_campus_update_institution_users   | UPDATE | Tiene condición USING
admin_campus_view_institution_users     | SELECT | Tiene condición USING
admin_update_all_users                  | UPDATE | Tiene condición USING
admin_view_all_users                    | SELECT | Tiene condición USING
teacher_view_institution_users          | SELECT | Tiene condición USING
users_update_own_profile                | UPDATE | Tiene condición USING
users_view_own_profile                  | SELECT | Tiene condición USING
```

---

## 🧪 Verificación: Probar que Funciona

### **Opción A: Verificar en SQL Editor**

Ejecuta esta consulta en SQL Editor **mientras estás autenticado como admin-campus**:

```sql
-- Ver mi institución
SELECT public.get_user_institution_id() as mi_institucion;

-- Ver usuarios que puedo ver (solo de mi institución)
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  ui.institution_id
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
ORDER BY r.name, u.last_name;
```

**Resultado esperado:**
- Solo deberías ver usuarios de TU institución
- Todos los usuarios mostrados deben tener el mismo `institution_id`

### **Opción B: Verificar en la Aplicación**

1. **Cierra sesión** en la aplicación (si estás logueado)
2. **Inicia sesión** como admin-campus: `jorgelinamedi@gmail.com`
3. Ve a **Gestión de Usuarios** (`/admin/users`)
4. **Verifica** que solo se muestran usuarios de tu institución

**Cómo saber si funciona:**
- ✅ Solo ves usuarios de tu institución
- ✅ La columna "Institución" muestra el mismo nombre para todos
- ✅ El contador muestra menos usuarios que antes

---

## ⚠️ Si Sigue Sin Funcionar

### **Verificación 1: ¿El usuario admin-campus tiene institución asignada?**

```sql
-- Verificar institución del usuario admin-campus
SELECT 
  u.email,
  ui.institution_id,
  i.name as institution_name,
  ui.is_primary
FROM public.users u
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id
LEFT JOIN public.institutions i ON i.id = ui.institution_id
WHERE u.email = 'jorgelinamedi@gmail.com';
```

**Resultado esperado:**
- Debe mostrar una fila con `institution_id` y `is_primary = true`
- Si NO muestra nada o `institution_id` es NULL, ejecutar:

```sql
-- Asignar institución al usuario admin-campus
INSERT INTO public.user_institutions (user_id, institution_id, is_primary, joined_at)
SELECT 
  u.id,
  1,  -- Cambiar por el ID de la institución correcta
  true,
  NOW()
FROM public.users u
WHERE u.email = 'jorgelinamedi@gmail.com'
ON CONFLICT (user_id, institution_id) DO UPDATE
SET is_primary = true;
```

### **Verificación 2: ¿RLS está habilitado en la tabla users?**

```sql
-- Verificar que RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'users';
```

**Resultado esperado:**
- `rowsecurity` debe ser `true`
- Si es `false`, ejecutar:

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

### **Verificación 3: ¿Las funciones helper existen?**

```sql
-- Verificar funciones helper
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_admin', 'is_admin_campus', 'is_coordinator', 'is_teacher', 'get_user_institution_id')
ORDER BY routine_name;
```

**Resultado esperado:**
- Deben aparecer las 5 funciones
- Si faltan, ejecutar el script: `sql_scripts/implement_institution_based_roles.sql`

---

## 📊 Cómo Funcionan las Nuevas Políticas

### **Política para Admin Global:**
```sql
CREATE POLICY "admin_view_all_users" ON public.users
  FOR SELECT
  USING (public.is_admin());
```
- ✅ Admin global ve TODOS los usuarios

### **Política para Admin-Campus:**
```sql
CREATE POLICY "admin_campus_view_institution_users" ON public.users
  FOR SELECT
  USING (
    (public.is_admin_campus() OR public.is_coordinator())
    AND
    EXISTS (
      SELECT 1 
      FROM public.user_institutions ui_current
      JOIN public.user_institutions ui_target ON ui_target.institution_id = ui_current.institution_id
      WHERE ui_current.user_id = auth.uid()
        AND ui_current.is_primary = true
        AND ui_target.user_id = users.id
        AND ui_target.is_primary = true
    )
  );
```
- ✅ Admin-campus solo ve usuarios de SU institución
- ✅ Usa un JOIN entre la institución del usuario actual y la del usuario consultado
- ✅ Solo muestra usuarios donde ambos pertenecen a la MISMA institución

---

## 🎯 Resumen

1. **Ejecutar** `sql_scripts/fix_users_rls_for_admin_campus.sql` en Supabase SQL Editor
2. **Verificar** que las políticas se crearon correctamente
3. **Cerrar sesión** y volver a iniciar sesión en la aplicación
4. **Probar** que solo se ven usuarios de la institución del admin-campus

Si después de ejecutar el script sigue sin funcionar, ejecutar las verificaciones adicionales para asegurarse de que:
- El usuario tiene institución asignada
- RLS está habilitado
- Las funciones helper existen

---

## 📝 Archivos Relacionados

- `sql_scripts/fix_users_rls_for_admin_campus.sql` - Script de corrección
- `sql_scripts/implement_institution_based_roles.sql` - Script de funciones helper
- `AI_CONTEXT/PERMISOS_ADMIN_CAMPUS.md` - Documentación de permisos
- `AI_CONTEXT/COMO_IDENTIFICA_INSTITUCION_USUARIO.md` - Cómo funciona la identificación
