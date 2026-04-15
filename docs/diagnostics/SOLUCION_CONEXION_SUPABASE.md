# Solución: Usuarios no pueden conectarse - Configuración de Supabase

## Problema Identificado

Los usuarios no pueden conectarse porque la URL de Cloud Run **no está configurada en Supabase** como URL de redirect permitida.

## Solución Paso a Paso

### Paso 1: Acceder a la Configuración de Supabase

1. Ve a tu proyecto en Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/mckfscukxcqwntpjagar
   ```

2. Navega a: **Authentication** → **URL Configuration**

### Paso 2: Configurar Site URL

En el campo **Site URL**, agrega o verifica:
```
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
```

### Paso 3: Configurar Redirect URLs

En el campo **Redirect URLs**, agrega las siguientes URLs (una por línea):

```
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/**
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/auth/callback
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/auth/confirm
```

**Importante**: 
- Agrega cada URL en una línea separada
- El `/**` permite todas las rutas bajo ese dominio
- Guarda los cambios

### Paso 4: Verificar Configuración de CORS (Opcional)

Si aún hay problemas después de configurar las URLs:

1. Ve a **Settings** → **API**
2. En la sección **CORS**, verifica que esté permitido:
   ```
   https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
   ```

### Paso 5: Verificar Variables de Entorno

Las variables de Supabase están correctamente configuradas en el código:

- **URL**: `https://mckfscukxcqwntpjagar.supabase.co` ✅
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ✅

Estas se compilan en el build, así que están correctas en la aplicación desplegada.

## Verificación

Después de configurar las URLs en Supabase:

1. **Espera 1-2 minutos** para que los cambios se propaguen
2. Abre la aplicación: https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
3. Intenta iniciar sesión con un usuario existente
4. Abre la consola del navegador (F12 → Console) para ver si hay errores

## Errores Comunes y Soluciones

### Error: "Invalid redirect URL"
**Causa**: La URL de Cloud Run no está en la lista de redirects permitidos
**Solución**: Agrega la URL en Supabase (Paso 3)

### Error: CORS
**Causa**: Supabase bloquea requests desde el dominio
**Solución**: Configura CORS en Supabase (Paso 4)

### Error: "Invalid API key"
**Causa**: La API key está incorrecta
**Solución**: Verifica que las variables en `vite.config.ts` sean correctas

## Comandos para Verificar

### Ver logs del servicio
```bash
gcloud run services logs read eduspark-frontend --region us-central1 --limit 50
```

### Ver logs en tiempo real
```bash
gcloud run services logs tail eduspark-frontend --region us-central1
```

## URLs que Debes Configurar en Supabase

Copia y pega estas URLs en Supabase Dashboard:

```
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/**
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/auth/callback
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/auth/confirm
```

## Notas Importantes

1. **Los cambios en Supabase son inmediatos** - No necesitas redesplegar la aplicación
2. **Las variables de entorno están hardcodeadas en el build** - Están correctas
3. **La URL debe coincidir exactamente** - Incluye `https://` y no agregues `/` al final (excepto en `/**`)

## Si el Problema Persiste

1. **Verifica en la consola del navegador** (F12 → Console):
   - Busca errores relacionados con Supabase
   - Busca errores de CORS
   - Busca errores de "Invalid redirect URL"

2. **Verifica la red** (F12 → Network):
   - Busca requests a `supabase.co` que fallen
   - Verifica los códigos de estado (deben ser 200, no 403 o 401)

3. **Verifica la configuración de Supabase**:
   - Asegúrate de que las URLs estén guardadas correctamente
   - Verifica que no haya espacios extra o caracteres incorrectos

4. **Prueba con un usuario de prueba**:
   - Crea un usuario nuevo en Supabase
   - Intenta iniciar sesión con ese usuario
   - Si funciona, el problema puede ser con usuarios específicos

## Contacto

Si después de seguir estos pasos el problema persiste, proporciona:
- Captura de pantalla de la consola del navegador (F12)
- Captura de la pestaña Network mostrando requests fallidos
- Mensaje de error exacto que aparece al intentar iniciar sesión

