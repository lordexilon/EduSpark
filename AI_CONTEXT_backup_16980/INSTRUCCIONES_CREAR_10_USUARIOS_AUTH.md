# Instrucciones: Crear 10 Usuarios en auth.users

## 📋 Situación Actual

Todos los 10 usuarios aún están sin registro en `auth.users`. Necesitan ser creados para que puedan autenticarse.

## 🚀 Solución Rápida

### Paso 1: Generar el JSON

Ejecuta este script SQL para generar el JSON necesario:

```sql
-- sql_scripts/5_fixes/generate_json_10_usuarios.sql
```

Esto generará el JSON listo para usar.

### Paso 2: Crear Usuarios en auth.users

Tienes **3 opciones**:

---

## Opción 1: Usar Edge Function createBulkUsers (Recomendado) ⭐

### Si la Edge Function está desplegada:

1. **Obtener el JSON:**
   - Ejecuta `sql_scripts/5_fixes/generate_json_10_usuarios.sql`
   - Copia el resultado del primer query (json_completo_para_edge_function)

2. **Llamar a la Edge Function desde el frontend:**
   - Ve a `/admin/bulk-import`
   - O usa curl:

```bash
curl -X POST \
  https://[TU_PROJECT].supabase.co/functions/v1/createBulkUsers \
  -H "Authorization: Bearer [TU_SESSION_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      {
        "email": "alecaceres6@outlook.com",
        "password": null,
        "first_name": "Alejandro",
        "last_name": "Caceres",
        "role": "student",
        "institution_id": [ID_DE_INSTITUCION],
        "identity_document": null,
        "identity_document_type": null
      },
      ... (resto de usuarios)
    ]
  }'
```

---

## Opción 2: Usar Supabase Admin API

### Si tienes acceso a SERVICE_ROLE_KEY:

1. **Obtener el JSON:**
   - Ejecuta `sql_scripts/5_fixes/generate_json_10_usuarios.sql`
   - Usa el array de usuarios generado

2. **Para cada usuario, hacer una llamada:**

```bash
curl -X POST \
  https://[TU_PROJECT].supabase.co/auth/v1/admin/users \
  -H "Authorization: Bearer [TU_SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alecaceres6@outlook.com",
    "password": "Password123!",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Alejandro",
      "last_name": "Caceres"
    }
  }'
```

**Repetir para cada uno de los 10 usuarios.**

---

## Opción 3: Usar Supabase Dashboard (Manual)

### Si prefieres hacerlo manualmente:

1. Ve a **Supabase Dashboard > Authentication > Users**
2. Clic en **"Add User"**
3. Para cada usuario:
   - **Email:** [email del usuario]
   - **Password:** Genera una contraseña segura (puedes usar un generador)
   - Marca **"Auto Confirm User"**
   - Clic en **"Create User"**

**Repetir para los 10 usuarios:**
- alecaceres6@outlook.com
- andreaschuartzman@icloud.com
- deisypinhanez97@gmail.com
- eduatobe96@gmail.com
- florenciadelgado061@gmail.com
- jaraorregojosesebastian@gmail.com
- katherineaquino2021@gmail.com
- otihidalgo9@gmail.com
- palomaruizdiaz96@gmail.com
- sebastian.riosv00@gmail.com

---

## ⚠️ Importante

1. **Contraseñas:** Si usas Opción 2 o 3, necesitarás generar contraseñas. Puedes usar:
   - Un generador de contraseñas
   - O dejar que la Edge Function las genere automáticamente (Opción 1)

2. **IDs de Usuarios:** Los usuarios ya tienen IDs en `public.users`. Cuando los crees en `auth.users`, asegúrate de que usen el mismo ID, o la Edge Function lo manejará automáticamente.

3. **Instituciones:** Verifica que todos los usuarios tengan `institution_id` asignado antes de crear en `auth.users`.

---

## ✅ Verificación Post-Creación

Después de crear los usuarios, ejecuta:

```sql
-- Verificar que todos fueron creados
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

Todos deberían mostrar `✅ Creado en auth.users`.

---

## 📚 Referencias

- **Script de generación JSON:** `sql_scripts/5_fixes/generate_json_10_usuarios.sql`
- **Script completo:** `sql_scripts/5_fixes/create_auth_users_10_usuarios.sql`
- **Documentación:** `AI_CONTEXT/SOLUCION_10_USUARIOS_SIN_AUTH.md`

