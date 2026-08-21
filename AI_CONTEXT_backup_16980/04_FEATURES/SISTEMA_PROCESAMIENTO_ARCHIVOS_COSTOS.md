# Sistema de Procesamiento de Archivos y Control de Costos

## 📋 Resumen Ejecutivo

Sistema completo para procesar archivos grandes de Google Drive (hasta 900 MB+) con:
- Procesamiento optimizado por lotes
- Auto-continuación para archivos que toman más de 1 hora
- Cálculo y tracking de costos reales
- Dashboard de administración para monitoreo de gastos
- Visualización en tiempo real con barra de progreso y temporizador

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **Cloud Function: `processFileJob`**
   - Procesa archivos de Google Drive
   - Genera embeddings usando Gemini API
   - Guarda chunks en Supabase con información de páginas
   - Calcula costos reales al finalizar

2. **Cloud Function: `analyzeFile`**
   - Analiza archivos antes de procesar
   - Estima costos y tiempo de procesamiento
   - Detecta tipo de PDF (texto/escaneado)

3. **Cloud Function: `createFileProcessingJob`**
   - Crea jobs de procesamiento en Firestore
   - Inicializa metadata con estimaciones

4. **Cloud Function: `cancelFileProcessingJob`**
   - Permite cancelar procesamientos en curso
   - Actualiza estado en Firestore

5. **Frontend: `FileProcessingPage`**
   - Interfaz para seleccionar y procesar archivos
   - Visualización en tiempo real del progreso
   - Barra de progreso y temporizador

6. **Frontend: `ProcessingCostsDashboardPage`**
   - Dashboard de administración
   - Visualización de costos por usuario, curso, fecha
   - Estadísticas y análisis de gastos

---

## 🔧 Configuración Técnica

### Cloud Function: processFileJob

```typescript
{
  memory: '8GiB',        // Para archivos grandes (900 MB+)
  timeoutSeconds: 3600, // 1 hora (máximo para Cloud Functions v2)
  cpu: 2,               // Mejor rendimiento
  maxInstances: 10
}
```

### Procesamiento por Lotes

- **Tamaño de lote**: 20 chunks
- **Razón**: Reducir uso de memoria y permitir auto-continuación
- **Flujo**:
  1. Generar embeddings para 20 chunks
  2. Insertar en Supabase inmediatamente
  3. Liberar memoria
  4. Verificar tiempo (si > 50 min, guardar y continuar)
  5. Repetir hasta completar

### Auto-Continuación

- **Trigger**: Si tiempo transcurrido > 50 minutos
- **Acción**: 
  - Guardar progreso en Firestore (`chunksProcessed`)
  - Marcar `continuationNeeded: true`
  - La función se ejecuta nuevamente automáticamente
  - Continúa desde el último checkpoint

---

## 📊 Sistema de Costos

### Cálculo de Costos Reales

Los costos se calculan basados en métricas reales:

```typescript
{
  ocr: number,        // Basado en páginas procesadas (si es escaneado)
  embeddings: number, // Basado en caracteres reales procesados
  cloudRun: number,   // Basado en tiempo real de ejecución (2 vCPU, 8 GiB)
  firestore: number,  // Basado en operaciones reales (writes/reads)
  total: number
}
```

### Fórmulas de Cálculo

#### OCR (solo para PDFs escaneados)
```
Si totalPages <= 1000:
  ocrCost = (totalPages / 1000) * 1.50
Si totalPages > 1000:
  ocrCost = 1.50 + ((totalPages - 1000) / 1000) * 0.60
```

#### Embeddings
```
embeddingsCost = (actualChars / 1000) * 0.0001
```

#### Cloud Run
```
cpuCost = executionTimeSeconds * 2 * 0.00002400  // 2 vCPU
memoryCost = executionTimeSeconds * 8 * 0.00000250  // 8 GiB
cloudRunCost = cpuCost + memoryCost
```

#### Firestore
```
firestoreCost = (writes / 100000) * 0.18 + (reads / 100000) * 0.06
```

### Base de Datos de Costos

**Tabla: `processing_costs`**

