# Configuración de Google OAuth para Calendar y Drive

Esta guía explica cómo configurar Google OAuth cuando tu aplicación está alojada en un servicio que proporciona subdominios (como Hostybee, Vercel, Netlify, etc.).

## 📋 Requisitos Previos

1. Cuenta de Google Cloud Platform
2. Proyecto creado en Google Cloud Console
3. Credenciales OAuth 2.0 configuradas

## 🔧 Configuración en Google Cloud Console

### Paso 1: Crear Credenciales OAuth 2.0

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Navega a **APIs & Services** > **Credentials**
4. Haz clic en **Create Credentials** > **OAuth client ID**
5. Si es la primera vez, configura la pantalla de consentimiento OAuth

### Paso 2: Configurar URLs de Redirección Autorizadas

En la configuración de tu OAuth Client ID, agrega las siguientes URLs en **Authorized redirect URIs**:

#### Para desarrollo local:
```
http://localhost:5173/auth/google/callback
```

#### Para producción (con tu dominio del prestador):
```
https://eduspark.auto.hostybee.com/auth/google/callback
```

**⚠️ Importante:** 
- La URL debe coincidir **exactamente** con la que uses en tu aplicación
- Incluye el protocolo (`https://` o `http://`)
- No incluyas una barra final (`/`) al final de la URL
- Si usas un subdominio del prestador de servicio, usa ese dominio completo

### Paso 3: Obtener Credenciales

Después de crear el OAuth Client ID, obtendrás:
- **Client ID**: Algo como `123456789-abcdefg.apps.googleusercontent.com`
- **Client Secret**: Una cadena secreta

## 🔐 Configuración en tu Aplicación

### Opción 1: Usar URL Dinámica (Recomendado para desarrollo)

Si no especificas `VITE_GOOGLE_REDIRECT_URI`, la aplicación usará automáticamente `window.location.origin`, lo que significa que funcionará en cualquier dominio donde esté desplegada.

**Ventajas:**
- Funciona automáticamente en cualquier dominio
- No necesitas cambiar la configuración al cambiar de entorno

**Desventajas:**
- Necesitas agregar cada dominio a Google Cloud Console

### Opción 2: Usar URL Configurada (Recomendado para producción)

Si tu prestador de servicio requiere usar un dominio específico, puedes configurarlo explícitamente:

1. Edita tu archivo `.env.local` o variables de entorno de producción:

```env
VITE_GOOGLE_CLIENT_ID=tu_client_id_aqui
VITE_GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
VITE_GOOGLE_REDIRECT_URI=https://eduspark.auto.hostybee.com/auth/google/callback
```

**Ventajas:**
- Control total sobre la URL de redirección
- Útil cuando el prestador de servicio requiere un dominio específico

**Desventajas:**
- Necesitas actualizar la configuración si cambias de dominio

## 📝 Variables de Entorno

Agrega estas variables a tu archivo `.env.local`:

```env
# Credenciales de Google OAuth
VITE_GOOGLE_CLIENT_ID=tu_client_id_aqui
VITE_GOOGLE_CLIENT_SECRET=tu_client_secret_secreto_aqui

# URL de redirección (opcional - solo si necesitas forzar un dominio específico)
VITE_GOOGLE_REDIRECT_URI=https://tu-dominio.com/auth/google/callback
```

## ✅ Verificación

Para verificar que la configuración es correcta:

1. **Verifica las URLs en Google Cloud Console:**
   - Deben coincidir exactamente con las que usas en tu aplicación
   - Incluye todas las variantes (desarrollo, staging, producción)

2. **Verifica las variables de entorno:**
   - Asegúrate de que `VITE_GOOGLE_CLIENT_ID` y `VITE_GOOGLE_CLIENT_SECRET` estén configuradas
   - Si usas `VITE_GOOGLE_REDIRECT_URI`, verifica que coincida con la URL en Google Cloud Console

3. **Prueba la conexión:**
   - Intenta conectar Google Calendar o Drive desde tu aplicación
   - Si hay errores, revisa la consola del navegador y los logs del servidor

## 🐛 Solución de Problemas

### Error: "redirect_uri_mismatch"

**Causa:** La URL de redirección en tu aplicación no coincide con la configurada en Google Cloud Console.

**Solución:**
1. Verifica la URL exacta que está usando tu aplicación (revisa los logs de la consola)
2. Asegúrate de que esa URL esté agregada en Google Cloud Console
3. Si usas `VITE_GOOGLE_REDIRECT_URI`, verifica que coincida exactamente

### Error: "invalid_client"

**Causa:** Las credenciales OAuth no están configuradas correctamente.

**Solución:**
1. Verifica que `VITE_GOOGLE_CLIENT_ID` y `VITE_GOOGLE_CLIENT_SECRET` estén configuradas
2. Asegúrate de que las credenciales sean correctas (copia y pega desde Google Cloud Console)
3. Verifica que no haya espacios adicionales en las variables de entorno

### La aplicación funciona en localhost pero no en producción

**Causa:** La URL de producción no está agregada en Google Cloud Console.

**Solución:**
1. Agrega la URL de producción a las **Authorized redirect URIs** en Google Cloud Console
2. Si usas un subdominio del prestador, usa ese dominio completo
3. Espera unos minutos después de agregar la URL (puede tomar tiempo en propagarse)

## 📚 Recursos Adicionales

- [Documentación de Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Guía de configuración de OAuth 2.0](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console](https://console.cloud.google.com/)

## 🔒 Seguridad

**⚠️ Importante:**
- **NUNCA** commits el archivo `.env.local` con credenciales reales
- Usa variables de entorno del servidor para producción
- Rota las credenciales si sospechas que han sido comprometidas
- El `VITE_GOOGLE_CLIENT_SECRET` se usa solo en el backend (si tienes uno), en el frontend solo necesitas el Client ID

