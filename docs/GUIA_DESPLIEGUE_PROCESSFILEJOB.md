# Guía de Despliegue - processFileJob

## Problema del Timeout

Si encuentras un error de timeout durante el despliegue, puede ser temporal o relacionado con el análisis de otras funciones.

## Solución 1: Desplegar desde Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `eduspark-py`
3. Ve a **Functions** → **processFileJob**
4. Haz clic en **"Deploy"** o **"Edit"**
5. Sube el archivo compilado desde `functions/processFileJob/lib/index.js`

## Solución 2: Desplegar solo processFileJob (si es posible)

Si las otras funciones están causando el timeout, puedes intentar:

```bash
# Desde el directorio raíz del proyecto
cd functions/processFileJob
npm run build
cd ../..

# Intentar desplegar solo esta función
firebase deploy --only functions:processFileJob
```

## Solución 3: Verificar y corregir otras funciones

El timeout puede estar ocurriendo porque Firebase está analizando todas las funciones. Verifica que:

1. `functions/analyzeFile/index.ts` no tenga inicializaciones pesadas
2. `functions/createFileProcessingJob/index.ts` no tenga inicializaciones pesadas

## Solución 4: Desplegar manualmente usando gcloud

Si tienes acceso a gcloud CLI:

```bash
gcloud functions deploy processFileJob \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=functions/processFileJob \
  --entry-point=processFileJob \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.created" \
  --trigger-event-filters="database=(default)" \
  --trigger-event-filters="document=file_processing_jobs/{jobId}" \
  --memory=2GiB \
  --timeout=540s \
  --max-instances=10 \
  --set-secrets="SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

## Verificación Post-Despliegue

Después de desplegar, verifica que la función esté funcionando:

1. Ve a Firebase Console → Functions → processFileJob
2. Revisa los logs para ver si encuentra el token correctamente
3. Busca en los logs: `✅ Token de tipo "drive" encontrado`

## Cambios Realizados

La función ahora:
- ✅ Busca tokens de tipo "drive" primero
- ✅ Si no encuentra, busca tokens de tipo "both"
- ✅ Tiene logging detallado para diagnóstico
- ✅ Muestra todos los tokens del usuario para debugging

## Si el Problema Persiste

1. Verifica que los secrets estén configurados:
   ```bash
   firebase functions:secrets:access SUPABASE_URL
   firebase functions:secrets:access SUPABASE_SERVICE_ROLE_KEY
   firebase functions:secrets:access GEMINI_API_KEY
   ```

2. Revisa los logs de la función en Firebase Console
3. Verifica que el token exista en Supabase usando el script SQL de diagnóstico
