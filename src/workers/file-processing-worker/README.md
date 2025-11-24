# Worker de Procesamiento de Archivos

Worker asíncrono para procesar archivos PDF/PPT de Google Drive con soporte para OCR.

## Configuración

### Variables de Entorno

Copia `.env.example` a `.env` y configura:

```bash
GEMINI_API_KEY=tu_api_key
GOOGLE_CLOUD_PROJECT_ID=tu_project_id
FIREBASE_PROJECT_ID=tu_firebase_project_id
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_KEY=tu_service_key
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
CHUNK_SIZE=25
```

### Service Account

Crea un Service Account en Google Cloud con los siguientes permisos:
- Firestore: Read/Write
- Google Drive API: Read
- Cloud Vision API: Read (para OCR)
- Cloud Run: Invoke

Descarga el JSON de credenciales y configura `GOOGLE_APPLICATION_CREDENTIALS`.

## Desarrollo Local

```bash
npm install
npm run dev
```

## Build y Deploy

```bash
npm run build
# Deploy a Cloud Run usando gcloud CLI o Cloud Build
```

## Docker

```bash
docker build -t file-processing-worker .
docker run --env-file .env file-processing-worker
```

