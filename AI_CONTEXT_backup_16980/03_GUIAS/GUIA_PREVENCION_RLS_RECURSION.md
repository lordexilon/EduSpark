# Guía de Prevención de Errores de Recursión en RLS (Supabase/PostgreSQL)

## 🚨 El Problema: Recursión Infinita en Políticas RLS

Este error ocurre cuando una política de seguridad (Row Level Security) intenta verificar permisos consultando una tabla que, a su vez, necesita consultar la tabla original para verificar sus propios permisos. Esto crea un bucle infinito que PostgreSQL bloquea por seguridad, resultando en que el usuario parece no tener permisos o datos (ej. rol "Estudiante" por defecto).

### Ejemplo del Error
1. Política en `users`: "Permitir ver si el usuario está en mi institución (consultando `user_institutions`)".
2. Política en `user_institutions`: "Permitir ver si el usuario es Admin (consultando `users`)".
3. **Resultado:** Bucle infinito -> Bloqueo total.

---

## ✅ La Solución: Funciones `SECURITY DEFINER`

Para evitar esto, **NUNCA** consultes tablas cruzadas directamente dentro de una política RLS si existe riesgo de dependencia circular. En su lugar, utiliza funciones auxiliares definidas como `SECURITY DEFINER`.

### ¿Qué es `SECURITY DEFINER`?
Es una función que se ejecuta con los permisos del **creador de la función** (usualmente el superusuario de la BD), ignorando las políticas RLS activas. Esto permite "saltarse" las reglas para obtener un dato específico (ej. "¿Soy admin?") sin activar el bucle de comprobaciones.

### Patrón Seguro de Implementación

#### 1. Crear Funciones Helper Seguras
Estas funciones deben ser simples, específicas y de solo lectura (`STABLE`).

```sql
-- Verificar Rol (Sin consultar tabla users con RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER -- Clave: Ignora RLS
SET search_path = public
STABLE
AS $$
  SELECT r.name 
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.id = auth.uid();
$$;

-- Obtener Institución (Sin consultar user_institutions con RLS)
CREATE OR REPLACE FUNCTION public.get_my_institution_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER -- Clave: Ignora RLS
SET search_path = public
STABLE
AS $$
  SELECT institution_id 
  FROM user_institutions 
  WHERE user_id = auth.uid() 
  AND is_primary = true 
  LIMIT 1;
$$;
```

#### 2. Usar SOLO estas funciones en las Políticas
En lugar de hacer `JOIN` o `SELECT` directos a otras tablas, llama a las funciones.

**INCORRECTO (Causa Recursión):**
```sql
CREATE POLICY "Ver usuarios" ON public.users
FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_institutions ui WHERE ui.user_id = auth.uid() ...)
);
```

**CORRECTO (Seguro):**
```sql
CREATE POLICY "Ver usuarios" ON public.users
FOR SELECT USING (
  -- Usamos la función segura que ya obtuvo el dato sin activar RLS
  EXISTS (
    SELECT 1 FROM user_institutions ui
    WHERE ui.user_id = users.id
    AND ui.institution_id = (SELECT public.get_my_institution_id())
  )
);
```

## 📋 Checklist para Modificar Permisos

Antes de aplicar cambios en RLS, verifica:

1.  [ ] **¿Estoy consultando otra tabla en la política?** Si sí, ¿esa tabla tiene RLS activado?
2.  [ ] **¿Esa otra tabla podría consultar de vuelta a la tabla actual?** (Ej. `users` <-> `user_institutions`).
3.  [ ] **Si hay riesgo de ciclo:** Crea una función `SECURITY DEFINER` para obtener el dato necesario.
4.  [ ] **Admin Global:** Recuerda que el Admin Global a menudo **NO** tiene registros en tablas auxiliares (como `user_institutions`). Usa `get_my_role()` para darle acceso directo sin depender de otras tablas.

---
**Script de Referencia:** `sql_scripts/restore_all_roles_visibility.sql` contiene la implementación correcta y segura de este patrón para el sistema actual.
