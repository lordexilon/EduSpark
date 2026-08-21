# Requisito: Todos los Usuarios Deben Tener Institución

## 📋 Requisito Importante

**TODOS los estudiantes, teachers, coordinadores y admin-campus DEBEN pertenecer a la misma institución (o a su respectiva institución en caso de múltiples instituciones).**

## ✅ Usuarios que DEBEN tener institución asignada

1. **Estudiantes (student)**
2. **Teachers (teacher)**
3. **Coordinadores (coordinator)**
4. **Admin-campus (admin-campus)**

## ❌ Usuarios que NO requieren institución

- **Admin global (admin)**: Puede ver todas las instituciones y no requiere estar asignado a una específica.

## 🔧 Verificación

### Script de Verificación

Ejecutar el script `sql_scripts/ensure_users_have_institution.sql` para:

1. **Verificar usuarios sin institución**: Identifica estudiantes, teachers, coordinadores y admin-campus que no tienen una institución asignada.

2. **Mostrar distribución por institución**: Muestra cuántos usuarios de cada rol hay en cada institución.

3. **Verificar integridad**: Detecta usuarios con múltiples instituciones primarias (debe haber solo una).

### Ejecutar Verificación

```sql
-- En Supabase SQL Editor
-- sql_scripts/ensure_users_have_institution.sql
```

## 🔄 Migración Automática (Opcional)

El script incluye una sección comentada para migración automática que:

- Asigna automáticamente una institución por defecto a usuarios sin institución
- Usa la primera institución activa como predeterminada

**⚠️ IMPORTANTE**: Descomentar y ajustar el `institution_id` antes de ejecutar la migración automática.

## 📝 Asignación Manual de Institución

### Asignar institución a un usuario

```sql
INSERT INTO public.user_institutions (user_id, institution_id, is_primary, joined_at)
VALUES ('user_id_aqui', institution_id_aqui, true, NOW())
ON CONFLICT (user_id, institution_id) DO NOTHING;
```

### Cambiar institución primaria de un usuario

```sql
-- 1. Desmarcar todas como primarias
UPDATE public.user_institutions 
SET is_primary = false 
WHERE user_id = 'user_id_aqui';

-- 2. Marcar la nueva como primaria
UPDATE public.user_institutions 
SET is_primary = true 
WHERE user_id = 'user_id_aqui' 
  AND institution_id = new_institution_id;
```

## 🔒 Políticas RLS

Las políticas RLS están configuradas para que:

- **Admin**: Ve todos los usuarios sin restricción
- **Admin-campus, Coordinator, Teacher**: Solo ven usuarios de su institución
- **Student**: Solo ve su propio perfil y datos de su institución

### Política Principal (Actualizada) ⭐ ACTUALIZADO

```sql
CREATE POLICY "users_institution_access" ON public.users
  FOR SELECT
  USING (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher()
    ) AND
    public.get_user_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = users.id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );
```

Esta política asegura que:
- Solo usuarios de la misma institución pueden verse entre sí
- El filtrado es automático basado en `user_institutions.is_primary = true`
- Verifica que el usuario consultante tenga institución asignada (`get_user_institution_id() IS NOT NULL`)
- Las consultas SQL se filtran automáticamente por institución
- Políticas separadas para SELECT y UPDATE para mayor claridad ⭐ NUEVO

## ⚠️ Problemas Comunes

### 1. Usuario sin institución asignada

**Síntoma**: El usuario no puede ver datos o recibe errores de permisos.

**Solución**: Asignar una institución usando el script de migración o manualmente.

### 2. Usuario con múltiples instituciones primarias

**Síntoma**: Comportamiento inconsistente, puede ver datos de múltiples instituciones.

**Solución**: Asegurar que solo una institución tenga `is_primary = true` para cada usuario.

### 3. Usuario no puede ver estudiantes/teachers

**Síntoma**: Un admin-campus o coordinator no ve usuarios de su institución.

**Solución**: 
- Verificar que el usuario tenga una institución asignada con `is_primary = true`
- Verificar que los usuarios que intenta ver también pertenezcan a la misma institución
- Ejecutar el script de verificación para identificar problemas

## 📊 Estructura de Datos

### Tabla `user_institutions`

```sql
CREATE TABLE public.user_institutions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  institution_id INTEGER REFERENCES public.institutions(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  position VARCHAR(100),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, institution_id)
);
```

**Campos importantes**:
- `user_id`: ID del usuario
- `institution_id`: ID de la institución
- `is_primary`: Debe ser `true` para la institución principal del usuario
- `position`: Cargo o posición del usuario en la institución (opcional)

## 🎯 Buenas Prácticas

1. **Siempre asignar institución al crear usuarios**: Al crear un estudiante, teacher, coordinator o admin-campus, asignar inmediatamente una institución.

2. **Verificar antes de operaciones masivas**: Antes de importar usuarios masivamente, asegurar que todos tengan una institución asignada.

3. **Usar `is_primary = true`**: Cada usuario debe tener exactamente una institución con `is_primary = true`.

4. **Validar en el frontend**: El frontend puede validar que un usuario tenga institución antes de permitir ciertas operaciones.

5. **Ejecutar verificación periódicamente**: Ejecutar el script de verificación periódicamente para detectar problemas temprano.

## 🔍 Consultas Útiles

### Ver usuarios sin institución

```sql
SELECT u.id, u.email, u.first_name, u.last_name, r.name as role_name
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE r.name IN ('student', 'teacher', 'coordinator', 'admin-campus')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_institutions ui
    WHERE ui.user_id = u.id
  );
```

### Ver distribución por institución

```sql
SELECT 
  i.name as institution_name,
  COUNT(CASE WHEN r.name = 'student' THEN 1 END) as students,
  COUNT(CASE WHEN r.name = 'teacher' THEN 1 END) as teachers,
  COUNT(CASE WHEN r.name = 'coordinator' THEN 1 END) as coordinators,
  COUNT(CASE WHEN r.name = 'admin-campus' THEN 1 END) as admin_campus,
  COUNT(*) as total_users
FROM public.institutions i
LEFT JOIN public.user_institutions ui ON ui.institution_id = i.id AND ui.is_primary = true
LEFT JOIN public.users u ON u.id = ui.user_id
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE r.name IN ('student', 'teacher', 'coordinator', 'admin-campus')
GROUP BY i.id, i.name
ORDER BY i.name;
```

### Verificar usuarios con múltiples instituciones primarias

```sql
SELECT user_id, COUNT(*) as institution_count
FROM public.user_institutions
WHERE is_primary = true
GROUP BY user_id
HAVING COUNT(*) > 1;
```

