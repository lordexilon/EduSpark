# Solución: 10 Usuarios Sin auth.users

## 📋 Problema Identificado

Se encontraron **10 usuarios** en `public.users` que no tienen registro en `auth.users`. Estos usuarios fueron creados recientemente (hace 13-21 horas) y no pueden autenticarse en el sistema.

### Lista de Usuarios Afectados

1. **alecaceres6@outlook.com** - Alejandro Caceres
2. **katherineaquino2021@gmail.com** - Katherine Aquino
3. **andreaschuartzman@icloud.com** - Andrea Schuartzman
4. **florenciadelgado061@gmail.com** - Florencia Delgado
5. **eduatobe96@gmail.com** - Eduardo Atobe
6. **palomaruizdiaz96@gmail.com** - Paloma Ruiz Díaz
7. **sebastian.riosv00@gmail.com** - Sebastian Rios
8. **jaraorregojosesebastian@gmail.com** - Jose Jara jaraorrego
9. **otihidalgo9@gmail.com** - María Hidalgo
10. **deisypinhanez97@gmail.com** - Deisy Piñanez

Todos son estudiantes (`role_name: "student"`).

## ✅ Solución

### Script SQL Creado

**`sql_scripts/5_fixes/create_auth_users_10_usuarios.sql`**

Este script:
- ✅ Verifica los datos de los 10 usuarios
- ✅ Genera JSON para Edge Function `createBulkUsers`
- ✅ Genera JSON para Supabase Admin API
- ✅ Verifica instituciones asignadas
- ✅ Incluye instrucciones paso a paso

### Pasos para Resolver

#### 1. Ejecutar el Script SQL

```sql
-- Ejecutar: sql_scripts/5_fixes/create_auth_users_10_usuarios.sql
```

Esto generará:
- Lista de usuarios con sus datos completos
- JSON listo para Edge Function (PASO 2)
- JSON listo para Admin API (PASO 3)
- Verificación de instituciones (PASO 4)

#### 2. Crear Usuarios en auth.users

**Opción A: Usar Edge Function (Recomendado) ⭐**

1. Copiar el JSON generado en el **PASO 2** del script
2. Ir a la página de importación masiva: `/admin/bulk-import`
3. O usar curl:

```bash
curl -X POST \
  https://[PROJECT].supabase.co/functions/v1/createBulkUsers \
  -H "Authorization: Bearer [SESSION_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"users": [PASTE_JSON_HERE]}'
```

**Opción B: Usar Supabase Admin API**

1. Copiar el JSON generado en el **PASO 3** del script
2. Para cada usuario, hacer una llamada:

```bash
curl -X POST \
  https://[PROJECT].supabase.co/auth/v1/admin/users \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "Password123!",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Nombre",
      "last_name": "Apellido"
    }
  }'
```

**Opción C: Usar Supabase Dashboard**

1. Ir a **Authentication > Users** en Supabase Dashboard
2. Clic en **"Add User"**
3. Ingresar email y contraseña
4. Marcar **"Auto Confirm User"**
5. Repetir para cada usuario

#### 3. Verificar Creación

Ejecutar la consulta de verificación al final del script:

```sql
-- Verificar que los usuarios fueron creados
SELECT 
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    CASE 
        WHEN au.id IS NULL THEN '❌ Aún sin auth.users'
        ELSE '✅ Creado en auth.users'
    END as estado
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE pu.id IN (
    '69c36c20-c0bf-4cc3-ba64-9d5909f6831c',
    'f709e31e-6d1e-4699-a0c6-4c453d8238bd',
    'c53739e3-c227-4427-9801-67896d379972',
    '13d689b8-afa9-4db5-b057-da7bbb5d84fb',
    '3076db90-51e1-4065-bb2d-d321ef6d7a48',
    '9955437d-85e5-4c65-ba46-6752564cdb23',
    'afdcf53f-9256-44fd-afdd-e942647f20dc',
    'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8',
    '85c02afb-0a6b-4a89-9e83-214955806909',
    'ba7bfc03-1bab-47f0-9156-6b22c92b9191'
)
ORDER BY pu.email;
```

## 🔍 Causa del Problema

Estos usuarios fueron creados por importación masiva **sin usar la Edge Function `createBulkUsers`**. Probablemente se usó la función RPC `create_bulk_users` que solo crea usuarios en `public.users` pero no en `auth.users`.

## ⚠️ Prevención Futura

Para evitar este problema en el futuro:

1. **Usar Edge Function `createBulkUsers`** para importación masiva
2. **Verificar que la Edge Function esté desplegada** antes de importar
3. **Usar el script de diagnóstico** regularmente:
   ```sql
   -- sql_scripts/4_diagnostics/verify_users_without_auth.sql
   ```

## 📚 Referencias

- **Script específico:** `sql_scripts/5_fixes/create_auth_users_10_usuarios.sql`
- **Script general:** `sql_scripts/5_fixes/create_auth_users_from_public.sql`
- **Diagnóstico:** `sql_scripts/4_diagnostics/verify_users_without_auth.sql`
- **Documentación:** `AI_CONTEXT/DIAGNOSTICO_USUARIOS_SIN_AUTH.md`
- **Edge Function:** `functions/createBulkUsers/index.ts`

## ✅ Resultado Esperado

Después de ejecutar la solución, todos los 10 usuarios deberían:
- ✅ Tener registro en `auth.users`
- ✅ Poder autenticarse en el sistema
- ✅ Mantener todos sus datos en `public.users`
- ✅ Mantener sus asignaciones a instituciones

