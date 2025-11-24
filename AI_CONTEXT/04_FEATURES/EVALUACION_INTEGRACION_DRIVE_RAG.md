# Evaluación Técnica: Integración Google Drive con Archivos Grandes para RAG

**Fecha:** Enero 2025  
**Objetivo:** Evaluar la viabilidad técnica y económica de integrar archivos grandes de Google Drive (PDF, PPT, ~1GB) al sistema RAG de EduSpark

---

## 📋 Resumen Ejecutivo

### Viabilidad General
✅ **TÉCNICAMENTE VIABLE** con consideraciones importantes sobre:
- Procesamiento de archivos grandes
- Costos de APIs y almacenamiento
- Límites de tiempo y recursos
- Arquitectura de procesamiento asíncrono

### Recomendación
**Implementación por fases** comenzando con archivos pequeños (<50MB) y escalando gradualmente.

---

## 🎯 Objetivo del Proyecto

### Requisitos Identificados
1. **Integración con Google Drive**: Conectar carpetas de Drive al sistema
2. **Procesamiento de archivos grandes**: PDF, PPT, DOCX de hasta 1GB
3. **Extracción de contenido**: Convertir archivos a texto para RAG
4. **Indexación en RAG**: Crear embeddings y chunks para búsqueda semántica
5. **Estructura de carpetas**: Soporte para carpetas principales con subcarpetas

### Caso de Uso
- Docente sube materiales educativos a Google Drive
- Sistema procesa automáticamente los archivos
- RAG aprende del contenido para responder preguntas de estudiantes
- Soporte para múltiples formatos: PDF, PPT, DOCX, XLSX, etc.

---

## 🔍 Análisis Técnico

### 1. Estado Actual del Sistema

#### ✅ Integración Google Drive Existente
- **Servicios disponibles:**
  - `googleDriveService.ts`: Gestión de carpetas personales
  - `googleDrive.ts`: Selector de archivos (Google Picker API)
  - `googleOAuthService.ts`: Autenticación OAuth

- **Funcionalidades actuales:**
  - Conexión de cuenta Google Drive
  - Creación automática de carpeta personal "EduSpark - [Usuario]"
  - Selección de archivos mediante Google Picker
  - Vinculación de archivos a materiales de curso

#### ✅ Sistema RAG Existente
- **Orquestación:** A2A (Agent-to-Agent) de Google - Sistema local en frontend
- **Base de datos vectorial:** Firebase Firestore con Vertex AI Vector Search
- **Colección de chunks:** `course_content_chunks` con embeddings de 768 dimensiones
- **Modelo de IA:** Google Gemini API (`text-embedding-004`)
- **AgentCoordinator:** Coordina agentes locales (ContextAgent, RAGAgent, VoiceAgent)
- **Procesamiento actual:** Texto plano, markdown, URLs

#### ⚠️ Limitaciones Actuales
- **No hay procesamiento de archivos binarios** (PDF, PPT, DOCX)
- **No hay extracción de texto** de documentos
- **No hay procesamiento asíncrono** para archivos grandes
- **Límites de tamaño no definidos** para materiales

---

## 🚨 Problemas Técnicos Identificados

### 1. Límites de Tamaño de Archivos

#### Google Drive API
- **Límite de descarga directa:** 5GB por archivo
- **Límite de exportación:** 
  - Google Docs/Sheets/Slides: Sin límite práctico
  - Archivos nativos (PDF, PPT): Hasta 5GB
- **Límite de request:** 10MB por request (requiere upload resumable para archivos grandes)

#### Procesamiento en Memoria
- **Problema:** Archivos de 1GB no pueden procesarse completamente en memoria
- **Solución requerida:** Procesamiento por chunks/streaming

#### Timeouts
- **Frontend:** Timeouts típicos de 30-60 segundos
- **Backend:** Cloud Functions de Firebase: 60 segundos (gratis) o 540 segundos (Blaze)
- **Problema:** Archivos grandes requieren más tiempo

