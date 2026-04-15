# ✅ Verificación Pre-Deployment - Google Cloud

## 📊 Estado Actual Verificado

### ✅ Configuración de Google Cloud
- **Proyecto:** `eduspark-py` ✓
- **Región:** `us-central1` ✓
- **Servicio:** `eduspark-frontend` ✓
- **URL Actual:** https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
- **Estado:** ✅ Ready (Funcionando)
- **Última Revisión:** `eduspark-frontend-00011-pz5`

### ✅ APIs Habilitadas
- ✅ Cloud Run API
- ✅ Cloud Build API
- ✅ Container Registry API

### ✅ Archivos Necesarios
- ✅ `Dockerfile-cloudrun` - Presente
- ✅ `cloudbuild.yaml` - Presente
- ✅ `nginx-cloudrun.conf` - Presente
- ✅ `start-nginx.sh` - Presente
- ✅ `package.json` - Presente

### ✅ Servicios Existentes
Los siguientes servicios ya están desplegados en Cloud Run:
- `eduspark-frontend` - Frontend principal
- `analyzefile` - Procesamiento de archivos
- `createfileprocessingjob` - Creación de jobs
- `processfilejob` - Procesamiento de jobs
- `rag-worker` - Worker RAG
- Y otros servicios Cloud Functions

## 🎯 Cambios que se Desplegarán

### ✅ Mejoras Implementadas
1. **Materiales con Acordeón:**
   - Los materiales ahora se agrupan cuando hay varios
   - Iconos de expandir/plegar (ChevronUp/ChevronDown)
   - Si hay 1 material: se muestra directamente
   - Si hay 2+ materiales: se agrupan en acordeón

2. **Mejoras en CourseViewPage:**
   - Mejor organización visual
   - Materiales agrupados por tipo
   - Navegación más intuitiva

## 📋 Resumen de Configuración de Deployment

### Cloud Build (`cloudbuild.yaml`)
- **Imagen:** `gcr.io/$PROJECT_ID/eduspark-frontend`
- **Servicio:** `eduspark-frontend`
- **Región:** `us-central1`
- **Puerto:** 8080
- **Memoria:** 512Mi
- **CPU:** 1
- **Mín. Instancias:** 0
- **Máx. Instancias:** 10
- **Timeout:** 300 segundos

### Variables de Entorno en Dockerfile
Todas las variables están configuradas en `Dockerfile-cloudrun`:
- Supabase (URL y keys)
- Gemini API Key
- Google OAuth
- Firebase
- URLs de Cloud Functions

## ⚠️ Consideraciones Importantes

### 1. API Key de Gemini
- ⚠️ Hay un error 403 detectado en la API key de Gemini
- 📝 Ver: `docs/SOLUCION_ERROR_403_GEMINI.md`
- 💡 Se recomienda verificar/habilitar la API antes del deployment

### 2. Variables Hardcodeadas
- ⚠️ Hay algunas variables hardcodeadas en `Dockerfile-cloudrun`
- ✅ Para producción, considerar usar Secret Manager para valores sensibles

### 3. Servicio Actual
- ✅ El servicio ya existe y está funcionando
- ✅ El deployment actualizará la revisión existente
- ✅ No habrá downtime (deployment gradual)

## 🚀 Comando para Deployment

### Opción 1: Usar Script Existente (Recomendado)

```powershell
.\deploy-cloudrun.ps1
```

### Opción 2: Cloud Build Directo

```powershell
gcloud builds submit --config cloudbuild.yaml --project=eduspark-py
```

### Opción 3: Manual Paso a Paso

```powershell
# 1. Build y push
gcloud builds submit --tag gcr.io/eduspark-py/eduspark-frontend:latest --project=eduspark-py

# 2. Deploy
gcloud run deploy eduspark-frontend `
  --image gcr.io/eduspark-py/eduspark-frontend:latest `
  --platform managed `
  --region us-central1 `
  --project eduspark-py `
  --allow-unauthenticated
```

## ✅ Checklist Final Antes de Deployment

- [x] Proyecto configurado: `eduspark-py`
- [x] APIs habilitadas
- [x] Archivos necesarios presentes
- [x] Servicio actual verificado y funcionando
- [ ] Cambios locales probados (`npm run dev`)
- [ ] Build local funciona (`npm run build`)
- [ ] Cambios en git commiteados (opcional)

## 📝 Pasos Post-Deployment

Después del deployment:

1. **Verificar URL:**
   - Abrir: https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
   - Verificar que carga correctamente

2. **Verificar Funcionalidad:**
   - Navegar a `/courses/12`
   - Verificar que los materiales se agrupen correctamente
   - Probar expandir/colapsar materiales

3. **Verificar Logs:**
   ```powershell
   gcloud run services logs read eduspark-frontend --region=us-central1 --limit=50
   ```

4. **Si hay problemas:**
   - Ver logs para errores
   - Hacer rollback si es necesario:
     ```powershell
     gcloud run services update-traffic eduspark-frontend `
       --to-revisions PREVIOUS_REVISION=100 `
       --region=us-central1
     ```

## 🎯 Confirmación

**¿Estás listo para hacer el deployment?**

Si confirmas, se ejecutará:
- Build de la imagen Docker
- Push a Container Registry
- Deploy a Cloud Run
- Actualización del servicio `eduspark-frontend`

**Tiempo estimado:** 5-10 minutos

---

**URL del servicio después del deployment:**
https://eduspark-frontend-mcc5aevj6a-uc.a.run.app







