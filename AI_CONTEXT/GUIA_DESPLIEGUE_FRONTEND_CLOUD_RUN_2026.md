# Guía de Despliegue Frontend a Google Cloud Run - 2026

**Proyecto:** `eduspark-py`  
**Servicio:** `eduspark-frontend`  
**Región:** `us-central1`

---

## 🎯 Objetivo

Desplegar el frontend actualizado (con control de presupuesto y mejoras del tutor) a Google Cloud Run.

---

## 📋 Prerrequisitos

1. ✅ Tener `gcloud` CLI instalado y configurado
2. ✅ Estar autenticado en Google Cloud
3. ✅ Tener permisos en el proyecto `eduspark-py`
4. ✅ Tener el build local compilado (`dist/`)

---

## 🚀 Pasos para Desplegar

### Opción 1: Despliegue con Cloud Build (Recomendado)

#### 1. Verificar que el build esté actualizado

```powershell
# Compilar el frontend
npm run build

# Verificar que dist/ existe y tiene contenido
dir dist
```

#### 2. Configurar el proyecto de Google Cloud

```powershell
# Establecer el proyecto
gcloud config set project eduspark-py

# Verificar configuración
gcloud config list
```

#### 3. Desplegar usando Cloud Build

```powershell
# Opción A: Usar cloudbuild.yaml (build completo en la nube)
gcloud builds submit --config cloudbuild.yaml

# Opción B: Desplegar directamente desde código fuente (Cloud Build automático)
gcloud run deploy eduspark-frontend `
  --source . `
  --region us-central1 `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 10 `
  --timeout 300 `
  --concurrency 80
```

**Nota:** Esta opción compilará el proyecto en Cloud Build, lo cual puede tardar varios minutos.

---

### Opción 2: Despliegue con Build Local + Docker (Más Rápido)

#### 1. Compilar el frontend localmente

```powershell
# Limpiar build anterior (opcional)
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# Compilar
npm run build

# Verificar que dist/ tiene contenido
Get-ChildItem dist
```

#### 2. Construir imagen Docker localmente

**Requisito:** Docker Desktop instalado y corriendo

```powershell
# Construir imagen
docker build -f Dockerfile-cloudrun -t gcr.io/eduspark-py/eduspark-frontend:latest .

# Verificar que la imagen se construyó
docker images | Select-String "eduspark-frontend"
```

#### 3. Subir imagen a Google Container Registry

```powershell
# Autenticar Docker con GCR
gcloud auth configure-docker

# Subir imagen
docker push gcr.io/eduspark-py/eduspark-frontend:latest
```

#### 4. Desplegar a Cloud Run

```powershell
gcloud run deploy eduspark-frontend `
  --image gcr.io/eduspark-py/eduspark-frontend:latest `
  --region us-central1 `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 10 `
  --timeout 300 `
  --concurrency 80 `
  --cpu-throttling `
  --no-cpu-boost
```

---

### Opción 3: Despliegue Manual desde dist/ (Sin Docker)

Si no tienes Docker instalado, puedes usar Cloud Storage + Cloud CDN:

#### 1. Compilar el frontend

```powershell
npm run build
```

#### 2. Crear bucket en Cloud Storage

```powershell
# Crear bucket (si no existe)
gsutil mb -p eduspark-py -l us-central1 gs://eduspark-frontend-2026

# Copiar dist/ al bucket
gsutil -m rsync -r -d dist/ gs://eduspark-frontend-2026/

# Hacer público
gsutil -m acl ch -u AllUsers:R gs://eduspark-frontend-2026/**
gsutil web set -m index.html -e index.html gs://eduspark-frontend-2026
```

#### 3. Configurar Cloud CDN (Opcional, para mejor performance)

```powershell
# Crear backend bucket
gcloud compute backend-buckets create eduspark-frontend-backend `
  --gcs-bucket-name=eduspark-frontend-2026

