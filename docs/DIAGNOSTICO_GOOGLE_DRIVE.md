# Diagnóstico de Error: Token de Google Drive

## Problema
Error: "No se pudo obtener token de acceso de Google Drive. El usuario debe conectar su cuenta de Google Drive."

## Posibles Causas

### 1. Token no guardado en Supabase
El usuario puede haber autorizado Google Drive en el frontend, pero el token no se guardó correctamente en la base de datos.

**Solución:**
- Ir al perfil y desconectar/reconectar Google Drive
- Verificar en la consola del navegador que el token se guardó correctamente

### 2. Token guardado con `service_type` incorrecto
El token puede estar guardado pero con `service_type='calendar'` en lugar de `'drive'` o `'both'`.

**Solución:**
- Verificar en Supabase la tabla `user_google_tokens`
- Si el token tiene `service_type='calendar'`, el usuario debe autorizar Google Drive específicamente

### 3. Problema con las credenciales de Supabase en Cloud Functions
La Cloud Function puede no tener acceso correcto a Supabase.

**Solución:**
- Verificar que las variables de entorno `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` estén configuradas en Firebase Functions
- Verificar los logs de la Cloud Function para ver errores de autenticación

## Pasos de Diagnóstico

### Paso 1: Verificar tokens en Supabase

Ejecuta esta consulta en el SQL Editor de Supabase:

```sql
SELECT 
  id,
  user_id,
  service_type,
  expires_at,
  created_at,
  updated_at,
  CASE 
    WHEN expires_at IS NULL THEN 'No expira'
    WHEN expires_at > NOW() THEN 'Válido'
    ELSE 'Expirado'
  END as estado
FROM user_google_tokens
WHERE user_id = 'TU_USER_ID_AQUI'
ORDER BY created_at DESC;
```

**Reemplaza `TU_USER_ID_AQUI` con tu ID de usuario.**

### Paso 2: Verificar si el usuario tiene tokens

Si no hay tokens, el usuario necesita:
1. Ir a su perfil
2. Conectar Google Drive
3. Autorizar los permisos necesarios

### Paso 3: Verificar logs de Cloud Functions

En Firebase Console, ve a Functions > processFileJob > Logs y busca:
- `🔍 Buscando token de Google Drive para userId:`
- `❌ No se encontró token de Google Drive`
- `✅ Token encontrado`

### Paso 4: Verificar configuración de OAuth

Asegúrate de que:
1. Los scopes incluyan `https://www.googleapis.com/auth/drive`
2. El `service_type` se guarde como `'drive'` o `'both'`

## Solución Rápida

Si el usuario ve los archivos pero sigue el error:

1. **Desconectar Google Drive desde el perfil**
2. **Reconectar Google Drive** asegurándote de autorizar los permisos de Drive
3. **Verificar en Supabase** que el token se guardó con `service_type='drive'` o `'both'`

## Verificación en Código

El token se guarda correctamente si:
- En `GoogleOAuthCallbackPage.tsx`, el log muestra: `✅ OAuth Callback: Tokens guardados exitosamente`
- El `service_type` es `'drive'` o `'both'`
- El `expires_at` está en el futuro

## Contacto

Si el problema persiste después de estos pasos, revisa los logs completos de la Cloud Function y comparte:
- El userId del usuario
- Los logs de la función `getGoogleDriveToken`
- El resultado de la consulta SQL de tokens

