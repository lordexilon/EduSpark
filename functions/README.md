# Cloud Functions para Procesamiento de Archivos

Cloud Functions para analizar y crear trabajos de procesamiento de archivos.

## Funciones

### analyzeFile

Analiza un archivo antes de procesarlo:
- Detecta tipo de PDF (texto vs escaneado)
- Cuenta páginas totales
- Calcula estimación de costos

### createFileProcessingJob

Crea un trabajo de procesamiento en Firestore.

### processFileJob

Procesa archivos automáticamente cuando se crea un job:
- Descarga archivo de Google Drive
- Extrae texto (OCR si es necesario)
- Divide en chunks
- Genera embeddings con Gemini
- Guarda chunks en Supabase `course_content_chunks`

## Configuración

```bash
cd functions
npm install
```

## Deploy

```bash
firebase deploy --only functions
```

## Variables de Entorno

Configurar en Firebase Console (Functions → Config):

### Para todas las funciones:
- `GEMINI_API_KEY` - API key de Google Gemini
- `GOOGLE_CLIENT_ID` - Client ID de Google OAuth
- `GOOGLE_CLIENT_SECRET` - Client Secret de Google OAuth

### Para processFileJob:
- `SUPABASE_URL` - URL de tu proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key de Supabase (para insertar chunks)