```sql
CREATE TABLE processing_costs (
    id UUID PRIMARY KEY,
    job_id VARCHAR(255) UNIQUE,        -- ID del job en Firestore
    user_id UUID,                      -- Usuario que procesó
    course_id INTEGER,                 -- Curso asociado
    material_id UUID,                  -- Material procesado
    file_name VARCHAR(500),
    file_size BIGINT,                  -- Tamaño en bytes
    total_pages INTEGER,
    total_chunks INTEGER,
    execution_time_seconds NUMERIC(10, 2),
    pdf_type VARCHAR(20),
    estimated_costs JSONB,             -- Costos estimados
    actual_costs JSONB NOT NULL,       -- Costos reales
    cost_difference NUMERIC(10, 4),   -- actual - estimado
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Vistas de Estadísticas:**

- `v_processing_costs_by_user`: Costos agrupados por usuario
- `v_processing_costs_by_course`: Costos agrupados por curso
- `v_processing_costs_daily`: Costos agrupados por día

---

## 📄 Extracción de Páginas Reales

### Mejora Implementada

El sistema ahora extrae y guarda información real de páginas:

1. **PDFs normales**: Usa `pdf-parse` para extraer texto por página
2. **PDFs escaneados/Imágenes**: Usa OCR y asigna página 1
3. **Metadata guardada**:
   ```typescript
   {
     page_start: number,    // Página donde comienza el chunk
     page_end: number,      // Página donde termina el chunk
     total_pages: number    // Total de páginas del documento
   }
   ```

### Función `extractTextFromPDF`

```typescript
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<{
  text: string;
  pages: Array<{pageNumber: number, text: string}>;
  totalPages: number;
}>
```

- Extrae texto completo y por página
- Retorna información estructurada de páginas
- Permite chunks con rangos de páginas precisos

---

## 🎨 Interfaz de Usuario

### Barra de Progreso

**Componente: `ProcessingProgress`**

- Muestra porcentaje de chunks procesados
- Colores dinámicos (azul = procesando, verde = completado)
- Gradiente animado
- Actualización en tiempo real

**Ejemplo visual:**
```
150 de 300 chunks completados    50%
[████████████████░░░░░░░░░░░░░░] 50%
```

### Temporizador

**Componente: `ProcessingTimer`**

- **Tiempo transcurrido**: Muestra minutos:segundos desde el inicio
- **Tiempo estimado restante**: Calculado dinámicamente basado en:
  - Progreso real (chunks procesados / total)
  - Velocidad actual de procesamiento
  - O estimación inicial si no hay progreso aún

**Ejemplo:**
```
⏰ Tiempo transcurrido: 15:32
   Tiempo estimado restante: 15m
```

### Dashboard de Costos

**Página: `/admin/processing-costs`**

**Características:**
- Tarjetas de resumen (costo total, jobs, promedio, páginas)
- Tabla de costos diarios
- Tabla de jobs individuales
- Tabla de costos por usuario
- Tabla de costos por curso
- Filtros por rango de fechas (7d, 30d, 90d, todo)

**Vistas disponibles:**
1. **Resumen**: Métricas generales y gráfico diario
2. **Jobs**: Lista detallada de todos los procesamientos
3. **Por Usuario**: Agrupación por usuario
4. **Por Curso**: Agrupación por curso
5. **Diario**: Evolución diaria de costos

---

## 🔄 Flujo Completo de Procesamiento

### 1. Análisis Previo

```
Usuario selecciona archivo → analyzeFile()
  ↓
Detecta tipo de PDF (texto/escaneado)
  ↓
Calcula páginas totales
  ↓
Estima costos y tiempo
  ↓
Muestra modal con estimación
```

### 2. Creación de Job

```
Usuario confirma → createFileProcessingJob()
  ↓
Crea material en Supabase (rag_status: 'pending')
  ↓
Crea job en Firestore (status: 'pending')
  ↓
Incluye metadata: estimatedCosts, totalPages, chunksTotal
```

### 3. Procesamiento

```
processFileJob se activa automáticamente
  ↓
1. Descargar archivo (900 MB)
  ↓
2. Extraer texto → Liberar buffer
  ↓
3. Dividir en chunks con información de páginas
  ↓
4. Para cada lote de 20 chunks:
   - Generar embeddings
   - Insertar en Supabase
   - Liberar memoria
   - Verificar tiempo (si > 50 min, guardar y continuar)
  ↓
5. Calcular costos reales
  ↓
6. Guardar costos en Supabase
  ↓
7. Actualizar material (rag_status: 'completed')
  ↓
8. Completar job
```

### 4. Visualización en Tiempo Real

```
Frontend suscrito a Firestore
  ↓
Recibe actualizaciones de chunksProcessed
  ↓
Actualiza barra de progreso
  ↓
Actualiza temporizador
  ↓
