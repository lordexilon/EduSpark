# Guía para Importar Usuarios de Forma Segura

## Problemas Comunes al Importar Usuarios

Al importar usuarios, pueden ocurrir varios problemas:

1. **IDs diferentes**: Usuario existe en `public.users` con un ID, pero al crear en `auth.users` se genera un ID diferente
2. **Emails duplicados**: Un email existe en `auth.users` con un ID diferente al de `public.users`
3. **Usuarios huérfanos**: Usuario existe en `auth.users` pero no en `public.users` (o viceversa)
4. **Emails inválidos**: Usuarios con emails NULL, vacíos o con formato inválido
5. **Role_id inválido**: Usuarios con `role_id` que no existe en la tabla `roles`

## Proceso Recomendado

### Paso 1: Diagnosticar Problemas

Ejecutar primero el script de diagnóstico para identificar todos los problemas:

```sql
-- sql_scripts/5_fixes/diagnostico_problemas_importacion_usuarios.sql
```

Este script identifica:
- Usuarios en `public.users` sin `auth.users`
- Emails duplicados con IDs diferentes
- Usuarios en `auth.users` sin `public.users`
- Emails inválidos
- Role_ids inválidos

### Paso 2: Corregir Problemas

Ejecutar el script de corrección para solucionar los problemas identificados:

```sql
-- sql_scripts/5_fixes/corregir_problemas_antes_importar.sql
```

Este script:
- Elimina usuarios duplicados por email (mantiene el de `public.users`)
- Sincroniza usuarios de `auth.users` a `public.users`
- Identifica usuarios con emails inválidos
- Corrige `role_id` inválidos (asigna `student = 3` por defecto)
- Sincroniza emails entre `auth.users` y `public.users`

### Paso 3: Crear Usuarios de Forma Segura

Ejecutar el script de creación segura:

```sql
-- sql_scripts/5_fixes/create_auth_users_seguro.sql
```

Este script:
- Valida que los usuarios estén listos para importar
- Genera JSON con IDs específicos para usar con Supabase Admin API
- Incluye todas las validaciones necesarias

## Uso de Supabase Admin API

### Crear Usuario con ID Específico

⚠️ **IMPORTANTE**: Para mantener la consistencia, siempre especifica el `id` al crear usuarios:

```bash
curl -X POST \
  https://[PROJECT].supabase.co/auth/v1/admin/users \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "69c36c20-c0bf-4cc3-ba64-9d5909f6831c",
    "email": "usuario@ejemplo.com",
    "password": "Password123!",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Nombre",
      "last_name": "Apellido",
      "role_id": 3
    }
  }'
```

### Verificar Usuario Creado

Después de crear, verificar que el ID y email coincidan:

```sql
SELECT 
    pu.id as public_id,
    au.id as auth_id,
    pu.email as public_email,
    au.email as auth_email,
    CASE 
        WHEN au.id = pu.id AND au.email = pu.email THEN '✅ Correcto'
        ELSE '❌ Problema'
    END as estado
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE pu.email = 'usuario@ejemplo.com';
```

## Solución de Problemas

### Error: "User already exists"

**Causa**: El email ya existe en `auth.users` pero con un ID diferente.

**Solución**: 
1. Ejecutar `corregir_problemas_antes_importar.sql` para eliminar duplicados
2. O eliminar manualmente el usuario de `auth.users` con el ID incorrecto

### Error: "Invalid email"

**Causa**: El email no es válido (NULL, vacío, o formato inválido).

**Solución**: 
1. Verificar con `diagnostico_problemas_importacion_usuarios.sql`
2. Corregir o eliminar usuarios con emails inválidos

### Error: "ID already exists"

**Causa**: El ID ya existe en `auth.users`.

**Solución**: 
1. Verificar si es el mismo usuario (debe tener el mismo email)
2. Si es un duplicado, eliminar el usuario incorrecto

### Usuario creado pero con ID diferente

**Causa**: No se especificó el `id` al crear el usuario.

**Solución**: 
1. Eliminar el usuario de `auth.users` con el ID incorrecto
2. Recrear con el ID correcto usando Supabase Admin API

## Scripts Disponibles

1. **diagnostico_problemas_importacion_usuarios.sql**: Identifica todos los problemas
2. **corregir_problemas_antes_importar.sql**: Corrige problemas comunes
3. **create_auth_users_seguro.sql**: Crea usuarios de forma segura
4. **sync_auth_users_to_public_users.sql**: Sincroniza usuarios de `auth.users` a `public.users`
5. **delete_user_*.sql**: Scripts para eliminar usuarios específicos

## Mejores Prácticas

1. **Siempre diagnosticar primero**: Ejecutar el script de diagnóstico antes de importar
2. **Corregir problemas antes**: No intentar importar usuarios con problemas
3. **Usar IDs específicos**: Siempre especificar el `id` al crear usuarios en `auth.users`
4. **Verificar después**: Después de crear, verificar que los IDs y emails coincidan
5. **Usar transacciones**: Los scripts de corrección usan transacciones para poder revertir cambios

## Notas Importantes

- ⚠️ Los scripts de corrección usan `BEGIN`/`COMMIT` para poder revertir cambios si es necesario
- ⚠️ Algunas operaciones requieren permisos de `service_role` (especialmente eliminar de `auth.users`)
- ⚠️ Siempre hacer backup antes de ejecutar scripts de corrección
- ⚠️ El dashboard de Supabase NO permite especificar IDs manualmente, usar la API

