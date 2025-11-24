# Guía de Diagnóstico: Error de Token de Google Drive

## Error
"No se pudo obtener token de acceso de Google Drive. El usuario debe conectar su cuenta de Google Drive."

## Pasos para Identificar el Problema Real

### Paso 1: Verificar Logs de la Cloud Function

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `eduspark-py`
3. Ve a **Functions** → **processFileJob** → **Logs**
4. Busca el log más reciente que contenga:
   - `🔍 Buscando token de Google Drive para userId:`
   - `❌ No se encontró token de Google Drive`
   - `✅ Token encontrado`

### Paso 2: Verificar Tokens en Supabase

Ejecuta esta consulta en el SQL Editor de Supabase:

```sql
SELECT 
  id,
  user_id,
  service_type,
  expires_at,
  created_at,
  CASE 
    WHEN expires_at IS NULL THEN 'No expira'
    WHEN expires_at > NOW() THEN 'Válido'
    ELSE 'Expirado'
  END as estado
FROM user_google_tokens
WHERE user_id = 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e'  -- Tu user ID
ORDER BY created_at DESC;
```

### Paso 3: Verificar Secrets de Firebase

Ejecuta en la terminal:

```bash
firebase functions:secrets:access SUPABASE_URL
firebase functions:secrets:access SUPABASE_SERVICE_ROLE_KEY
```

Verifica que ambos estén configurados correctamente.

### Paso 4: Usar Script de Diagnóstico

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Obtener las credenciales desde el código
const supabaseUrl = 'https://mckfscukxcqwntpjagar.supabase.co';
const userId = 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e'; // Tu user ID

// Cargar el script de diagnóstico
const script = document.createElement('script');
script.src = '/scripts/diagnostico-token-drive.js';
script.onload = () => {
  // Necesitarás el Service Role Key para esto
  // diagnosticarTokenDrive(userId, supabaseUrl, serviceRoleKey);
};
document.head.appendChild(script);
```

### Paso 5: Verificar desde el Frontend

En la consola del navegador, ejecuta:

```javascript
// Verificar si el usuario tiene token
const { data: tokens } = await supabase
  .from('user_google_tokens')
  .select('*')
  .eq('user_id', 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e');

console.log('Tokens del usuario:', tokens);
```

## Posibles Causas y Soluciones

### Causa 1: Token no existe
**Síntoma**: Los logs muestran "No se encontró ningún token para este usuario"
**Solución**: 
- Ir al perfil del usuario
- Conectar Google Drive
- Asegurarse de autorizar los permisos de Drive

### Causa 2: Token existe pero con service_type incorrecto
**Síntoma**: Los logs muestran tokens pero con `service_type='calendar'`
**Solución**:
- Desconectar Google desde el perfil
- Reconectar Google Drive específicamente
- Verificar que se guarde con `service_type='drive'` o `'both'`

### Causa 3: Token expirado sin refresh_token
**Síntoma**: Los logs muestran token expirado
**Solución**:
- Reconectar Google Drive para obtener nuevo refresh_token
- Asegurarse de autorizar con `prompt=consent` para obtener refresh_token

### Causa 4: Problema con Service Role Key
**Síntoma**: Los logs muestran errores 401 o 403 en las consultas
**Solución**:
- Verificar que `SUPABASE_SERVICE_ROLE_KEY` esté configurado en Firebase
- Verificar que la key sea correcta y tenga permisos

### Causa 5: Problema con RLS (Row Level Security)
**Síntoma**: Los logs muestran que no se encuentran tokens aunque existen
**Solución**:
- Verificar que las políticas RLS permitan acceso con Service Role Key
- El Service Role Key debería poder leer todos los tokens

## Verificación Rápida

Para verificar rápidamente si el problema es del frontend o backend:

1. **Frontend**: Abre la consola del navegador y verifica si puedes ver los tokens
2. **Backend**: Revisa los logs de Firebase Functions para ver qué está pasando

## Contacto

Si el problema persiste después de estos pasos, comparte:
- Los logs completos de la Cloud Function
- El resultado de la consulta SQL de tokens
- El userId del usuario afectado