Muestra estimación de tiempo restante
```

---

## 💾 Optimizaciones de Memoria

### Estrategias Implementadas

1. **Procesamiento por lotes pequeños** (20 chunks)
   - Evita acumular demasiados datos en memoria
   - Permite liberar memoria después de cada lote

2. **Liberación de buffers**
   - Libera buffer del archivo después de extraer texto
   - Limpia referencias después de insertar chunks

3. **Garbage Collection**
   - Intenta usar `global.gc()` cuando está disponible
   - Especialmente para archivos > 100 MB

4. **Memoria aumentada**
   - De 2 GiB a 8 GiB para archivos grandes
   - CPU aumentado a 2 vCPU para mejor rendimiento

---

## 📈 Métricas y Monitoreo

### Métricas Guardadas

- **Por Job**:
  - Tiempo de ejecución real
  - Chunks procesados vs total
  - Costos estimados vs reales
  - Diferencia de costos

- **Por Usuario**:
  - Total de jobs procesados
  - Costo total acumulado
  - Costo promedio por job
  - Páginas totales procesadas

- **Por Curso**:
  - Total de jobs del curso
  - Costo total del curso
  - Páginas procesadas del curso

- **Diarias**:
  - Jobs procesados por día
  - Costo total por día
  - Tendencia de uso

---

## 🔐 Seguridad y Permisos

### Dashboard de Costos

- **Ruta**: `/admin/processing-costs`
- **Acceso**: Solo administradores y coordinadores
- **Protección**: Componente `AdminRoute`

### Cancelación de Jobs

- **Función**: `cancelFileProcessingJob`
- **Validación**: Verifica que el usuario sea el dueño del job
- **Permisos**: Solo permite cancelar jobs propios

---

## 🚀 Despliegue

### Cloud Functions

```bash
firebase deploy --only functions
```

### Base de Datos

Ejecutar script SQL en Supabase:
```sql
-- sql_scripts/crear_tabla_processing_costs.sql
```

### Variables de Entorno Requeridas

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

---

## 📝 Archivos Clave

### Backend (Cloud Functions)

- `functions/processFileJob/index.ts` - Función principal de procesamiento
- `functions/analyzeFile/index.ts` - Análisis previo de archivos
- `functions/createFileProcessingJob/index.ts` - Creación de jobs
- `functions/cancelFileProcessingJob/index.ts` - Cancelación de jobs

### Frontend

- `pages/FileProcessingPage.tsx` - Página principal de procesamiento
- `pages/ProcessingCostsDashboardPage.tsx` - Dashboard de costos
- `components/ProcessingProgress.tsx` - Componente de progreso
- `components/ProcessingTimer.tsx` - Componente de temporizador
- `components/FileAnalysisModal.tsx` - Modal de análisis previo

### Servicios

- `services/costService.ts` - Servicio para consultar costos
- `services/firestoreService.ts` - Servicio para Firestore
- `services/costEstimator.ts` - Estimación de costos

### Base de Datos

- `sql_scripts/crear_tabla_processing_costs.sql` - Script de creación de tabla

---

## 🎯 Casos de Uso

### Caso 1: Archivo Pequeño (< 100 MB)

1. Usuario selecciona archivo
2. Sistema analiza y muestra estimación
3. Usuario confirma
4. Procesamiento completo en < 10 minutos
5. Costos guardados automáticamente

### Caso 2: Archivo Grande (900 MB, 3+ horas)

1. Usuario selecciona archivo
2. Sistema analiza y muestra estimación (3 horas)
3. Usuario confirma
4. Procesamiento inicia
5. A los 50 minutos: guarda progreso y continúa
6. Se ejecuta nuevamente automáticamente
7. Continúa desde checkpoint
8. Completa procesamiento
9. Costos reales guardados

### Caso 3: Cancelación

1. Usuario inicia procesamiento
2. Usuario cancela desde la UI
3. Sistema actualiza job a 'cancelled'
4. Función detecta cancelación y se detiene
5. Progreso guardado para posible reanudación

---

## 🔍 Troubleshooting

### Problema: Memoria excedida

**Solución**: 
- Verificar que memoria esté en 8 GiB
- Verificar procesamiento por lotes (20 chunks)
- Revisar logs para identificar pico de memoria

### Problema: Timeout

**Solución**:
- Verificar que timeout esté en 3600 segundos
- Verificar auto-continuación (debe guardar progreso)
- Revisar logs para ver si se guardó checkpoint

### Problema: Costos no se guardan

**Solución**:
- Verificar que tabla `processing_costs` exista
- Verificar permisos de Service Role Key
- Revisar logs de Cloud Function

### Problema: Progreso no se actualiza

**Solución**:
- Verificar suscripción a Firestore
- Verificar que `chunksProcessed` se actualice cada 20 chunks
- Verificar conexión a Firestore

---

## 📊 Ejemplos de Costos

### Archivo Pequeño (50 páginas, texto)

```
OCR: $0.00
Embeddings: $0.0025
Cloud Run: $0.0012
Firestore: $0.0001
Total: ~$0.004 USD
```

### Archivo Mediano (500 páginas, texto)

```
OCR: $0.00
Embeddings: $0.025
Cloud Run: $0.012
Firestore: $0.001
Total: ~$0.038 USD
```

### Archivo Grande (2000 páginas, escaneado)

```
OCR: $1.50
Embeddings: $0.10
Cloud Run: $0.48 (3 horas)
Firestore: $0.004
Total: ~$2.08 USD
```

---

## 🔮 Mejoras Futuras

1. **Procesamiento paralelo**: Procesar múltiples chunks simultáneamente
2. **Compresión de embeddings**: Reducir tamaño de vectores
3. **Caché de embeddings**: Reutilizar embeddings similares
4. **Alertas de costos**: Notificar cuando se exceda un presupuesto
5. **Exportación de reportes**: PDF/Excel de costos
6. **Gráficos avanzados**: Visualización de tendencias
7. **Límites por usuario**: Configurar límites de procesamiento

---

## 📚 Referencias

- [Firebase Cloud Functions v2](https://firebase.google.com/docs/functions)
- [Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Google Gemini API](https://ai.google.dev/docs)
- [Google Vision API](https://cloud.google.com/vision/docs)

---

**Última actualización**: Enero 2025
**Versión**: 1.0.0

