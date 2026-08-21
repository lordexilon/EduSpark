# Diagnóstico: Usuarios en public.users sin auth.users

## 📋 Problema

Usuarios creados por importación masiva pueden quedar solo en `public.users` sin su correspondiente registro en `auth.users`. Esto impide que los usuarios puedan autenticarse en el sistema.

## 🔍 Causa

Esto ocurre cuando:
1. La importación masiva se hace usando la función RPC `create_bulk_users` sin Edge Function
2. La Edge Function `createBulkUsers` no está desplegada o falla
3. Se crean usuarios directamente en `public.users` sin usar la API de Supabase

## ✅ Solución

### Scripts Creados

1. **`sql_scripts/4_diagnostics/verify_users_without_auth.sql`**
   - Diagnóstico completo de usuarios sin `auth.users`
   - Muestra estadísticas y detalles
   - Identifica usuarios por rol, fecha de creación, etc.

2. **`sql_scripts/5_fixes/create_auth_users_from_public.sql`**
   - Genera JSON para crear usuarios en `auth.users`
   - Prepara datos para Edge Function o Admin API
   - Verifica instituciones asignadas

### Pasos para Resolver

#### 1. Diagnosticar el Problema

```sql
-- Ejecutar: sql_scripts/4_diagnostics/verify_users_without_auth.sql
-- Esto mostrará todos los usuarios sin auth.users
```

#### 2. Generar Datos para Corrección

```sql
-- Ejecutar: sql_scripts/5_fixes/create_auth_users_from_public.sql
-- Esto generará JSON para crear usuarios en auth.users
```

#### 3. Crear Usuarios en auth.users

**Opción A: Usar Edge Function (Recomendado)**

1. Copiar el JSON generado en el PASO 4 del script
2. Llamar a la Edge Function `createBulkUsers` con ese JSON
3. La función creará usuarios en `auth.users` y actualizará `public.users`

**Opción B: Usar Supabase Admin API**

1. Usar el JSON generado en el PASO 2 del script
2. Llamar a la API de Supabase Admin:
   ```
   POST https://[PROJECT].supabase.co/auth/v1/admin/users
   Headers: {
     "Authorization": "Bearer [SERVICE_ROLE_KEY]",
     "Content-Type": "application/json"
   }
   Body: { "email": "...", "password": "...", "email_confirm": true, ... }
   ```

**Opción C: Eliminar Usuarios Huérfanos (si no son necesarios)**

```sql
DELETE FROM public.users 
WHERE id IN (
    SELECT pu.id 
    FROM public.users pu
    LEFT JOIN auth.users au ON pu.id = au.id
    WHERE au.id IS NULL
);
```

## 📊 Verificaciones

### Verificar Usuarios Sin auth.users

```sql
SELECT 
    COUNT(*) as usuarios_sin_auth
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;
```

### Verificar Usuarios Completos

```sql
SELECT 
    COUNT(*) as usuarios_completos
FROM public.users pu
INNER JOIN auth.users au ON pu.id = au.id
WHERE pu.id = au.id;
```

## ⚠️ Importante

1. **Los usuarios sin `auth.users` NO pueden autenticarse**
2. **Fueron creados probablemente por importación masiva sin Edge Function**
3. **Para crear en `auth.users`, se requiere `service_role_key` (Admin API)**
4. **La Edge Function `createBulkUsers` es la forma más segura**
5. **Verificar que los usuarios tengan institución asignada antes de crear `auth.users`**

## 🔗 Referencias

- **Diagnóstico:** `sql_scripts/4_diagnostics/verify_users_without_auth.sql`
- **Corrección:** `sql_scripts/5_fixes/create_auth_users_from_public.sql`
- **Edge Function:** `functions/createBulkUsers/index.ts`
- **Documentación:** `AI_CONTEXT/04_FEATURES/SISTEMA_IMPORTACION_MASIVA_USUARIOS.md`
- **Script inverso:** `sql_scripts/5_fixes/sync_auth_users_to_public_users.sql` (crea public.users desde auth.users)

## 📝 Notas

- El script de diagnóstico es seguro y solo lee datos
- El script de corrección genera JSON pero NO modifica datos directamente
- Para crear usuarios en `auth.users`, se debe usar Admin API o Edge Function
- Siempre verificar antes de eliminar usuarios

