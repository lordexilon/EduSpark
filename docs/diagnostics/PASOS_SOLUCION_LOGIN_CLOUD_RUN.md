# Solución: No Puedo Loguearme en Cloud Run

## Diagnóstico Realizado

✅ **Archivo `.env` existe y tiene las variables correctas**
✅ **`.gcloudignore` incluye el `.env` correctamente**
✅ **`Dockerfile-cloudrun` copia el `.env` antes del build**
✅ **Valores hardcodeados como fallback en `vite.config.ts`**

## Problema Identificado

El problema más probable es que **las URLs de redirect no están configuradas en Supabase**. Supabase requiere que configures explícitamente qué URLs pueden redirigir después de la autenticación.

## Solución: Configurar URLs en Supabase

### Paso 1: Acceder al Dashboard de Supabase

1. Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar
2. Inicia sesión si es necesario

### Paso 2: Configurar Site URL

1. En el menú lateral, haz clic en **Authentication**
2. Luego, selecciona **URL Configuration**
3. En el campo **Site URL**, ingresa:
   ```
   https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
   ```

### Paso 3: Configurar Redirect URLs

En el campo **Redirect URLs**, agrega **cada una de estas URLs en una línea separada**:

```
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/**
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/auth/callback
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/auth/confirm
```

**Importante:**
- Agrega cada URL en una línea separada
- El `/**` permite todas las rutas bajo ese dominio
- No agregues espacios extra
- Guarda los cambios haciendo clic en **Save**

### Paso 4: Esperar Propagación

Los cambios en Supabase pueden tardar **1-2 minutos** en propagarse. Espera un momento antes de probar.

### Paso 5: Probar Login

1. Abre tu aplicación: https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
2. Intenta iniciar sesión con un usuario existente
3. Si aún hay problemas, abre la consola del navegador (F12 → Console) para ver errores específicos

## Verificación Adicional

Si después de configurar las URLs el problema persiste:

### 1. Verificar Consola del Navegador

Abre la consola del navegador (F12 → Console) y busca:
- Errores relacionados con Supabase
- Errores de CORS
- Errores de "Invalid redirect URL"
- Errores de "Invalid API key"

### 2. Verificar Network Tab

En la pestaña **Network** (F12 → Network):
- Busca requests a `supabase.co` que fallen
- Verifica los códigos de estado (deben ser 200, no 403 o 401)
- Revisa los headers de las requests

### 3. Verificar Logs de Cloud Run

Ejecuta este comando para ver los logs del servicio:

```bash
gcloud run services logs read eduspark-frontend --region us-central1 --limit 50
```

### 4. Verificar Variables de Entorno en el Build

Las variables de entorno están correctamente configuradas:
- ✅ `VITE_SUPABASE_URL`: `https://mckfscukxcqwntpjagar.supabase.co`
- ✅ `VITE_SUPABASE_ANON_KEY`: Hardcodeada en `vite.config.ts` como fallback

## Errores Comunes

### Error: "Invalid redirect URL"
**Causa**: La URL de Cloud Run no está en la lista de redirects permitidos  
**Solución**: Agrega las URLs en Supabase (Paso 3)

### Error: CORS
**Causa**: Supabase bloquea requests desde el dominio  
**Solución**: Verifica que las URLs estén configuradas correctamente en Supabase

### Error: "Invalid API key"
**Causa**: La API key está incorrecta o no se está leyendo  
**Solución**: Verifica que las variables en `vite.config.ts` sean correctas (ya están verificadas ✅)

## Comandos Útiles

### Ver URL del servicio
```bash
gcloud run services describe eduspark-frontend --region us-central1 --format="value(status.url)"
```

### Ver logs en tiempo real
```bash
gcloud run services logs tail eduspark-frontend --region us-central1
```

### Ver estado del servicio
```bash
gcloud run services list --region us-central1
```

## Notas Importantes

1. **Los cambios en Supabase son inmediatos** - No necesitas redesplegar la aplicación
2. **Las variables de entorno están hardcodeadas en el build** - Están correctas ✅
3. **La URL debe coincidir exactamente** - Incluye `https://` y no agregues `/` al final (excepto en `/**`)
4. **Si cambias la URL de Cloud Run** - Debes actualizar las URLs en Supabase también

## Si el Problema Persiste

Si después de seguir todos estos pasos el problema persiste, proporciona:

1. **Captura de pantalla de la consola del navegador** (F12 → Console)
2. **Captura de la pestaña Network** mostrando requests fallidos
3. **Mensaje de error exacto** que aparece al intentar iniciar sesión
4. **Logs de Cloud Run** (si hay errores relevantes)

