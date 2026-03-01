# Plan de Resolución: Usuarios Huérfanos

## 📋 Problema ACTUALIZADO (17 de Enero 2026)

### Estado Actual: **12 usuarios huérfanos** identificados

#### Desglose:
- ✅ **Originales (10):** 8 aún sin migrar, 2 ya migrados
- 🆕 **Nuevos (4):** Usuarios creados recientemente sin auth.users

### Usuarios sin migrar:

**Originales (8 de 10):**
1. `69c36c20-c0bf-4cc3-ba64-9d5909f6831c` - Alejandro Caceres
2. `13d689b8-afa9-4db5-b057-da7bbb5d84fb` - Florencia Delgado
3. `3076db90-51e1-4065-bb2d-d321ef6d7a48` - Eduardo Atobe
4. `9955437d-85e5-4c65-ba46-6752564cdb23` - **Paloma Ruiz Díaz** ⚠️
5. `afdcf53f-9256-44fd-afdd-e942647f20dc` - Sebastian Rios
6. `a7b71e72-e4c0-4916-9d1a-c175f0fd26e8` - Jose Jara
7. `85c02afb-0a6b-4a89-9e83-214955806909` - María Hidalgo
8. `ba7bfc03-1bab-47f0-9156-6b22c92b9191` - Deisy Piñanez

**Nuevos (4):**
9. `11215074-a65c-47c3-82cf-ea68b1afb679`
10. `81d98181-84d7-4b7e-844f-d4cb6c541e50`
11. `ac0e6e1f-c3ff-47bd-b864-cac642469c84`
12. `d4bc22f7-cf23-4329-9c90-a7001961d39f`

### Ya Migrados (2):
- ✅ `f709e31e-6d1e-4699-a0c6-4c453d8238bd` - Katherine Aquino
- ✅ `c53739e3-c227-4427-9801-67896d379972` - Andrea Schuartzman

---

## ✅ SOLUCIÓN 1: Migrar los 12 Usuarios (URGENTE)

### ⭐ Opción A: Usar Interfaz Web (MÁS FÁCIL - RECOMENDADO)

Se ha creado una página de administración especial para migrar usuarios con un solo clic:

#### Paso 1: Acceder a la página

```
http://localhost:5173/admin/migrate-orphan-users
```

O desde el menú de administración → **"Migrar Usuarios Huérfanos"**

#### Paso 2: Hacer clic en "🚀 Iniciar Migración"

La página automáticamente:
- ✅ Llama a la Edge Function `migrateUsersToAuth`
- ✅ Migra los 12 usuarios identificados
- ✅ Genera contraseñas (documento de identidad o `EduSpark2024!`)
- ✅ Muestra resultados detallados en tiempo real

#### Paso 3: Revisar resultados

La interfaz muestra:
- 📊 Resumen: cuántos migrados/omitidos/fallidos
- 📋 Detalles por usuario: estado y contraseña usada
- ✅ Acciones post-migración recomendadas

---

### Opción B: Usar Edge Function desde Terminal (Avanzado)

#### Paso 1: Verificar que la Edge Function esté desplegada

```bash
# Desde el directorio raíz del proyecto
cd c:\Users\ADMIN\Documents\ApplicandoLA-Lenovo\Oportunidad Negocios\eduspark

# Desplegar la función (si no lo está)
supabase functions deploy migrateUsersToAuth
```

#### Paso 2: Ejecutar la migración

**Opción 2.1: Desde el frontend (interfaz admin)**

Crear una página temporal en `/admin/migrate-users` que llame a:

```typescript
// Llamar a la Edge Function
const { data, error } = await supabase.functions.invoke('migrateUsersToAuth', {
  body: {
    userIds: [
      '69c36c20-c0bf-4cc3-ba64-9d5909f6831c', // alecaceres6@outlook.com
      'f709e31e-6d1e-4699-a0c6-4c453d8238bd', // katherineaquino2021@gmail.com
      'c53739e3-c227-4427-9801-67896d379972', // andreaschuartzman@icloud.com
      '13d689b8-afa9-4db5-b057-da7bbb5d84fb', // florenciadelgado061@gmail.com
      '3076db90-51e1-4065-bb2d-d321ef6d7a48', // eduatobe96@gmail.com
      '9955437d-85e5-4c65-ba46-6752564cdb23', // palomaruizdiaz96@gmail.com
      'afdcf53f-9256-44fd-afdd-e942647f20dc', // sebastian.riosv00@gmail.com
      'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8', // jaraorregojosesebastian@gmail.com
      '85c02afb-0a6b-4a89-9e83-214955806909', // otihidalgo9@gmail.com
      'ba7bfc03-1bab-47f0-9156-6b22c92b9191'  // deisypinhanez97@gmail.com
    ],
    useIdentityDocumentAsPassword: true, // Usa el documento de identidad como contraseña
    defaultPassword: 'EduSpark2024!' // Contraseña por defecto si no tienen documento
  }
});

console.log(data);
// Retorna: { migrated: 10, skipped: 0, failed: 0, results: [...] }
```