# Crear URL map
gcloud compute url-maps create eduspark-frontend-map `
  --default-backend-bucket=eduspark-frontend-backend

# Crear proxy
gcloud compute target-https-proxies create eduspark-frontend-proxy `
  --url-map=eduspark-frontend-map `
  --ssl-certificates=eduspark-ssl-cert

# Crear forwarding rule
gcloud compute forwarding-rules create eduspark-frontend-https `
  --global `
  --target-https-proxy=eduspark-frontend-proxy `
  --ports=443
```

---

## ✅ Verificación Post-Despliegue

### 1. Verificar que el servicio está corriendo

```powershell
# Obtener URL del servicio
gcloud run services describe eduspark-frontend `
  --region us-central1 `
  --format "value(status.url)"
```

### 2. Probar el frontend

1. Abrir la URL en el navegador
2. Verificar que carga correctamente
3. Probar login
4. Verificar que el tutor virtual funciona
5. Verificar que la página de analytics muestra el presupuesto

### 3. Verificar logs

```powershell
# Ver logs en tiempo real
gcloud run services logs read eduspark-frontend `
  --region us-central1 `
  --limit 50
```

---

## 🔧 Configuración del Servicio

### Variables de Entorno (si es necesario)

Si el frontend necesita variables de entorno en tiempo de ejecución:

```powershell
gcloud run services update eduspark-frontend `
  --region us-central1 `
  --update-env-vars VITE_SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co
```

**Nota:** Las variables `VITE_*` deben estar en el build, no en runtime. Si necesitas cambiar variables, debes recompilar.

---

## 📊 Monitoreo

### Ver métricas del servicio

```powershell
# Ver uso de recursos
gcloud run services describe eduspark-frontend `
  --region us-central1 `
  --format yaml
```

### Ver en Google Cloud Console

1. Ir a: https://console.cloud.google.com/run/services?hl=es&project=eduspark-py
2. Seleccionar `eduspark-frontend`
3. Ver métricas, logs y configuración

---

## 🐛 Solución de Problemas

### Error: "Build failed"

**Solución:**
- Verificar que `dist/` existe y tiene contenido
- Verificar que `Dockerfile-cloudrun` está correcto
- Revisar logs: `gcloud builds log <BUILD_ID>`

### Error: "Image not found"

**Solución:**
- Verificar que la imagen se subió: `gcloud container images list`
- Verificar permisos del proyecto

### Error: "Service not found"

**Solución:**
- Verificar que el servicio existe: `gcloud run services list --region us-central1`
- Si no existe, crear primero con `gcloud run deploy`

### El frontend no carga correctamente

**Solución:**
1. Verificar que `nginx-cloudrun.conf` está configurado para SPA
2. Verificar que `index.html` está en `dist/`
3. Revisar logs del servicio
4. Verificar que las rutas están configuradas correctamente

---

## 📝 Checklist Pre-Despliegue

- [ ] Build local exitoso (`npm run build`)
- [ ] `dist/` contiene todos los archivos
- [ ] Variables de entorno configuradas en `.env` (para build)
- [ ] `Dockerfile-cloudrun` actualizado
- [ ] `nginx-cloudrun.conf` configurado correctamente
- [ ] Proyecto Google Cloud configurado (`eduspark-py`)
- [ ] Autenticado en gcloud (`gcloud auth login`)

---

## 🎯 Comando Rápido (Todo en Uno)

```powershell
# 1. Compilar
npm run build

# 2. Desplegar (si tienes Docker)
docker build -f Dockerfile-cloudrun -t gcr.io/eduspark-py/eduspark-frontend:latest .
gcloud auth configure-docker
docker push gcr.io/eduspark-py/eduspark-frontend:latest
gcloud run deploy eduspark-frontend `
  --image gcr.io/eduspark-py/eduspark-frontend:latest `
  --region us-central1 `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 10
```

---

## 📚 Referencias

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Container Registry Documentation](https://cloud.google.com/container-registry/docs)

---

**Última actualización:** Enero 2026  
**Proyecto:** eduspark-py  
**Servicio:** eduspark-frontend
