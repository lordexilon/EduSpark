# ✅ Checklist Pre-Deployment a Google Cloud

## 🔧 Configuración Inicial

### Google Cloud Setup
- [ ] Cuenta de Google Cloud creada
- [ ] Proyecto `eduspark-py` creado
- [ ] Facturación habilitada
- [ ] Google Cloud SDK instalado (`gcloud --version`)
- [ ] Autenticado con `gcloud auth login`
- [ ] Proyecto configurado: `gcloud config set project eduspark-py`

### APIs Habilitadas
- [ ] Cloud Run API
- [ ] Cloud Build API
- [ ] Container Registry API
- [ ] Secret Manager API
- [ ] Generative Language API (Gemini)

**Comando rápido:**
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  generativelanguage.googleapis.com \
  --project=eduspark-py
```

## 🔐 Secretos y Variables de Entorno

### Secretos en Secret Manager
- [ ] `SUPABASE_URL` creado
- [ ] `SUPABASE_SERVICE_KEY` creado
- [ ] `GEMINI_API_KEY` creado
- [ ] `GOOGLE_CLIENT_ID` creado
- [ ] `GOOGLE_CLIENT_SECRET` creado

**Verificar secretos:**
```bash
gcloud secrets list --project=eduspark-py
```

### Variables de Entorno del Frontend
Verifica que todas estas estén en `Dockerfile-cloudrun`:
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_GEMINI_API_KEY`
- [ ] `VITE_GOOGLE_CLIENT_ID`
- [ ] `VITE_GOOGLE_CLIENT_SECRET`
- [ ] `VITE_GOOGLE_REDIRECT_URI`
- [ ] `VITE_FIREBASE_*` (todas las variables)
- [ ] URLs de Cloud Functions

## 🐳 Docker y Build

### Archivos Docker
- [ ] `Dockerfile-cloudrun` existe y está actualizado
- [ ] `nginx-cloudrun.conf` existe
- [ ] `start-nginx.sh` existe y es ejecutable
- [ ] `cloudbuild.yaml` configurado correctamente

### Build Local (Opcional - para probar)
- [ ] Docker build funciona localmente:
  ```bash
  docker build -f Dockerfile-cloudrun -t test-frontend .
  ```
- [ ] Imagen construida correctamente
- [ ] Nginx inicia correctamente

## 🌐 URLs y Configuración Externa

### Google OAuth
- [ ] OAuth Client ID configurado
- [ ] Redirect URI de producción agregado (se agregará después del deploy)
- [ ] Client Secret guardado en Secret Manager

### Supabase
- [ ] URL de producción configurada
- [ ] Service Role Key guardado en Secret Manager
- [ ] CORS configurado para permitir dominio de Cloud Run

### Firebase (si aplica)
- [ ] Proyecto Firebase configurado
- [ ] Variables de Firebase en Dockerfile

## 📝 Código y Archivos

### Archivos Necesarios
- [ ] `package.json` actualizado
- [ ] Dependencias instaladas (`npm install`)
- [ ] `.gitignore` incluye `.env` y archivos sensibles
- [ ] No hay keys hardcodeadas en el código (excepto en Dockerfile como fallback)

### Build del Proyecto
- [ ] `npm run build` funciona sin errores
- [ ] Build genera archivos en `dist/`
- [ ] No hay errores de TypeScript
- [ ] Todas las rutas funcionan localmente

## 🚀 Deployment Scripts

### Scripts Preparados
- [ ] `deploy-google-cloud.sh` creado y es ejecutable
- [ ] `setup-secrets-and-deploy.sh` revisado
- [ ] `deploy-rag-worker.sh` revisado

### Permisos de Cloud Build
- [ ] Cloud Build tiene permisos de Cloud Run Admin
- [ ] Cloud Build tiene permisos de Service Account User

**Verificar permisos:**
```bash
PROJECT_NUMBER=$(gcloud projects describe eduspark-py --format="value(projectNumber)")
gcloud projects get-iam-policy eduspark-py \
  --filter="bindings.members:serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
```

## 🔍 Verificaciones Finales

### Antes de Deploy
- [ ] Todas las variables de entorno tienen valores reales
- [ ] No hay valores de placeholder (`PLACEHOLDER_API_KEY`, etc.)
- [ ] URLs de producción actualizadas
- [ ] Backup de configuración actual guardado

### Testing Local
- [ ] Frontend funciona en `npm run dev`
- [ ] Worker funciona en `npm run dev:worker`
- [ ] Conexión a Supabase funciona
- [ ] API de Gemini funciona (ejecutar `npm run verify:gemini`)

## 📋 Checklist de Deployment

### Deploy del Frontend
- [ ] Build completado sin errores
- [ ] Imagen subida a Container Registry
- [ ] Servicio Cloud Run creado/actualizado
- [ ] URL del servicio obtenida
- [ ] Frontend carga correctamente en el navegador
- [ ] Health check responde: `curl [URL]/health`

### Deploy del Worker
- [ ] Secretos configurados en Cloud Run
- [ ] Worker desplegado correctamente
- [ ] Health check del worker funciona
- [ ] Logs sin errores críticos

### Post-Deployment
- [ ] URLs de producción guardadas
- [ ] OAuth redirect URIs actualizados
- [ ] CORS en Supabase actualizado si es necesario
- [ ] Variables de entorno de Cloud Functions actualizadas
- [ ] Documentación actualizada con URLs de producción

## 🆘 Si Algo Sale Mal

### Comandos de Debug
```bash
# Ver logs del servicio
gcloud run services logs read eduspark-frontend --limit 50

# Ver estado del servicio
gcloud run services describe eduspark-frontend

# Ver builds recientes
gcloud builds list --limit 5

# Ver logs de un build
gcloud builds log [BUILD_ID]
```

### Rollback
- [ ] Saber cómo hacer rollback a versión anterior
- [ ] Tener backups de configuraciones

## ✅ Listo para Deploy

Una vez completado este checklist:

1. **Ejecutar script de deployment:**
   ```bash
   chmod +x deploy-google-cloud.sh
   ./deploy-google-cloud.sh all
   ```

2. **O deployment manual:**
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

3. **Verificar después del deploy:**
   - URLs funcionando
   - Logs sin errores
   - Funcionalidad básica probada

---

**⚠️ IMPORTANTE:** No deployar hasta completar todos los items marcados.

**📚 Documentación completa:** Ver `docs/GUIA_DEPLOYMENT_GOOGLE_CLOUD.md`