### 2. Extracción de Contenido

#### PDFs
- **Librerías disponibles:**
  - `pdf-parse` (Node.js): ✅ Buena, pero puede fallar con PDFs complejos
  - `pdfjs-dist` (Frontend): ✅ Funciona en navegador, limitado para archivos grandes
  - Google Cloud Document AI: ✅ Excelente, pero tiene costos
  - `pdf2json`: ✅ Alternativa, procesa por páginas

- **Problemas:**
  - PDFs escaneados requieren OCR (costoso)
  - PDFs con imágenes grandes consumen mucha memoria
  - PDFs con formularios pueden tener contenido no extraíble

#### PowerPoint (PPT/PPTX)
- **Librerías disponibles:**
  - `officegen` / `officegen-js`: ❌ Solo generación, no lectura
  - `mammoth` (solo DOCX): ❌ No soporta PPT
  - Google Drive API Export: ✅ Convierte PPTX a texto, pero limitado
  - `pptxgenjs`: ❌ Solo generación
  - **Solución recomendada:** Usar Google Drive API para exportar a texto

- **Problemas:**
  - PPTX es formato binario complejo (ZIP + XML)
  - Requiere librerías especializadas
  - Notas del presentador pueden no extraerse fácilmente

#### Word (DOCX)
- **Librerías disponibles:**
  - `mammoth`: ✅ Excelente para DOCX
  - `docx`: ✅ Lectura y escritura
  - Google Drive API Export: ✅ Funciona bien

- **Problemas menores:**
  - Formato relativamente simple
  - Imágenes embebidas pueden ser problema

### 3. Procesamiento Asíncrono

#### Necesidad
- Archivos de 1GB pueden tardar **10-30 minutos** en procesarse
- No puede ser síncrono (timeout)
- Requiere sistema de cola y workers

#### Opciones de Implementación
1. **Firebase Cloud Functions** (limitado a 60-540 segundos según plan)
2. **Google Cloud Functions** (hasta 540 segundos, escalable)
3. **Cloud Run** (sin límite de tiempo, auto-scaling)
4. **Background Jobs** con Cloud Scheduler + Cloud Functions

### 4. Límites de Embeddings

#### Google Gemini Embeddings API
- **Límite de tokens por request:** ~8,000 tokens (~32,000 caracteres)
- **Rate limits:**
  - Free tier: 15 requests/minuto
  - Paid tier: 1,000 requests/minuto
- **Costo:** $0.0001 por 1,000 caracteres (~$0.0004 por 1,000 tokens)

#### Cálculo para Archivo de 1GB
- **Texto extraído:** ~500MB de texto (asumiendo PDF con imágenes)
- **Caracteres:** ~500,000,000 caracteres
- **Chunks necesarios:** ~15,625 chunks (32,000 caracteres cada uno)
- **Requests de embeddings:** 15,625 requests
- **Tiempo estimado:** 
  - Free tier: ~1,041 minutos (~17 horas) ⚠️
  - Paid tier: ~16 minutos ✅

### 5. Almacenamiento

#### Firebase Storage
- **Límite gratuito (Spark):** 5GB
- **Plan Blaze (pay-as-you-go):** $0.026/GB/mes almacenamiento + $0.12/GB transferencia
- **Costo adicional:** Muy bajo para uso moderado

#### Base de Datos (Firestore)
- **Embeddings:** 768 dimensiones × 4 bytes = 3,072 bytes por embedding
- **Para 15,625 chunks:** ~48MB solo en embeddings
- **Texto de chunks:** ~500MB (si se guarda completo)
- **Total por archivo de 1GB:** ~550MB en base de datos
- **Costo Firestore:** $0.18/GB almacenamiento + $0.06/100K lecturas + $0.18/100K escrituras

---

## 💰 Análisis de Costos

### Costos Iniciales (Setup)

#### 1. Desarrollo
- **Tiempo estimado:** 40-60 horas
- **Costo (si se contrata):** $2,000 - $4,000 USD

