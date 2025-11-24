# Cómo Identifica el Sistema la Institución de un Usuario

## 📋 Mecanismo de Identificación

El sistema identifica la institución de un usuario mediante la tabla `user_institutions` y funciones helper que consultan esta relación.

## 🗄️ Estructura de Datos

### Tabla `user_institutions`

```sql
CREATE TABLE public.user_institutions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  institution_id INTEGER REFERENCES public.institutions(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,  -- ← CLAVE: Identifica la institución principal
  position VARCHAR(100),              -- Cargo o posición del usuario
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, institution_id)
);
```

**Campos importantes**:
- `user_id`: ID del usuario (estudiante, teacher, coordinator, admin-campus)
- `institution_id`: ID de la institución
- `is_primary`: **TRUE** para la institución principal del usuario (solo debe haber una)
- `position`: Cargo o posición del usuario en la institución (opcional)

## 🔧 Función Helper Principal

### `get_user_institution_id()`

Esta función obtiene la institución primaria del usuario actualmente autenticado:

```sql
CREATE OR REPLACE FUNCTION public.get_user_institution_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT institution_id
  FROM public.user_institutions
  WHERE user_id = auth.uid()      -- Usuario actualmente autenticado
    AND is_primary = true          -- Solo la institución primaria
  LIMIT 1;
$$;
```

**Cómo funciona**:
1. Obtiene el ID del usuario autenticado con `auth.uid()`
2. Busca en `user_institutions` el registro donde `user_id = auth.uid()` y `is_primary = true`
3. Retorna el `institution_id` de esa institución primaria
4. Si no encuentra, retorna `NULL`

## 🔒 Uso en Políticas RLS

Las políticas RLS usan esta función para filtrar datos por institución:

### Ejemplo: Política para ver usuarios

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
    public.get_user_institution_id() IS NOT NULL AND  -- ← Verifica que tenga institución
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = users.id                     -- Usuario consultado
        AND ui.institution_id = public.get_user_institution_id()  -- Misma institución
        AND ui.is_primary = true
    )
  );
```

**Cómo funciona**:
1. Verifica que el usuario consultante NO sea admin
2. Verifica que el usuario consultante sea admin-campus, coordinator o teacher
3. Verifica que el usuario consultante tenga una institución asignada (`get_user_institution_id() IS NOT NULL`)
4. Verifica que el usuario consultado pertenezca a la misma institución que el consultante

## 📝 Flujo de Identificación

### 1. Al Autenticarse

```
Usuario inicia sesión
  ↓
auth.uid() = ID del usuario autenticado
  ↓
get_user_institution_id() busca en user_institutions
  WHERE user_id = auth.uid() AND is_primary = true
  ↓
Retorna institution_id o NULL
```

### 2. Al Consultar Datos

```
Usuario consulta datos (ej: estudiantes)
  ↓
Política RLS se ejecuta
  ↓
get_user_institution_id() obtiene institución del consultante
  ↓
Verifica que datos consultados pertenezcan a la misma institución
  ↓
Filtra automáticamente los resultados
```

### 3. Ejemplo Práctico

**Escenario**: Un `admin-campus` consulta estudiantes

```sql
-- Usuario autenticado: admin-campus (ID: 130ccd8e-4ba6-4a90-9859-21bd94ebdad9)
-- Institución asignada: ID 1 (is_primary = true)

-- Consulta: SELECT * FROM users WHERE role_id = 1 (estudiantes)

-- Política RLS se ejecuta:
-- 1. get_user_institution_id() → retorna 1
-- 2. Verifica que cada estudiante tenga:
--    - user_institutions.user_id = student.id
--    - user_institutions.institution_id = 1
--    - user_institutions.is_primary = true
-- 3. Solo retorna estudiantes que cumplan estas condiciones
```

## 🔍 Verificación de Institución

### Consulta para verificar institución de un usuario

```sql
-- Ver institución de un usuario específico
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
WHERE u.id = 'user_id_aqui';
```

### Consulta para ver todos los usuarios de una institución

```sql
-- Ver todos los usuarios de una institución
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  ui.position,
  ui.joined_at
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
JOIN public.user_institutions ui ON ui.user_id = u.id
WHERE ui.institution_id = 1  -- ID de la institución
  AND ui.is_primary = true
ORDER BY r.name, u.last_name;
```

## ⚠️ Requisitos Importantes

### 1. Usuario DEBE tener institución asignada

```sql
-- Verificar usuarios sin institución
SELECT u.id, u.email, r.name as role_name
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE r.name IN ('student', 'teacher', 'coordinator', 'admin-campus')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_institutions ui
    WHERE ui.user_id = u.id
  );
```

### 2. Usuario DEBE tener SOLO UNA institución primaria

```sql
-- Verificar usuarios con múltiples instituciones primarias
SELECT user_id, COUNT(*) as institution_count
FROM public.user_institutions
WHERE is_primary = true
GROUP BY user_id
HAVING COUNT(*) > 1;
```

### 3. Asignar institución a un usuario

```sql
-- Asignar institución a un usuario
INSERT INTO public.user_institutions (user_id, institution_id, is_primary, joined_at)
VALUES ('user_id_aqui', institution_id_aqui, true, NOW())
ON CONFLICT (user_id, institution_id) DO NOTHING;
```

## 🎯 Resumen

1. **Identificación**: El sistema usa la tabla `user_institutions` con `is_primary = true`
2. **Función Helper**: `get_user_institution_id()` obtiene la institución del usuario autenticado
3. **Políticas RLS**: Filtran automáticamente los datos basándose en la institución
4. **Requisito**: Todos los usuarios (excepto admin) DEBEN tener una institución asignada con `is_primary = true`

## 🔧 Scripts de Verificación

- `sql_scripts/ensure_users_have_institution.sql`: Verifica que todos los usuarios tengan institución
- `sql_scripts/implement_institution_based_roles.sql`: Crea las funciones helper y políticas RLS

