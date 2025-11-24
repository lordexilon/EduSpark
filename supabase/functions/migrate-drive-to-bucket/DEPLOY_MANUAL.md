# Despliegue Manual de la Edge Function

Si no tienes acceso a la CLI de Supabase o no tienes permisos de administrador, puedes desplegar la función manualmente desde el dashboard.

## Pasos para Desplegar Manualmente

### 1. Acceder al Dashboard de Supabase

Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/functions

### 2. Crear Nueva Función

1. Haz clic en **"Create a new function"** o **"New Function"**
2. Nombre de la función: `migrate-drive-to-bucket`
3. Selecciona el runtime: **Deno** (por defecto)

### 3. Copiar el Código

Copia todo el contenido del archivo `supabase/functions/migrate-drive-to-bucket/index.ts` y pégalo en el editor de código del dashboard.

### 4. Configurar Variables de Entorno

En la sección **"Environment Variables"** o **"Secrets"**, agrega:

- **GOOGLE_CLIENT_ID** = (tu Google OAuth Client ID)
- **GOOGLE_CLIENT_SECRET** = (tu Google OAuth Client Secret)

**Nota:** Puedes obtener estos valores de tu archivo `.env` local:
- `VITE_GOOGLE_CLIENT_ID` → `GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_CLIENT_SECRET` → `GOOGLE_CLIENT_SECRET`

### 5. Desplegar

Haz clic en **"Deploy"** o **"Save"**

### 6. Verificar Despliegue

Después del despliegue, deberías ver la función en la lista con estado **"Active"**

## Alternativa: Usar Supabase CLI con Token de Acceso

Si prefieres usar la CLI pero no tienes permisos, puedes intentar:

1. Generar un token de acceso personal en Supabase:
   - Ve a: https://supabase.com/dashboard/account/tokens
   - Crea un nuevo token

2. Usar el token para autenticarte:
   ```bash
   supabase login --token YOUR_ACCESS_TOKEN
   ```

3. Intentar vincular nuevamente:
   ```bash
   supabase link --project-ref mckfscukxcqwntpjagar
   ```

## Verificación Post-Despliegue

1. Ve a los logs de la función:
   https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/functions/migrate-drive-to-bucket/logs

2. Prueba la función desde el frontend:
   - Ve a `/teacher/materials`
   - Haz clic en "Migrar a Bucket" en un material con `sourceFileId`

3. Si hay errores, revisa los logs para ver qué está fallando

## Troubleshooting

### Error: "GOOGLE_CLIENT_ID no configurado"
- Verifica que las variables de entorno estén configuradas en el dashboard
- Asegúrate de que los nombres sean exactamente: `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`

### Error: "Token inválido"
- El usuario debe reconectar su cuenta de Google Drive desde el perfil
- Verifica que el token tenga los scopes correctos

### Error CORS
- Verifica que la función esté desplegada correctamente
- Los headers CORS ya están incluidos en el código

