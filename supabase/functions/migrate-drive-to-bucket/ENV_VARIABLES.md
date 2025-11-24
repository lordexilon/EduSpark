# Variables de Entorno Requeridas

## Para la Edge Function `migrate-drive-to-bucket`

Esta función requiere las siguientes variables de entorno configuradas en el dashboard de Supabase:

### Variables Requeridas

1. **GOOGLE_CLIENT_ID**
   - Descripción: Client ID de tu aplicación Google OAuth
   - Dónde obtenerlo: Google Cloud Console → APIs & Services → Credentials
   - Formato: `xxxxx.apps.googleusercontent.com`
   - Ejemplo: `468517556859-qtbplkfnqqc6ru8ga7o3d1npo76t1b62.apps.googleusercontent.com`

2. **GOOGLE_CLIENT_SECRET**
   - Descripción: Client Secret de tu aplicación Google OAuth
   - Dónde obtenerlo: Google Cloud Console → APIs & Services → Credentials
   - Formato: String alfanumérica
   - ⚠️ **IMPORTANTE**: Mantén este valor secreto

### Cómo Configurarlas en Supabase

1. Ve al dashboard de Supabase:
   https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/settings/functions

2. Busca la función `migrate-drive-to-bucket`

3. En la sección "Environment Variables", agrega:
   - `GOOGLE_CLIENT_ID` = (tu Client ID)
   - `GOOGLE_CLIENT_SECRET` = (tu Client Secret)

4. Haz clic en "Save" o "Deploy"

### Verificación

Después de configurar las variables, puedes verificar que estén correctas revisando los logs de la función cuando se ejecute. Si las variables no están configuradas, verás un error en los logs indicando que faltan.

### Notas Importantes

- Estas variables son **diferentes** de las que usas en el frontend (`.env.local`)
- Las Edge Functions de Supabase tienen su propio sistema de variables de entorno
- Las variables se configuran por función, no globalmente
- Si cambias las variables, necesitas redesplegar la función

### Scopes Requeridos en Google OAuth

Asegúrate de que tu aplicación Google OAuth tenga estos scopes habilitados:
- `https://www.googleapis.com/auth/drive.readonly` (mínimo para leer archivos)
- O `https://www.googleapis.com/auth/drive` (completo para leer y escribir)

### Troubleshooting

Si recibes error 401 "Invalid Credentials":
1. Verifica que las variables estén configuradas correctamente
2. Verifica que el Client ID y Secret sean los correctos
3. Verifica que el usuario tenga un token válido de Google Drive
4. Verifica que el token tenga los scopes correctos