#### 2. Infraestructura Base
- **Firebase Blaze Plan:** Pay-as-you-go (requerido para Cloud Functions y procesamiento asíncrono)
- **Google Cloud Project:** Gratis (hasta cierto uso, luego pay-as-you-go)

### Costos Recurrentes

#### 1. Google Gemini API
**Escenario: Procesar 10 archivos de 1GB/mes**

- **Embeddings:**
  - 10 archivos × 15,625 requests = 156,250 requests/mes
  - 156,250 × 32,000 caracteres = 5,000,000,000 caracteres
  - Costo: 5,000,000 × $0.0001/1,000 = **$500/mes** ⚠️

**Escenario: Procesar 100 archivos de 50MB/mes (más realista)**

- **Embeddings:**
  - 100 archivos × 781 requests = 78,100 requests/mes
  - 78,100 × 32,000 caracteres = 2,499,200,000 caracteres
  - Costo: 2,499,200 × $0.0001/1,000 = **$250/mes**

#### 2. Google Drive API
- **Gratis:** 1,000,000 requests/día
- **Costo adicional:** $0.01 por 1,000 requests adicionales
- **Para nuestro caso:** Probablemente gratis (bajo uso)

#### 3. Almacenamiento Firebase
**Escenario: 100 archivos de 50MB procesados**

- **Base de datos (Firestore):** 100 × 5.5MB = 550MB = 0.55GB
- **Storage (si se guardan archivos):** 100 × 50MB = 5GB
- **Costo:** 
  - Firestore almacenamiento: 0.55GB × $0.18 = **$0.10/mes**
  - Firestore operaciones: ~$5-10/mes (estimado para lecturas/escrituras)
  - Firebase Storage: 5GB × $0.026 = **$0.13/mes**
  - **Total almacenamiento: ~$5-10/mes**

#### 4. Procesamiento (Cloud Functions)
**Google Cloud Functions / Firebase Cloud Functions:**

- **Google Cloud Functions:** 
  - 1,000,000 invocaciones gratis
  - $0.40 por 1,000,000 invocaciones adicionales
  - **Para nuestro caso:** Probablemente gratis

### Costos Totales Estimados

#### Escenario Conservador (10 archivos grandes/mes)
- Firebase Blaze (Cloud Functions): **$10-20/mes** (dependiendo de invocaciones)
- Google Gemini Embeddings: **$500/mes** ⚠️
- Firestore + Storage: **$10/mes**
- **Total: ~$520-530/mes**

#### Escenario Realista (100 archivos medianos/mes)
- Firebase Blaze (Cloud Functions): **$15-30/mes**
- Google Gemini Embeddings: **$250/mes**
- Firestore + Storage: **$10/mes**
- **Total: ~$275-290/mes**

#### Escenario Optimizado (50 archivos pequeños/mes, <10MB)
- Firebase Blaze (Cloud Functions): **$5-10/mes**
- Google Gemini Embeddings: **$25/mes**
- Firestore + Storage: **$5/mes**
- **Total: ~$35-40/mes**

---

## 🏗️ Arquitectura Propuesta

### Opción 1: Arquitectura Híbrida (Recomendada)

```
┌─────────────────────────────────────────────────────────┐
│ 1. FRONTEND (React)                                      │
│    - Usuario selecciona carpeta de Google Drive         │
│    - Sistema lista archivos en carpeta                  │
│    - Usuario selecciona archivos a procesar            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 2. BACKEND (Firebase Cloud Function)                    │
│    - Recibe lista de archivos                           │
│    - Crea jobs de procesamiento en Firestore            │
│    - Retorna inmediatamente (no espera)                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 3. COLA DE PROCESAMIENTO (Firestore + Cloud Scheduler) │
│    - Colección: file_processing_jobs                     │
│    - Estado: pending → processing → completed/failed   │
│    - Cloud Scheduler ejecuta cada 1 minuto              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 4. WORKER (A2A Agent System o Cloud Functions)          │
│    - DocumentProcessingAgent (A2A) o Cloud Function     │
│    - Descarga archivo de Google Drive                   │
│    - Extrae texto (PDF/PPT/DOCX)                        │
│    - Divide en chunks                                    │
│    - Genera embeddings (con rate limiting)              │
│    - Guarda en Firestore (course_content_chunks)         │
└─────────────────────────────────────────────────────────┘
```

