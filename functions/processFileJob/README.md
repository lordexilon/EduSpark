# Process File Job - Cloud Function

Esta función procesa archivos de Google Drive automáticamente cuando se crea un job en Firestore.

## Funcionalidad

1. **Se activa automáticamente** cuando se crea un documento en `file_processing_jobs` con status `pending`
2. **Descarga el archivo** desde Google Drive del usuario
3. **Extrae texto**:
   - PDFs de texto: Extracción directa
   - PDFs escaneados/Imágenes: OCR con Google Vision API
4. **Divide en chunks** según el tamaño configurado
5. **Genera embeddings** usando Gemini API (text-embedding-004)
6. **Guarda chunks en Supabase** en la tabla `course_content_chunks`
7. **Actualiza estados** en Firestore y Supabase

## Variables de Entorno Requeridas

Configurar en Firebase Console (Functions → Config):

```bash
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
GEMINI_API_KEY=tu-gemini-api-key
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
```

## Instalación

```bash
cd functions/processFileJob
npm install
npm run build
```

## Despliegue

```bash
# Desde la raíz del proyecto
firebase deploy --only functions:processFileJob
```

O desplegar todas las funciones:

```bash
firebase deploy --only functions
```

## Flujo de Procesamiento

```
1. Usuario crea job → createFileProcessingJob
2. Job creado en Firestore (status: 'pending')
3. processFileJob se activa automáticamente
4. Procesa archivo y guarda chunks en Supabase
5. Actualiza job a 'completed'
6. A2A puede consultar chunks desde Supabase
```

## Logs

Los logs se pueden ver en:
- Firebase Console → Functions → processFileJob → Logs
- Cloud Logging

## Troubleshooting

### Error: "No se pudo obtener token de acceso"
- Verificar que el usuario tenga Google Drive conectado
- Verificar que el token no esté expirado

### Error: "No se pudo extraer texto"
- Para PDFs escaneados, verificar que Google Vision API esté habilitada
- Verificar permisos del archivo en Google Drive

### Error: "Error insertando chunks en Supabase"
- Verificar SUPABASE_SERVICE_ROLE_KEY
- Verificar que la tabla `course_content_chunks` exista
- Verificar formato del embedding (debe ser array de 768 números)