**Opción 2.2: Usando cURL (desde terminal)**

```bash
# Obtener tu token de sesión (debes estar logueado como admin)
# El token está en: localStorage.getItem('sb-[project-id]-auth-token')

curl -X POST \
  https://[TU_PROJECT_ID].supabase.co/functions/v1/migrateUsersToAuth \
  -H "Authorization: Bearer [TU_SESSION_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [
      "69c36c20-c0bf-4cc3-ba64-9d5909f6831c",
      "f709e31e-6d1e-4699-a0c6-4c453d8238bd",
      "c53739e3-c227-4427-9801-67896d379972",
      "13d689b8-afa9-4db5-b057-da7bbb5d84fb",
      "3076db90-51e1-4065-bb2d-d321ef6d7a48",
      "9955437d-85e5-4c65-ba46-6752564cdb23",
      "afdcf53f-9256-44fd-afdd-e942647f20dc",
      "a7b71e72-e4c0-4916-9d1a-c175f0fd26e8",
      "85c02afb-0a6b-4a89-9e83-214955806909",
      "ba7bfc03-1bab-47f0-9156-6b22c92b9191"
    ],
    "useIdentityDocumentAsPassword": true,
    "defaultPassword": "EduSpark2024!"
  }'
```

#### Paso 3: Verificar que funcionó

Ejecutar en Supabase SQL Editor:

```sql
-- Verificar que todos tienen auth.users
SELECT 
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    CASE 
        WHEN au.id IS NULL THEN '❌ Aún sin auth.users'
        ELSE '✅ Migrado correctamente'
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

**Resultado esperado:** Todos deben mostrar `✅ Migrado correctamente`

#### Paso 4: Comunicar contraseñas a los usuarios

Los usuarios podrán iniciar sesión con:
- **Email:** Su email registrado
- **Contraseña:** 
  - Si tienen `identity_document`: usar ese número
  - Si NO tienen: `EduSpark2024!`

---

### Opción B: Crear manualmente desde Supabase Dashboard

Si la Edge Function no está disponible:

1. Ir a **Supabase Dashboard → Authentication → Users**
2. Clic en **"Add User"** para cada uno
3. Ingresar:
   - Email: Email del usuario
   - Password: Una contraseña temporal
   - ✅ Marcar **"Auto Confirm User"**
4. Repetir para los 10 usuarios

**⚠️ PROBLEMA:** Los IDs de `auth.users` serán diferentes a los de `public.users`, causando desincronización.

---

## 🛡️ SOLUCIÓN 2: Prevenir Futuros Casos (IMPORTANTE)

### Paso 1: Deprecar la función RPC `create_bulk_users`

Crear script SQL:

```sql
-- sql_scripts/5_fixes/deprecate_create_bulk_users.sql

-- Renombrar función antigua para evitar uso accidental
ALTER FUNCTION public.create_bulk_users(JSONB) 
RENAME TO create_bulk_users_DEPRECATED;