### Opción 2: Arquitectura con A2A de Google (Alternativa)

```
┌─────────────────────────────────────────────────────────┐
│ 1. FRONTEND → Firebase (crea job en Firestore)          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 2. A2A Agent System (Google)                            │
│    - AgentCoordinator detecta nuevos jobs                │
│    - DocumentProcessingAgent procesa archivos           │
│    - Actualiza estado en Firestore                      │
└─────────────────────────────────────────────────────────┘
```

**Ventajas:**
- ✅ Integrado con sistema A2A existente
- ✅ Manejo de errores robusto
- ✅ Retry automático
- ✅ Sin dependencias externas

---

## 📝 Plan de Implementación

### Fase 1: MVP - Archivos Pequeños (<10MB) ⏱️ 2-3 semanas

#### Objetivos
- Procesar PDFs pequeños
- Integración básica con Google Drive
- Procesamiento síncrono (suficiente para archivos pequeños)

#### Tareas
1. **Servicio de extracción de PDF**
   ```typescript
   // services/documentExtractionService.ts
   - Usar pdf-parse o pdfjs-dist
   - Extraer texto de PDFs
   - Dividir en chunks de 32,000 caracteres
   ```

2. **Integración con Google Drive**
   ```typescript
   // services/driveRAGService.ts
   - Listar archivos en carpeta
   - Descargar archivo
   - Procesar y extraer texto
   - Crear chunks
   - Generar embeddings
   - Guardar en course_content_chunks
   ```

3. **UI para selección de archivos**
   ```typescript
   // pages/DriveRAGIntegrationPage.tsx
   - Selector de carpeta de Drive
   - Lista de archivos
   - Botón "Procesar para RAG"
   - Indicador de progreso
   ```

#### Costos Fase 1
- Desarrollo: 40 horas
- Operación: ~$40-50/mes (Firebase Blaze + embeddings limitados)

---

### Fase 2: Archivos Medianos (10-50MB) ⏱️ 2-3 semanas

#### Objetivos
- Procesamiento asíncrono
- Soporte para PPT y DOCX
- Sistema de cola básico

#### Tareas
1. **Sistema de cola**
   ```typescript
   // Colección Firestore: file_processing_jobs
   interface FileProcessingJob {
     id: string;
     fileId: string;
     fileName: string;
     fileSize: number;
     status: 'pending' | 'processing' | 'completed' | 'failed';
     courseId: string;
     errorMessage?: string;
     createdAt: Timestamp;
     startedAt?: Timestamp;
     completedAt?: Timestamp;
   }
   ```

2. **Worker asíncrono**
   - Opción A: A2A Agent System (DocumentProcessingAgent) - Integrado con sistema existente
   - Opción B: Cloud Function que procesa jobs pendientes (triggered por Cloud Scheduler)
   - Rate limiting para embeddings
   - Manejo de errores y retry

3. **Soporte multi-formato**
   - PDF: pdf-parse
   - PPTX: Google Drive API Export
   - DOCX: mammoth

#### Costos Fase 2
- Desarrollo: 30 horas adicionales
- Operación: ~$150/mes

---

### Fase 3: Archivos Grandes (50MB-1GB) ⏱️ 3-4 semanas

#### Objetivos
- Procesamiento por streaming
- Optimización de memoria
- Soporte para carpetas anidadas

#### Tareas
1. **Procesamiento por chunks**
   - Descargar archivo por partes
   - Procesar PDF página por página
   - No cargar archivo completo en memoria

