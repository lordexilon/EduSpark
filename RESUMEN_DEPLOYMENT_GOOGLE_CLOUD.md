# 📦 Resumen: Preparación para Google Cloud

## ✅ Lo que ya está preparado

Tu proyecto **ya tiene** la mayoría de archivos necesarios para deployment:

- ✅ `Dockerfile-cloudrun` - Dockerfile optimizado para Cloud Run
- ✅ `cloudbuild.yaml` - Configuración de Cloud Build
- ✅ `nginx-cloudrun.conf` - Configuración de Nginx
- ✅ `start-nginx.sh` - Script de inicio para Cloud Run
- ✅ `setup-secrets-and-deploy.sh` - Script para configurar secretos
- ✅ `deploy-rag-worker.sh` - Script para deployar el worker
- ✅ `deploy-google-cloud.sh` - Script completo de deployment (nuevo)

## 🎯 Pasos para Deployment

### Paso 1: Configuración Inicial (Solo una vez)

1. **Verificar Google Cloud SDK:**
   ```powershell
   gcloud --version
   ```

2. **Autenticarse:**
   ```powershell
   gcloud auth login
   ```

3. **Configurar proyecto:**
   ```powershell
   gcloud config set project eduspark-py
   ```

4. **Habilitar APIs necesarias:**
   ```powershell
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com secretmanager.googleapis.com --project=eduspark-py
   ```

### Paso 2: Crear Secretos (Solo una vez)

Los secretos almacenan información sensible de forma segura:

```powershell
# Supabase URL
echo "https://mckfscukxcqwntpjagar.supabase.co" | gcloud secrets create SUPABASE_URL --data-file=- --project=eduspark-py

# Otros secretos (reemplazar con tus valores reales)
echo "tu_service_key" | gcloud secrets create SUPABASE_SERVICE_KEY --data-file=- --project=eduspark-py
echo "tu_gemini_key" | gcloud secrets create GEMINI_API_KEY --data-file=- --project=eduspark-py
echo "tu_client_id" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=- --project=eduspark-py
echo "tu_client_secret" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=- --project=eduspark-py
```

**Verificar secretos creados:**
```powershell
gcloud secrets list --project=eduspark-py
```

### Paso 3: Deploy

#### Opción A: Usar Cloud Build (Recomendado)

```powershell
# Deploy completo con Cloud Build
gcloud builds submit --config cloudbuild.yaml --project=eduspark-py
```

#### Opción B: Deploy Manual

**Frontend:**
```powershell
# 1. Build y push
gcloud builds submit --tag gcr.io/eduspark-py/eduspark-frontend:latest --project=eduspark-py

# 2. Deploy
gcloud run deploy eduspark-frontend `
  --image gcr.io/eduspark-py/eduspark-frontend:latest `
  --platform managed `
  --region us-central1 `
  --project eduspark-py `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --cpu 1
```

**Worker:**
```powershell
cd src/workers/file-processing-worker
gcloud builds submit --tag gcr.io/eduspark-py/rag-processing-worker --project=eduspark-py
gcloud run deploy rag-processing-worker `
  --image gcr.io/eduspark-py/rag-processing-worker `
  --platform managed `
  --region us-central1 `
  --project eduspark-py `
  --memory 2Gi `
  --cpu 2 `
  --set-secrets="SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_KEY=SUPABASE_SERVICE_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

### Paso 4: Verificar Deployment

1. **Obtener URL del servicio:**
   ```powershell
   gcloud run services describe eduspark-frontend --platform managed --region us-central1 --project eduspark-py --format "value(status.url)"
   ```

2. **Verificar logs:**
   ```powershell
   gcloud run services logs read eduspark-frontend --platform managed --region us-central1 --project eduspark-py --limit 50
   ```

3. **Abrir en navegador** y verificar que carga correctamente

## 📋 Checklist Rápido

### Antes de Deploy

- [ ] Google Cloud SDK instalado
- [ ] Autenticado con `gcloud auth login`
- [ ] Proyecto configurado: `eduspark-py`
- [ ] APIs habilitadas (Cloud Run, Cloud Build, etc.)
- [ ] Secretos creados en Secret Manager
- [ ] Variables de entorno verificadas en `Dockerfile-cloudrun`

### Después de Deploy

- [ ] Frontend desplegado y accesible
- [ ] Worker desplegado (si aplica)
- [ ] URLs de producción guardadas
- [ ] OAuth redirect URIs actualizados en Google Console
- [ ] Logs verificados sin errores críticos
- [ ] Funcionalidad básica probada

## 🔗 Archivos y Documentación

### Scripts de Deployment

- `deploy-google-cloud.sh` - Script completo automatizado
- `setup-secrets-and-deploy.sh` - Configurar secretos
- `deploy-rag-worker.sh` - Deploy del worker

### Documentación Completa

- **`docs/GUIA_DEPLOYMENT_GOOGLE_CLOUD.md`** - Guía completa paso a paso
- **`docs/CHECKLIST_PRE_DEPLOYMENT.md`** - Checklist detallado
- **`DEPLOY_QUICK_START.md`** - Inicio rápido

### Archivos de Configuración

- `Dockerfile-cloudrun` - Build del frontend
- `cloudbuild.yaml` - Configuración de Cloud Build
- `nginx-cloudrun.conf` - Configuración de Nginx
- `start-nginx.sh` - Script de inicio

## ⚠️ Importante

### Variables de Entorno

Antes de deployar, verifica que todas las variables en `Dockerfile-cloudrun` estén actualizadas con valores reales o que uses secretos de Cloud Build.

### Costos

- **Free Tier:** 2 millones de requests/mes en Cloud Run
- **Costos estimados:** $5-15 USD/mes para uso bajo-medio
- **Más información:** Ver `docs/COSTOS_GEMINI_API.md`

### Seguridad

- ✅ No hardcodear API keys en el código
- ✅ Usar Secret Manager para valores sensibles
- ✅ Mantener `.env` en `.gitignore`
- ✅ Verificar permisos de Cloud Build

## 🆘 Solución de Problemas

### Error: "API not enabled"
```powershell
gcloud services enable [NOMBRE_API] --project=eduspark-py
```

### Error: "Permission denied"
```powershell
gcloud auth login
gcloud config set project eduspark-py
```

### Error: "Secret not found"
```powershell
# Verificar secretos
gcloud secrets list --project=eduspark-py

# Crear secreto faltante
echo "valor" | gcloud secrets create SECRET_NAME --data-file=- --project=eduspark-py
```

### Ver Logs de Deployment

```powershell
# Ver builds recientes
gcloud builds list --limit 5

# Ver logs de un build
gcloud builds log [BUILD_ID]

# Ver logs del servicio
gcloud run services logs read eduspark-frontend --limit 50
```

## 🚀 Próximos Pasos

1. **Revisar checklist completo:** `docs/CHECKLIST_PRE_DEPLOYMENT.md`
2. **Leer guía detallada:** `docs/GUIA_DEPLOYMENT_GOOGLE_CLOUD.md`
3. **Crear secretos** necesarios
4. **Ejecutar deployment**
5. **Verificar** que todo funcione

## 📞 Enlaces Útiles

- [Cloud Run Console](https://console.cloud.google.com/run?project=eduspark-py)
- [Cloud Build Console](https://console.cloud.google.com/cloud-build?project=eduspark-py)
- [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=eduspark-py)
- [Billing Dashboard](https://console.cloud.google.com/billing?project=eduspark-py)

---

**¿Listo para deployar?** Sigue la guía completa en `docs/GUIA_DEPLOYMENT_GOOGLE_CLOUD.md`

