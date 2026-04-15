# Solución: Error "Invalid API key" en Cloud Run

## Problema Resuelto

El error "Invalid API key" ocurría porque el build en Cloud Run **no estaba usando las variables del archivo `.env`**, sino los valores hardcodeados en `vite.config.ts` que podían estar incorrectos o incompletos.

## Cambios Realizados

### 1. Actualización de `.gcloudignore`
- **Antes**: El archivo `.env` estaba excluido del build
- **Después**: El archivo `.env` ahora se incluye en el build (solo contiene variables `VITE_*` que son públicas)

### 2. Actualización de `Dockerfile-cloudrun`
- **Agregado**: Copia del archivo `.env` antes del build
- **Resultado**: Vite ahora lee las variables correctas del `.env` durante el build

### 3. Rebuild y Redespliegue
- **Build ID**: `45f91c8b-0aa1-4d85-b32a-cc9862f9c50b`
- **Estado**: ✅ Exitoso
- **Fecha**: 2025-12-02

## Verificación

El servicio ahora debería usar las variables correctas de Supabase:
- **URL**: `https://mckfscukxcqwntpjagar.supabase.co`
- **Anon Key**: La del archivo `.env` (208 caracteres)

## Próximo Paso: Configurar URLs en Supabase

Aunque el build ahora tiene las variables correctas, **aún necesitas configurar las URLs de redirect en Supabase**:

1. Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar
2. Navega a: **Authentication** → **URL Configuration**
3. **Site URL**: `https://eduspark-frontend-mcc5aevj6a-uc.a.run.app`
4. **Redirect URLs** (una por línea):
   ```
   https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
   https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/**
   https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/auth/callback
   https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/auth/confirm
   ```

## Probar el Servicio

1. Abre: https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
2. Intenta iniciar sesión con un usuario existente
3. Si aún hay error "Invalid API key", verifica:
   - Que las URLs estén configuradas en Supabase
   - Que la API key en `.env` sea la correcta
   - Revisa la consola del navegador (F12) para errores específicos

## Notas de Seguridad

- El archivo `.env` ahora se sube a Cloud Build, pero **solo contiene variables `VITE_*`** que son públicas por diseño
- Las variables `VITE_*` se compilan en el código JavaScript del frontend, por lo que son visibles en el navegador
- **NO** incluyas secrets privados (como service role keys) en variables `VITE_*`
- Para secrets privados, usa Secret Manager de GCP

## Si el Problema Persiste

1. **Verifica el build**: Revisa los logs del build para confirmar que el `.env` se leyó correctamente
2. **Verifica Supabase**: Asegúrate de que las URLs de redirect estén configuradas
3. **Verifica la API key**: Compara la key en `.env` con la que aparece en Supabase Dashboard → Settings → API
4. **Revisa logs del servicio**: 
   ```bash
   gcloud run services logs read eduspark-frontend --region us-central1 --limit 50
   ```

