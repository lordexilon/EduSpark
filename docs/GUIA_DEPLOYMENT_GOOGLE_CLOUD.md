# 🚀 Guía Completa de Deployment a Google Cloud

Esta guía te ayudará a preparar y desplegar EduSpark a Google Cloud Run.

## 📋 Checklist Pre-Deployment

### 1. ✅ Requisitos Previos

- [ ] Cuenta de Google Cloud activa
- [ ] Proyecto creado en Google Cloud Console
- [ ] Facturación habilitada (necesaria aunque uses free tier)
- [ ] Google Cloud SDK instalado (`gcloud` CLI)
- [ ] Autenticación configurada: `gcloud auth login`
- [ ] Proyecto configurado: `gcloud config set project eduspark-py`

### 2. ✅ APIs Habilitadas

Habilita las siguientes APIs en Google Cloud Console:

```bash
# Desde la terminal con gcloud CLI
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project=eduspark-py
```

O desde la consola web:
- [Cloud Run API](https://console.cloud.google.com/marketplace/product/google/run.googleapis.com)
- [Cloud Build API](https://console.cloud.google.com/marketplace/product/google/cloudbuild.googleapis.com)
- [Container Registry API](https://console.cloud.google.com/marketplace/product/google/containerregistry.googleapis.com)
- [Secret Manager API](https://console.cloud.google.com/marketplace/product/google/secretmanager.googleapis.com)

### 3. ✅ Variables de Entorno Preparadas

Verifica que tengas todas las variables de entorno necesarias:

**Frontend (Vite):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_CLIENT_SECRET`
- `VITE_GOOGLE_REDIRECT_URI`
- `VITE_FIREBASE_*` (varias variables)
- `VITE_ANALYZE_FILE_URL`
- `VITE_CREATE_JOB_URL`
- `VITE_CHANGE_PASSWORD_URL`
- `VITE_CONFIRM_EMAIL_URL`

**Backend/Worker:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## 🔐 Paso 1: Configurar Secretos en Secret Manager

### Opción A: Usar el Script Automatizado

1. **Edita el script** `setup-secrets-and-deploy.sh` con tus valores reales
2. **Ejecuta:**

```bash
chmod +x setup-secrets-and-deploy.sh
./setup-secrets-and-deploy.sh
```

### Opción B: Crear Secretos Manualmente

```bash
# Configurar proyecto
gcloud config set project eduspark-py

# Crear secretos uno por uno
echo -n "tu_valor_aqui" | gcloud secrets create SECRET_NAME \
  --data-file=- \
  --project=eduspark-py \
  --replication-policy="automatic"
```

**Secretos necesarios:**

```bash
# Supabase
echo -n "https://mckfscukxcqwntpjagar.supabase.co" | \
  gcloud secrets create SUPABASE_URL --data-file=-

echo -n "tu_service_role_key" | \
  gcloud secrets create SUPABASE_SERVICE_KEY --data-file=-

# Gemini
echo -n "tu_gemini_api_key" | \
  gcloud secrets create GEMINI_API_KEY --data-file=-

# Google OAuth
echo -n "tu_google_client_id" | \
  gcloud secrets create GOOGLE_CLIENT_ID --data-file=-

echo -n "tu_google_client_secret" | \
  gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
```

### Verificar Secretos Creados

```bash
gcloud secrets list --project=eduspark-py
```

## 🏗️ Paso 2: Configurar Cloud Build

### Verificar cloudbuild.yaml

El archivo `cloudbuild.yaml` está configurado para:
- Build de la imagen Docker
- Push a Container Registry
- Deploy a Cloud Run

**Variables importantes a verificar:**
- `PROJECT_ID`: Debe ser `eduspark-py`
- `REGION`: Actualmente `us-central1` (puedes cambiarlo)
- Recursos: 512Mi memoria, 1 CPU

### Configurar Permisos de Cloud Build

```bash
# Otorgar permisos a Cloud Build
PROJECT_NUMBER=$(gcloud projects describe eduspark-py --format="value(projectNumber)")

gcloud projects add-iam-policy-binding eduspark-py \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding eduspark-py \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

## 🐳 Paso 3: Configurar Dockerfile

### Verificar Dockerfile-cloudrun

El Dockerfile usa multi-stage build:
1. **Stage 1:** Build del frontend con Vite
2. **Stage 2:** Nginx para servir archivos estáticos

**Variables de entorno** se pasan como ARG durante el build.

### Actualizar Variables en Dockerfile

Edita `Dockerfile-cloudrun` y actualiza los valores por defecto si es necesario:

```dockerfile
ARG VITE_SUPABASE_URL=tu_valor
ARG VITE_GEMINI_API_KEY=tu_valor
# ... etc
```

**⚠️ IMPORTANTE:** Para producción, usa secretos de Cloud Build en lugar de valores hardcodeados.

## 📝 Paso 4: Preparar Variables de Entorno para Build

### Opción A: Usar Cloud Build Secrets (Recomendado)

Crea un archivo `cloudbuild-secrets.yaml`:

```yaml
steps:
  # Build con secretos
  - name: 'gcr.io/cloud-builders/docker'
    secretEnv: ['VITE_GEMINI_API_KEY', 'VITE_SUPABASE_URL']
    args:
      - 'build'
      - '--build-arg'
      - 'VITE_GEMINI_API_KEY=$$VITE_GEMINI_API_KEY'
      - '--build-arg'
      - 'VITE_SUPABASE_URL=$$VITE_SUPABASE_URL'
      # ... más args

availableSecrets:
  secretManager:
    - versionName: projects/eduspark-py/secrets/VITE_GEMINI_API_KEY/versions/latest
      env: 'VITE_GEMINI_API_KEY'
    - versionName: projects/eduspark-py/secrets/VITE_SUPABASE_URL/versions/latest
      env: 'VITE_SUPABASE_URL'
```

### Opción B: Usar Variables en Dockerfile (Desarrollo)

Actualiza directamente en `Dockerfile-cloudrun` (menos seguro).

## 🚢 Paso 5: Deploy del Frontend

### Opción A: Deploy Manual con Cloud Build

```bash
# Build y deploy con Cloud Build
gcloud builds submit \
  --config cloudbuild.yaml \
  --project eduspark-py
```

### Opción B: Deploy Directo con Docker

```bash
# 1. Build local
docker build \
  -f Dockerfile-cloudrun \
  -t gcr.io/eduspark-py/eduspark-frontend:latest \
  .

# 2. Push a Container Registry
docker push gcr.io/eduspark-py/eduspark-frontend:latest

# 3. Deploy a Cloud Run
gcloud run deploy eduspark-frontend \
  --image gcr.io/eduspark-py/eduspark-frontend:latest \
  --platform managed \
  --region us-central1 \
  --project eduspark-py \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300
```

### Opción C: Usar Script de Deployment

```bash
# Crear script de deployment
cat > deploy-frontend.sh << 'EOF'
#!/bin/bash
set -e

PROJECT_ID="eduspark-py"
SERVICE_NAME="eduspark-frontend"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Building and deploying frontend..."

# Build y push
gcloud builds submit --tag ${IMAGE_NAME} --project ${PROJECT_ID}

# Deploy
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1

echo "✅ Deployment completed!"
gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)'
EOF

chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

## 🔧 Paso 6: Deploy del Worker (RAG Processing)

```bash
# Usar el script existente
chmod +x deploy-rag-worker.sh
./deploy-rag-worker.sh
```

O manualmente:

```bash
cd src/workers/file-processing-worker

# Build y push
gcloud builds submit --tag gcr.io/eduspark-py/rag-processing-worker

# Deploy con secretos
gcloud run deploy rag-processing-worker \
  --image gcr.io/eduspark-py/rag-processing-worker \
  --platform managed \
  --region us-central1 \
  --project eduspark-py \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --set-secrets="SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_KEY=SUPABASE_SERVICE_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

## 🌐 Paso 7: Configurar URLs de Producción

Después del deployment, actualiza:

1. **URLs de Cloud Functions** en variables de entorno
2. **Redirect URIs** de Google OAuth en Google Cloud Console
3. **CORS** en Supabase si es necesario

### Actualizar Google OAuth Redirect URI

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** > **Credentials**
3. Edita tu **OAuth 2.0 Client ID**
4. Agrega la URL de producción a **Authorized redirect URIs**:
   ```
   https://eduspark-frontend-[hash]-uc.a.run.app/auth/google/callback
   ```

## ✅ Paso 8: Verificación Post-Deployment

### 1. Verificar Frontend

```bash
# Obtener URL del servicio
FRONTEND_URL=$(gcloud run services describe eduspark-frontend \
  --platform managed \
  --region us-central1 \
  --project eduspark-py \
  --format 'value(status.url)')

echo "Frontend URL: $FRONTEND_URL"

# Verificar que responde
curl -I $FRONTEND_URL
```

### 2. Verificar Worker

```bash
# Obtener URL del worker
WORKER_URL=$(gcloud run services describe rag-processing-worker \
  --platform managed \
  --region us-central1 \
  --project eduspark-py \
  --format 'value(status.url)')

# Health check
curl $WORKER_URL/health
```

### 3. Verificar Logs

```bash
# Logs del frontend
gcloud run services logs read eduspark-frontend \
  --platform managed \
  --region us-central1 \
  --project eduspark-py \
  --limit 50

# Logs del worker
gcloud run services logs read rag-processing-worker \
  --platform managed \
  --region us-central1 \
  --project eduspark-py \
  --limit 50
```

## 🔍 Troubleshooting

### Error: "Permission denied"

```bash
# Verificar autenticación
gcloud auth list

# Verificar proyecto
gcloud config get-value project

# Verificar permisos
gcloud projects get-iam-policy eduspark-py
```

### Error: "API not enabled"

```bash
# Habilitar APIs necesarias
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

### Error: "Secret not found"

```bash
# Listar secretos
gcloud secrets list

# Verificar permisos
gcloud secrets get-iam-policy SECRET_NAME
```

### Build Falla

1. Ver logs de Cloud Build:
   ```bash
   gcloud builds list --limit=5
   gcloud builds log [BUILD_ID]
   ```

2. Verificar que todas las variables estén definidas
3. Verificar que Dockerfile esté correcto

### Frontend no carga

1. Verificar logs de Cloud Run
2. Verificar que Nginx esté configurado correctamente
3. Verificar variables de entorno en el build

## 📊 Monitoreo

### Configurar Alertas

```bash
# Crear alerta de errores
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Cloud Run Errors" \
  --condition-threshold-value=1 \
  --condition-threshold-duration=300s
```

### Ver Métricas

- [Cloud Run Console](https://console.cloud.google.com/run)
- [Cloud Monitoring](https://console.cloud.google.com/monitoring)

## 🔄 Actualización de Deployment

### Deploy de Nueva Versión

```bash
# Opción 1: Con Cloud Build (recomendado)
gcloud builds submit --config cloudbuild.yaml

# Opción 2: Manual
docker build -f Dockerfile-cloudrun -t gcr.io/eduspark-py/eduspark-frontend:latest .
docker push gcr.io/eduspark-py/eduspark-frontend:latest
gcloud run deploy eduspark-frontend --image gcr.io/eduspark-py/eduspark-frontend:latest
```

### Rollback

```bash
# Listar revisiones
gcloud run revisions list --service eduspark-frontend

# Rollback a revisión anterior
gcloud run services update-traffic eduspark-frontend \
  --to-revisions REVISION_NAME=100
```

## 💰 Costos Estimados

### Cloud Run (Frontend)
- **Requests:** $0.40 por millón
- **CPU:** $0.00002400 por vCPU-segundo
- **Memoria:** $0.00000250 por GiB-segundo
- **Free Tier:** 2 millones de requests/mes

### Cloud Run (Worker)
- Similar al frontend, pero con más recursos
- **2Gi RAM, 2 CPU:** ~$0.05-0.10/hora si está activo

### Container Registry
- **Storage:** $0.026 por GB/mes
- **Free Tier:** 0.5 GB

**Estimado mensual (bajo tráfico):** $5-15 USD

## 🔗 Enlaces Útiles

- [Cloud Run Console](https://console.cloud.google.com/run)
- [Cloud Build Console](https://console.cloud.google.com/cloud-build)
- [Secret Manager](https://console.cloud.google.com/security/secret-manager)
- [Billing](https://console.cloud.google.com/billing)

## 📝 Checklist Final

- [ ] Todas las APIs habilitadas
- [ ] Secretos creados en Secret Manager
- [ ] Dockerfile configurado correctamente
- [ ] Variables de entorno preparadas
- [ ] Frontend desplegado y funcionando
- [ ] Worker desplegado y funcionando
- [ ] URLs de producción configuradas
- [ ] OAuth redirect URIs actualizados
- [ ] Logs verificados sin errores
- [ ] Pruebas de funcionalidad completadas

---

**¿Necesitas ayuda?** Revisa los logs con `gcloud run services logs read [SERVICE_NAME]`

