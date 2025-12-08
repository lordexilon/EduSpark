# Solución Final: Invalid API Key en Cloud Run

**Fecha:** 2 de Diciembre, 2025  
**Problema:** Error "Invalid API key" al intentar login en Cloud Run  
**Estado:** ✅ Resuelto

## Problema Identificado

Al intentar iniciar sesión en la aplicación desplegada en Cloud Run, se recibía el error:

```
POST https://mckfscukxcqwntpjagar.supabase.co/auth/v1/token?grant_type=password 401 (Unauthorized)
❌ Error en Supabase Auth signInWithPassword:
   - Código: 401
   - Mensaje: Invalid API key
```

## Causa Raíz

El problema tenía **dos causas**:

### 1. Variables de entorno no se pasaban al Dockerfile

El archivo `.env` no se estaba incluyendo correctamente en el contexto de Cloud Build, por lo que las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` no estaban disponibles durante el build.

### 2. `vite.config.ts` priorizaba `loadEnv` sobre `process.env` (CRÍTICO)

El `vite.config.ts` usaba esta configuración:

```typescript
// ❌ INCORRECTO
const env = loadEnv(mode, '.', '');
'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
  env.VITE_SUPABASE_URL ||           // ❌ Lee de .env primero
  process.env?.VITE_SUPABASE_URL ||  // ✅ Debería leer de aquí primero
  'https://...'
)
```

Esto significaba que incluso si las variables se establecían como `ENV` en el Dockerfile, `vite.config.ts` intentaba leerlas primero del archivo `.env` (que no existía en el contenedor), y luego de `process.env`. Como el archivo `.env` no estaba presente, las variables quedaban como `undefined`.

## Solución Implementada

### Paso 1: Agregar variables de entorno en `Dockerfile-cloudrun`

```dockerfile
# Argumentos de build para variables de entorno
ARG VITE_SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co
ARG VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8

# Convertir ARG a ENV para que Vite las lea durante el build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
```

### Paso 2: Corregir `vite.config.ts` para priorizar `process.env`

**Archivo:** `vite.config.ts`

**Cambio:**

```typescript
// ✅ CORRECTO - Priorizar process.env sobre env de loadEnv
define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
    process.env.VITE_SUPABASE_URL ||  // ✅ Lee de ENV primero (Dockerfile)
    env.VITE_SUPABASE_URL ||           // Luego de .env (localhost)
    'https://mckfscukxcqwntpjagar.supabase.co' // Fallback
  ),
  'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
    process.env.VITE_SUPABASE_ANON_KEY ||  // ✅ Lee de ENV primero
    env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  ),
}
```

**¿Por qué funciona?**

1. **En Cloud Run (producción)**: `process.env.VITE_SUPABASE_URL` está definido por el `ENV` del Dockerfile, por lo que se usa ese valor.
2. **En localhost (desarrollo)**: `process.env.VITE_SUPABASE_URL` no está definido, por lo que se usa `env.VITE_SUPABASE_URL` del archivo `.env` local.
3. **Fallback**: Si ninguno está definido, se usa el valor hardcodeado.

## Configuración Adicional: Redirect URLs en Supabase

Además de la corrección del código, se configuraron las **Redirect URLs en Supabase**:

**Ubicación:** https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/auth/url-configuration

**Site URL:**
```
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
```

**Redirect URLs:**
```
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/**
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/auth/callback
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/auth/confirm
```

## Proceso de Despliegue

1. **Modificar `Dockerfile-cloudrun`** con las variables de entorno como ARG y ENV.
2. **Modificar `vite.config.ts`** para priorizar `process.env` sobre `env` de `loadEnv`.
3. **Ejecutar Cloud Build**:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```
4. **Esperar a que el servicio se actualice** (aproximadamente 1-2 minutos).
5. **Hacer HARD REFRESH en el navegador** (Ctrl + Shift + R) para limpiar la caché.
6. **Probar el login**.

## Resultado

✅ **Build exitoso**:
- Build ID: `74ead76c-45e2-4c9b-b806-5de949de88fd`
- Duración: 3M12S
- Estado: SUCCESS

✅ **Login funcionando**:
- Las variables de Supabase se compilan correctamente en el bundle.
- El error "Invalid API key" desaparece.
- Los usuarios pueden iniciar sesión correctamente.

## Archivos Modificados

1. **`Dockerfile-cloudrun`**: Agregadas variables de entorno como ARG y ENV
2. **`vite.config.ts`**: Cambiado el orden de prioridad para leer `process.env` primero

## Lecciones Aprendidas

1. **Orden de prioridad importa**: En `vite.config.ts`, el orden en que se leen las variables de entorno es crítico. Siempre priorizar `process.env` cuando se usan variables ENV en Docker.

2. **`loadEnv` vs `process.env`**:
   - `loadEnv(mode, '.', '')` lee del archivo `.env` en el sistema de archivos.
   - `process.env` lee de las variables de entorno del sistema (incluyendo las establecidas con `ENV` en Docker).

3. **Hard refresh necesario**: Después de cada despliegue, los usuarios deben hacer hard refresh (Ctrl + Shift + R) para limpiar la caché del navegador y cargar la nueva versión.

4. **Configuración de Supabase**: Las Redirect URLs deben configurarse en Supabase para cada dominio donde se despliega la aplicación.

## Comandos Útiles

### Ver logs del servicio
```bash
gcloud run services logs read eduspark-frontend --region us-central1 --limit 50
```

### Ver URL del servicio
```bash
gcloud run services describe eduspark-frontend --region us-central1 --format="value(status.url)"
```

### Rebuild y redespliegue
```bash
gcloud builds submit --config cloudbuild.yaml
```

### Ver revisiones del servicio
```bash
gcloud run revisions list --service eduspark-frontend --region us-central1 --limit 5
```

## Verificación

Para verificar que la solución funciona:

1. Abre: https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
2. Haz HARD REFRESH (Ctrl + Shift + R o Cmd + Shift + R en Mac)
3. Intenta iniciar sesión con un usuario válido
4. El login debería funcionar sin errores de "Invalid API key"
5. Abre la consola del navegador (F12 → Console) y verifica que no haya errores 401

## Conclusión

El problema se resolvió en dos pasos:

1. **Pasar las variables de entorno de Supabase como ENV en el Dockerfile** para que estén disponibles durante el build.
2. **Corregir `vite.config.ts` para priorizar `process.env` sobre `env` de `loadEnv`**, asegurando que las variables ENV del Dockerfile se lean correctamente.

Esta solución permite que la aplicación funcione tanto en desarrollo (leyendo del `.env` local) como en producción (leyendo de las variables ENV del Dockerfile).

