# Guía de Despliegue a Google Cloud Run

Esta guía te ayudará a desplegar EduSpark a Google Cloud Run.

## 📋 Prerrequisitos

1. **Cuenta de Google Cloud** con un proyecto creado
2. **Google Cloud SDK (gcloud)** instalado
   - Descarga desde: https://cloud.google.com/sdk/docs/install
3. **Docker** instalado
   - Descarga desde: https://www.docker.com/products/docker-desktop
4. **Node.js y npm** instalados
   - Descarga desde: https://nodejs.org/

## 🔧 Configuración Inicial

### 1. Autenticarse en Google Cloud

```powershell
gcloud auth login
```

### 2. Configurar el proyecto

```powershell
gcloud config set project eduspark-py
```

Reemplaza `eduspark-py` con el ID de tu proyecto de Google Cloud.

### 3. Habilitar APIs necesarias

```powershell
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## 🚀 Despliegue

### Opción 1: Script Automatizado (Recomendado)

1. **Verificar que todo está listo:**
   ```powershell
   .\scripts\check-deployment-ready.ps1
   ```

2. **Desplegar:**
   ```powershell
   .\scripts\deploy-google-cloud.ps1
   ```

   O con parámetros personalizados:
   ```powershell
   .\scripts\deploy-google-cloud.ps1 -ProjectId "tu-proyecto" -Region "us-central1"
   ```

### Opción 2: Pasos Manuales

1. **Compilar el proyecto:**
   ```powershell
   npm install
   npm run build
   ```

2. **Verificar que dist/ existe:**
   ```powershell
   Test-Path dist
   ```

3. **Desplegar usando Cloud Build:**
   ```powershell
   gcloud builds submit --config cloudbuild.yaml
   ```

## 📝 Configuración de Variables de Entorno

Después del despliegue, configura las variables de entorno en Cloud Run:

```powershell
gcloud run services update eduspark-frontend `
  --region us-central1 `
  --set-env-vars "VITE_SUPABASE_URL=tu_url" `
  --set-env-vars "VITE_SUPABASE_ANON_KEY=tu_key" `
  --set-env-vars "VITE_GEMINI_API_KEY=tu_key"
```

O configura todas a la vez:

```powershell
gcloud run services update eduspark-frontend `
  --region us-central1 `
  --update-env-vars "VITE_SUPABASE_URL=tu_url,VITE_SUPABASE_ANON_KEY=tu_key,VITE_GEMINI_API_KEY=tu_key"
```

### Variables de Entorno Necesarias

- `VITE_SUPABASE_URL` - URL de tu proyecto Supabase
- `VITE_SUPABASE_ANON_KEY` - Clave anónima de Supabase
- `VITE_GEMINI_API_KEY` - Clave API de Google Gemini (opcional)
- `VITE_FIREBASE_API_KEY` - Clave API de Firebase
- `VITE_FIREBASE_AUTH_DOMAIN` - Dominio de autenticación de Firebase
- `VITE_FIREBASE_PROJECT_ID` - ID del proyecto Firebase
- `VITE_FIREBASE_STORAGE_BUCKET` - Bucket de almacenamiento de Firebase
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - ID del remitente de mensajería
- `VITE_FIREBASE_APP_ID` - ID de la app Firebase

## 🔍 Verificación Post-Despliegue

### 1. Obtener la URL del servicio

```powershell
gcloud run services describe eduspark-frontend --region us-central1 --format 'value(status.url)'
```

### 2. Ver logs

```powershell
gcloud run services logs read eduspark-frontend --region us-central1
```

### 3. Ver información del servicio

```powershell
gcloud run services describe eduspark-frontend --region us-central1
```

## 🔄 Actualizaciones

Para actualizar el servicio después de hacer cambios:

1. **Compilar cambios:**
   ```powershell
   npm run build
   ```

2. **Desplegar nuevamente:**
   ```powershell
   .\scripts\deploy-google-cloud.ps1 -SkipBuild
   ```

   O manualmente:
   ```powershell
   gcloud builds submit --config cloudbuild.yaml
   ```

## 🛠️ Solución de Problemas

### Error: "gcloud CLI no está instalado"
- Instala Google Cloud SDK desde: https://cloud.google.com/sdk/docs/install
- Asegúrate de que `gcloud` esté en tu PATH

### Error: "Docker no está instalado"
- Instala Docker Desktop desde: https://www.docker.com/products/docker-desktop
- Asegúrate de que Docker esté corriendo

### Error: "La carpeta dist no existe"
- Ejecuta `npm run build` primero
- Verifica que no haya errores en la compilación

### Error: "No se pudo configurar el proyecto"
- Verifica que el proyecto existe: `gcloud projects list`
- Verifica que tienes permisos: `gcloud projects get-iam-policy tu-proyecto`

### Error: "APIs no habilitadas"
- Ejecuta manualmente:
  ```powershell
  gcloud services enable cloudbuild.googleapis.com
  gcloud services enable run.googleapis.com
  gcloud services enable containerregistry.googleapis.com
  ```

### El servicio no responde
- Verifica los logs: `gcloud run services logs read eduspark-frontend --region us-central1`
- Verifica que las variables de entorno estén configuradas correctamente
- Verifica que el servicio esté activo en la consola de Google Cloud

## 📊 Monitoreo

### Ver métricas en tiempo real

```powershell
gcloud run services describe eduspark-frontend --region us-central1
```

### Ver logs en tiempo real

```powershell
gcloud run services logs tail eduspark-frontend --region us-central1
```

## 🔐 Seguridad

- Las variables de entorno sensibles deben configurarse usando Secret Manager
- No subas archivos `.env` al repositorio
- Usa IAM para controlar quién puede desplegar

## 📚 Recursos Adicionales

- [Documentación de Cloud Run](https://cloud.google.com/run/docs)
- [Documentación de Cloud Build](https://cloud.google.com/build/docs)
- [Documentación de Container Registry](https://cloud.google.com/container-registry/docs)