2. **Optimización de embeddings**
   - Batch processing de embeddings
   - Cache de embeddings similares
   - Compresión de embeddings (si es posible)

3. **Soporte de carpetas**
   - Recursión en subcarpetas
   - Procesamiento en lote
   - Filtros por tipo de archivo

#### Costos Fase 3
- Desarrollo: 40 horas adicionales
- Operación: ~$300/mes (dependiendo del volumen)

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Costos Altos de Embeddings
**Probabilidad:** Alta  
**Impacto:** Alto

**Mitigación:**
- Implementar cache de embeddings similares
- Comprimir texto antes de generar embeddings
- Usar batch processing
- Limitar tamaño máximo de archivo inicialmente (ej: 50MB)

### Riesgo 2: Timeouts en Procesamiento
**Probabilidad:** Media  
**Impacto:** Medio

**Mitigación:**
- Procesamiento asíncrono desde el inicio
- Sistema de cola robusto
- Retry automático con backoff exponencial

### Riesgo 3: Archivos No Procesables
**Probabilidad:** Media  
**Impacto:** Bajo

**Mitigación:**
- Validación de formato antes de procesar
- Mensajes de error claros
- Opción de procesamiento manual para casos especiales

### Riesgo 4: Calidad de Extracción
**Probabilidad:** Alta  
**Impacto:** Medio

**Mitigación:**
- Probar con diferentes librerías
- Validar calidad de texto extraído
- Permitir edición manual de chunks si es necesario

---

## 🎯 Recomendaciones Finales

### 1. Enfoque Gradual
✅ **Comenzar con archivos pequeños** (<10MB)  
✅ **Escalar gradualmente** según necesidad  
✅ **Monitorear costos** continuamente

### 2. Optimización de Costos
- **Limitar tamaño inicial:** Máximo 50MB por archivo
- **Procesar solo archivos nuevos:** Evitar reprocesamiento
- **Cache inteligente:** Reutilizar embeddings similares
- **Comprimir texto:** Reducir tokens antes de embeddings

### 3. Arquitectura Recomendada
- **Fase 1:** Procesamiento síncrono (MVP) con A2A Agent System
- **Fase 2:** Sistema de cola con Cloud Functions o A2A Agents
- **Fase 3:** Worker dedicado (Cloud Run o A2A Agent System) si el volumen lo requiere

### 4. Monitoreo
- **Métricas clave:**
  - Tiempo de procesamiento por archivo
  - Costo por archivo procesado
  - Tasa de éxito/fallo
  - Calidad de extracción (longitud de texto extraído)

---

## 📊 Resumen de Viabilidad

| Aspecto | Viabilidad | Notas |
|---------|------------|-------|
| **Técnica** | ✅ Alta | Requiere procesamiento asíncrono |
| **Económica (MVP)** | ✅ Buena | ~$50-100/mes para inicio |
| **Económica (Escala)** | ⚠️ Media | Puede llegar a $300-500/mes |
| **Tiempo de desarrollo** | ✅ Razonable | 3-4 meses para implementación completa |
| **Riesgo técnico** | ⚠️ Medio | Depende de calidad de extracción |

### Conclusión
✅ **PROYECTO VIABLE** con implementación por fases y monitoreo continuo de costos.

**Recomendación:** Comenzar con Fase 1 (MVP) y evaluar resultados antes de escalar.

---

## 🔗 Referencias Técnicas

### Librerías Recomendadas
- **PDF:** `pdf-parse`, `pdfjs-dist`
- **PPTX:** Google Drive API Export
- **DOCX:** `mammoth`
- **Embeddings:** Google Gemini `text-embedding-004`

### Documentación
- [Google Drive API](https://developers.google.com/drive/api)
- [Google Gemini Embeddings](https://ai.google.dev/docs/embeddings)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Vertex AI Vector Search](https://cloud.google.com/vertex-ai/docs/vector-search/overview)
- [Cloud Scheduler](https://cloud.google.com/scheduler/docs)

---

**Fin del Documento**

