# Motor de Ingesta Asíncrono para EduSpark

Sistema completo para procesar archivos PDF/PPT de Google Drive con OCR y generar embeddings para RAG.

## Arquitectura

### Componentes Principales

1. **Frontend (React)**
   - `pages/FileProcessingPage.tsx` - Panel de administración
   - `components/FileAnalysisModal.tsx` - Modal de análisis y costos
   - `components/CostBreakdown.tsx` - Desglose de costos
   - `components/ProcessingProgress.tsx` - Dashboard de estado

2. **Cloud Functions (Google Cloud)**
   - `functions/analyzeFile/` - Analiza archivos antes de procesar
   - `functions/createFileProcessingJob/` - Crea trabajos de procesamiento

3. **Worker (Cloud Run)**
   - `workers/file-processing-worker/` - Procesa archivos asíncronamente
   - Soporta PDFs con texto nativo y escaneados (OCR)
   - Procesa archivos grandes (850 MB) por tandas

4. **Base de Datos**
   - **Firestore**: Cola de trabajos (`file_processing_jobs`)
   - **Supabase**: Almacenamiento de embeddings (`course_content_chunks`)

## Configuración

### 1. Variables de Entorno Frontend

Agregar a `.env.local`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ANALYZE_FILE_URL=https://region-project.cloudfunctions.net/analyzeFile
VITE_CREATE_JOB_URL=https://region-project.cloudfunctions.net/createFileProcessingJob
```

### 2. Configurar Firestore

1. Crear proyecto en Firebase Console
2. Habilitar Firestore
3. Crear índices desde `firestore/indexes.json`:
   ```bash
   firebase deploy --only firestore:indexes
   ```

### 3. Configurar Cloud Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

### 4. Configurar Worker (Cloud Run)

```bash
cd workers/file-processing-worker
npm install
# Configurar variables de entorno en Cloud Run
# Deploy usando gcloud o Cloud Build
```

### 5. Configurar Supabase

Ejecutar en SQL Editor de Supabase:

```sql
-- Crear función de búsqueda vectorial
-- Ver: sql_scripts/create_vector_search_function.sql
```

## Flujo de Trabajo

1. **Admin selecciona archivo** → Clic en "Analizar"
2. **Cloud Function `analyzeFile`**:
   - Descarga primeras páginas
   - Detecta tipo (texto vs escaneado)
   - Cuenta páginas
   - Calcula costos estimados
3. **Admin revisa estimación** → Decide procesar
4. **Cloud Function `createFileProcessingJob`**:
   - Crea trabajo 'split' en Firestore
5. **Worker detecta trabajo**:
   - Procesa trabajo 'split': cuenta páginas, crea trabajos hijos
   - Procesa trabajos 'process_chunk': extrae texto, genera embeddings, guarda en Supabase
6. **Frontend muestra progreso** en tiempo real
7. **RAGAgent consulta** `course_content_chunks` con búsqueda vectorial

## Características

- ✅ **OCR para PDFs escaneados** usando Google Cloud Vision API
- ✅ **Estimación de costos** antes de procesar
- ✅ **Procesamiento por tandas** para archivos grandes (850 MB)
- ✅ **Descarga por rangos** para optimizar ancho de banda
- ✅ **Citas en respuestas** del RAGAgent con nombre de archivo y página
- ✅ **Dashboard en tiempo real** con Firestore listeners

## Costos Estimados

- **OCR**: $1.50 por 1,000 páginas (primeros 1,000), $0.60 adicionales
- **Embeddings**: $0.0001 por 1,000 caracteres
- **Cloud Run**: ~$0.10 por archivo de 500 páginas
- **Firestore**: ~$0.01 por archivo procesado

## Troubleshooting

### Error: "Function not found" en búsqueda vectorial
- Ejecutar `sql_scripts/create_vector_search_function.sql` en Supabase

### Error: "No hay token de acceso de Google Drive"
- Verificar que el usuario tenga Google Drive vinculado
- Revisar permisos de OAuth

### Worker no procesa trabajos
- Verificar variables de entorno en Cloud Run
- Revisar logs en Cloud Run Console
- Verificar que Firestore tenga los índices correctos

