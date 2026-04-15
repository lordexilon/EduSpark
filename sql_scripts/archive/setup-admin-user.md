# Configurar Usuario Administrador

## Pasos para crear un usuario administrador:

### 1. Crear usuario en Supabase Auth
1. Ve a la consola de Supabase
2. Navega a **Authentication > Users**
3. Haz clic en **"Add user"**
4. Completa los datos:
   - Email: `admin@eduspark.com`
   - Password: `admin123` (o la que prefieras)
   - Confirm password: `admin123`
5. Haz clic en **"Create user"**
6. **Copia el User ID** que se genera (necesitarás este ID)

### 2. Asignar rol de administrador
1. Ve a **SQL Editor** en Supabase
2. Ejecuta el siguiente script, reemplazando `USER_ID_AQUI` con el ID que copiaste:

```sql
-- Asignar rol de administrador al usuario
UPDATE public.users 
SET role_id = 1  -- ID del rol 'admin'
WHERE id = 'USER_ID_AQUI';

-- Si el usuario no existe en public.users, crearlo:
INSERT INTO public.users (id, email, first_name, last_name, role_id)
VALUES (
    'USER_ID_AQUI',
    'admin@eduspark.com',
    'Admin',
    'Sistema',
    1
)
ON CONFLICT (id) DO UPDATE SET
    role_id = 1;
```

### 3. Verificar configuración
```sql
-- Verificar que el usuario tiene rol de admin
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as role_name
FROM public.users u
JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'admin@eduspark.com';
```

### 4. Probar en la aplicación
1. Inicia sesión con `admin@eduspark.com` y tu contraseña
2. Deberías ver la interfaz de administrador con opciones adicionales
3. El sidebar mostrará "Admin" en lugar de "Docente"
4. Tendrás acceso a funciones administrativas adicionales

## Notas importantes:
- El rol 'admin' tiene ID = 1 (verificar en tabla roles)
- Los administradores pueden acceder a todas las funciones de docente
- Las funciones administrativas adicionales están marcadas como "En desarrollo"
