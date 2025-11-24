# Configurar Variables de Entorno en Cloud Functions

## Problema

La Cloud Function necesita las credenciales de Google OAuth (`GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`) para poder usar el token de acceso del usuario.

## Solución: Configurar Variables de Entorno

### Opción 1: Usando Firebase CLI (Recomendado)

1. **Obtener tus credenciales de Google OAuth**:
   - Ve a tu archivo `.env` local
   - Busca `VITE_GOOGLE_CLIENT_ID` y `VITE_GOOGLE_CLIENT_SECRET`
   - Copia estos valores

2. **Configurar las variables en Firebase**:

```bash
# Configurar GOOGLE_CLIENT_ID
firebase functions:config:set google.client_id="TU_CLIENT_ID_AQUI"

# Configurar GOOGLE_CLIENT_SECRET
firebase functions:config:set google.client_secret="TU_CLIENT_SECRET_AQUI"
```

**Nota**: En Firebase Functions v2, las variables de entorno se configuran de manera diferente. Usa:

```bash
# Para Firebase Functions v2, usa --set-env-vars
firebase functions:secrets:set GOOGLE_CLIENT_ID
firebase functions:secrets:set GOOGLE_CLIENT_SECRET
```

O mejor aún, usa el método de variables de entorno de Cloud Functions:

```bash
# Configurar variables de entorno para la función analyzeFile
gcloud functions deploy analyzeFile \
  --set-env-vars GOOGLE_CLIENT_ID=TU_CLIENT_ID,GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET \
  --region=us-central1
```

### Opción 2: Desde Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto **eduspark-py**
3. Ve a **Functions** > **analyzeFile**
4. Haz clic en **"Edit"** o **"Configuration"**
5. Ve a la pestaña **"Environment variables"** o **"Secrets"**
6. Agrega:
   - `GOOGLE_CLIENT_ID` = tu client ID
   - `GOOGLE_CLIENT_SECRET` = tu client secret
7. Guarda y espera a que se actualice la función

### Opción 3: Usando Secret Manager (Más Seguro)

Para información sensible como `GOOGLE_CLIENT_SECRET`, es mejor usar Secret Manager:

```bash
# Crear secret en Secret Manager
echo -n "TU_CLIENT_SECRET" | gcloud secrets create google-client-secret --data-file=-

# Dar permisos a Cloud Functions
gcloud secrets add-iam-policy-binding google-client-secret \
  --member="serviceAccount:eduspark-py@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Luego, en el código de la función, accede al secret:

```typescript
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();
const [version] = await client.accessSecretVersion({
  name: 'projects/eduspark-py/secrets/google-client-secret/versions/latest',
});
const clientSecret = version.payload.data.toString();
```

## Verificar Configuración

Después de configurar las variables, verifica que estén disponibles:

```bash
# Ver variables configuradas
firebase functions:config:get
```

O desde la consola de Firebase, verifica en la configuración de la función.

## Valores Necesarios

Basándote en tu archivo `.env`, necesitas:

- `GOOGLE_CLIENT_ID`: El valor de `VITE_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`: El valor de `VITE_GOOGLE_CLIENT_SECRET`

**Ejemplo** (de tu configuración):
```
GOOGLE_CLIENT_ID=468517556859-qtbplkfnqqc6ru8ga7o3d1npo76t1b62.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

## Nota Importante

⚠️ **Nunca expongas estos valores en el código fuente**. Siempre usa variables de entorno o Secret Manager.