-- Crear función nueva que retorna error
CREATE OR REPLACE FUNCTION public.create_bulk_users(p_users JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 
    'Esta función está deprecada. Usa la Edge Function "createBulkUsers" para crear usuarios. ' ||
    'Esta función solo crea en public.users y NO en auth.users, dejando usuarios que no pueden iniciar sesión.';
END;
$$;

COMMENT ON FUNCTION public.create_bulk_users IS 
'DEPRECADA: No usar. Esta función solo crea en public.users. Usa Edge Function createBulkUsers.';
```

### Paso 2: Asegurar que Edge Function esté desplegada

```bash
# Verificar que la función existe
supabase functions list

# Si no está, desplegarla
supabase functions deploy createBulkUsers

# Configurar variables de entorno (si no están)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[tu_service_role_key]
```

### Paso 3: Actualizar el frontend para NO usar fallback

Modificar `services/bulkUserImportService.ts`:

```typescript
export async function createBulkUsers(users: any[]) {
  // Remover el fallback a RPC
  const { data, error } = await supabase.functions.invoke('createBulkUsers', {
    body: { users }
  });
  
  if (error) {
    // ❌ NO usar fallback a RPC
    throw new Error(
      'Edge Function createBulkUsers no disponible. ' +
      'Verificar que esté desplegada antes de importar usuarios. ' +
      'Error: ' + error.message
    );
  }
  
  return data;
}
```

### Paso 4: Crear trigger de validación (preventivo)

```sql
-- sql_scripts/5_fixes/prevent_orphan_users_trigger.sql

-- Función que previene usuarios huérfanos
CREATE OR REPLACE FUNCTION prevent_orphan_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo verificar en INSERT (no en UPDATE)
  IF TG_OP = 'INSERT' THEN
    -- Si el usuario no existe en auth.users, rechazar
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
      RAISE WARNING 
        'Intento de crear usuario huérfano bloqueado. ID: %, Email: %. ' ||
        'Los usuarios deben crearse primero en auth.users usando la Edge Function createBulkUsers.',
        NEW.id, NEW.email;
      
      -- Opción 1: Bloquear completamente (estricto)
      -- RAISE EXCEPTION 'No se puede crear usuario en public.users sin auth.users';
      
      -- Opción 2: Permitir pero registrar (advertencia)
      -- Solo hacer log, permitir la operación
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS check_auth_user_exists ON public.users;
CREATE TRIGGER check_auth_user_exists
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION prevent_orphan_users();

COMMENT ON TRIGGER check_auth_user_exists ON public.users IS
'Previene la creación de usuarios huérfanos (usuarios en public.users sin auth.users)';
```

### Paso 5: Crear monitoreo automático

```sql
-- sql_scripts/6_monitoring/monitor_orphan_users.sql

-- Función que detecta usuarios huérfanos
CREATE OR REPLACE FUNCTION check_orphan_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  days_orphan INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pu.id,
    pu.email,
    pu.created_at,
    EXTRACT(DAY FROM NOW() - pu.created_at)::INTEGER as days_orphan
  FROM public.users pu
  LEFT JOIN auth.users au ON pu.id = au.id
  WHERE au.id IS NULL
  ORDER BY pu.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar periódicamente (manual o con cron)
SELECT * FROM check_orphan_users();
```

---

## 📊 Resumen de Acciones

| Acción | Prioridad | Estado |
|--------|-----------|--------|
| Migrar 10 usuarios con Edge Function | 🚨 URGENTE | Pendiente |
| Verificar migración exitosa | 🚨 URGENTE | Pendiente |
| Comunicar contraseñas | 🚨 URGENTE | Pendiente |
| Deprecar `create_bulk_users` RPC | ⚠️ ALTA | Pendiente |
| Desplegar `createBulkUsers` Edge Function | ⚠️ ALTA | Pendiente |
| Remover fallback en frontend | ⚠️ ALTA | Pendiente |
| Crear trigger de prevención | 📋 MEDIA | Opcional |
| Crear monitoreo automático | 📋 MEDIA | Opcional |

---

## 🎯 Orden de Ejecución Recomendado

1. **HOY - Resolver problema inmediato:**
   - ✅ Ejecutar migración con Edge Function
   - ✅ Verificar que funcionó
   - ✅ Comunicar contraseñas a usuarios

2. **ESTA SEMANA - Prevenir futuros casos:**
   - ✅ Deprecar función RPC
   - ✅ Asegurar Edge Function desplegada
   - ✅ Actualizar frontend

3. **PRÓXIMA SEMANA - Monitoreo:**
   - ✅ Implementar trigger de validación
   - ✅ Crear sistema de monitoreo

---

## 📞 ¿Necesitas Ayuda?

Si necesitas que te ayude a:
- Crear la página de migración en el frontend
- Ejecutar los scripts SQL
- Desplegar las Edge Functions
- Cualquier otro paso

Solo dime y lo hacemos juntos.
