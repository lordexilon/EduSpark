# 🚀 Quick Start: Deployment a Google Cloud

## ⚡ Inicio Rápido (5 minutos)

### 1. Verificar Requisitos

```bash
# Verificar gcloud instalado
gcloud --version

# Autenticar
gcloud auth login

# Configurar proyecto
gcloud config set project eduspark-py
```

### 2. Habilitar APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project=eduspark-py
```

### 3. Crear Secretos (Una vez)

```bash
# Ejecutar y completar los valores
./setup-secrets-and-deploy.sh
```

O manualmente:

```bash
echo -n "tu_valor" | gcloud secrets create SECRET_NAME \
  --data-file=- --project=eduspark-py
```

**Secretos necesarios:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### 4. Deploy

```bash
# Hacer ejecutable el script
chmod +x deploy-google-cloud.sh

# Deploy completo
./deploy-google-cloud.sh all

# O solo frontend
./deploy-google-cloud.sh frontend

# O solo worker
./deploy-google-cloud.sh worker
```

### 5. Verificar

El script te mostrará las URLs al finalizar. Verifica:
- Frontend carga correctamente
- Logs sin errores críticos

## 📋 Checklist Rápido

- [ ] `gcloud` instalado y autenticado
- [ ] Proyecto configurado: `eduspark-py`
- [ ] APIs habilitadas
- [ ] Secretos creados
- [ ] Script de deployment ejecutado
- [ ] URLs verificadas

## 📚 Documentación Completa

- **Guía Completa:** `docs/GUIA_DEPLOYMENT_GOOGLE_CLOUD.md`
- **Checklist Detallado:** `docs/CHECKLIST_PRE_DEPLOYMENT.md`
- **Costos:** `docs/COSTOS_GEMINI_API.md`

## 🆘 Problemas Comunes

### Error: "API not enabled"
```bash
gcloud services enable [API_NAME] --project=eduspark-py
```

### Error: "Permission denied"
```bash
gcloud auth login
gcloud config set project eduspark-py
```

### Error: "Secret not found"
```bash
# Listar secretos
gcloud secrets list

# Crear secreto faltante
echo -n "valor" | gcloud secrets create SECRET_NAME --data-file=-
```

## 📞 URLs Importantes

- **Cloud Run:** https://console.cloud.google.com/run
- **Cloud Build:** https://console.cloud.google.com/cloud-build
- **Secret Manager:** https://console.cloud.google.com/security/secret-manager
- **Billing:** https://console.cloud.google.com/billing

---

**¿Listo?** Ejecuta: `./deploy-google-cloud.sh all`

