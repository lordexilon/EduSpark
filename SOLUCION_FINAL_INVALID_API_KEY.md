# Solución Final: Invalid API Key en Cloud Run

## Problema Identificado

Al intentar iniciar sesión en la aplicación desplegada en Cloud Run, se recibía el error:

```
POST https://mckfscukxcqwntpjagar.supabase.co/auth/v1/token?grant_type=password 401 (Unauthorized)
❌ Error en Supabase Auth signInWithPassword:
   - Código: 401
   - Mensaje: Invalid API key
```

## Causa Raíz

El archivo `.env` **NO se estaba incluyendo correctamente en el contexto de Cloud Build**, o **Vite no lo estaba leyendo durante el proceso de build**. Aunque el archivo `.env` existía localmente y se copiaba en el `Dockerfile`, las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` no se estaban compilando en el bundle de producción.

## Solución Implementada

### Cambio en `Dockerfile-cloudrun`

Se modificó el `Dockerfile-cloudrun` para pasar las variables de entorno directamente como **argumentos de build (ARG)** y luego convertirlas a **variables de entorno (ENV)** antes del `npm run build`:

```dockerfile
# Argumentos de build para variables de entorno
ARG VITE_SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co
ARG VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8

# Convertir ARG a ENV para que Vite las lea durante el build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
```

### ¿Por qué funciona esta solución?

1. **ARG**: Define argumentos de build que se pueden pasar al construir la imagen Docker.
2. **ENV**: Convierte los argumentos en variables de entorno que están disponibles durante la ejecución de comandos en el contenedor.
3. **Vite**: Lee las variables de entorno que comienzan con `VITE_` durante el `npm run build` y las compila directamente en el bundle de JavaScript.

De esta manera, las variables de Supabase se "hardcodean" en el bundle de producción, asegurando que estén disponibles cuando la aplicación se ejecute en el navegador del usuario.

## Configuración Adicional Requerida

Además de la corrección del `Dockerfile`, se configuraron las **Redirect URLs en Supabase**:

### URLs configuradas en Supabase Dashboard

**Ubicación**: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/auth/url-configuration

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

1. **Modificar `Dockerfile-cloudrun`** con las variables de entorno hardcodeadas.
2. **Ejecutar Cloud Build**:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```
3. **Esperar a que el servicio se actualice** (aproximadamente 1-2 minutos después del build exitoso).
4. **Probar el login** en la URL del servicio.

## Resultado

✅ **Build exitoso**:
- Build ID: `fd0fce13-f51e-437e-adfa-3a52fc9692ae`
- Duración: 3M58S
- Estado: SUCCESS

✅ **Login funcionando**:
- Los usuarios ahora pueden iniciar sesión correctamente en la aplicación desplegada en Cloud Run.
- Las variables de Supabase se compilan correctamente en el bundle.

## Notas Importantes

1. **Seguridad**: La `VITE_SUPABASE_ANON_KEY` es una clave pública diseñada para ser expuesta en el frontend. No es un secreto y es seguro incluirla en el código del cliente.

2. **Hardcodeo de variables**: Esta solución hardcodea las variables en el `Dockerfile`. Si necesitas cambiar las variables de Supabase en el futuro, deberás:
   - Actualizar el `Dockerfile-cloudrun`
   - Ejecutar un nuevo build con `gcloud builds submit`

3. **Alternativa con Cloud Build substitutions**: Si prefieres no hardcodear las variables en el `Dockerfile`, puedes usar las sustituciones de Cloud Build en `cloudbuild.yaml`, pero esto requiere configuración adicional.

## Archivos Modificados

- `Dockerfile-cloudrun`: Agregadas variables de entorno como ARG y ENV

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

## Verificación

Para verificar que la solución funciona:

1. Abre: https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
2. Intenta iniciar sesión con un usuario válido (ej: `albertovillalba@gmail.com`)
3. El login debería funcionar sin errores de "Invalid API key"
4. Abre la consola del navegador (F12 → Console) y verifica que no haya errores 401

## Conclusión

El problema se resolvió pasando las variables de entorno de Supabase directamente como variables de entorno en el `Dockerfile` antes del build de Vite, asegurando que se compilen correctamente en el bundle de producción. Además, se configuraron correctamente las URLs de redirect en Supabase para permitir la autenticación desde el dominio de Cloud Run.

