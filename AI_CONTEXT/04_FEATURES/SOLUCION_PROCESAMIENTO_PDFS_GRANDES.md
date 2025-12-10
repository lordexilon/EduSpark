# 📄 Solución Definitiva: Procesamiento de PDFs Grandes (RAG)

**Fecha:** 9 de Diciembre, 2025
**Estado:** Implementado y Validado
**Componente:** RAG Worker (VM) + Supabase

---

## 1. El Problema: "JavaScript heap out of memory"

El sistema original usaba `pdf-lib` y `pdf-parse` para procesar archivos. Esto funcionaba bien para documentos pequeños (< 20MB), pero fallaba catastróficamente con libros grandes (ej. *Harrison*, 137MB, 8000+ páginas).

### Causa Raíz
1. **Carga en Memoria:** `pdf-lib` intenta cargar todo el buffer del PDF en RAM y decodificar todos los objetos XRef. Para un PDF de 137MB, el uso de RAM se disparaba a >4GB.
2. **Límite de V8:** Node.js tiene un límite de heap por defecto (~2GB). Incluso aumentando `--max-old-space-size`, la fragmentación de memoria provocaba crashes.
3. **Bloqueo del Event Loop:** El procesamiento síncrono de miles de páginas bloqueaba el worker, causando timeouts.

---

## 2. La Solución: Streaming y División (Chunking)

En lugar de procesar el archivo entero en memoria, implementamos una estrategia de **"Divide y Vencerás"** usando herramientas nativas de bajo nivel.

### Arquitectura Implementada

1. **Herramienta Core: `qpdf`**
   - Herramienta CLI de C++ extremadamente eficiente.
   - Capaz de manipular PDFs como streams sin cargarlos completos.
   - Instalada en la VM: `sudo apt-get install qpdf`.

2. **Flujo de Procesamiento Híbrido:**
   ```mermaid
   graph TD
   A[Nuevo Job] --> B{¿Tamaño > 50MB?}
   B -- No --> C[Procesamiento Normal (Memoria)]
   B -- Sí --> D[Estrategia Big File]
   
   D --> E[Descargar a Disco /tmp]
   E --> F[Dividir con qpdf en chunks de 500 págs]
   F --> G[Procesar cada chunk secuencialmente]
   G --> H[Extraer Texto y Metadata]
   H --> I[Generar Embeddings]
   I --> J[Limpiar Disco]
   ```

3. **Manejo de Estado Robusto:**
   - **Persistencia Parcial:** Los chunks procesados se guardan inmediatamente en Supabase.
   - **Recuperación de Fallos:** Antes de empezar, el worker verifica si el material ya tiene chunks en la DB. Si existen, salta la extracción y continúa con los embeddings.

---

## 3. Lecciones Aprendidas y Prevención de Errores

Durante la implementación, nos encontramos con varios problemas críticos. Aquí documentamos cómo evitarlos en el futuro.

### 🛑 Error 1: "ReferenceError" y Scope de Variables
**El Bug:** El worker crasheaba con `chunks is not defined` o `pdfResult is not defined` en el bloque `finally` o al guardar metadata.
**Causa:** Variables declaradas dentro de bloques `if/else` (block scope) pero accedidas fuera de ellos.
**Prevención:**
- **Regla:** Declarar variables críticas (`chunks`, `totalPages`) al inicio de la función principal usando `let`.
- **Linter:** Habilitar reglas estrictas de `no-undef` y `block-scoped-var`.

### 🛑 Error 2: "Zombie Jobs" (Stuck Processing)
**El Bug:** Si el worker se reiniciaba (o crasheaba) mientras procesaba un job, este quedaba en estado `processing` para siempre. El worker ignoraba estos jobs al reiniciar.
**Causa:** La query de búsqueda excluye `processing` para evitar duplicidad, pero no tenía lógica de "timeout".
**Solución Implementada:**
- Script de detección (`check_active_jobs.js`).
- Lógica de "Revivir": Si un job lleva >2 horas en `processing` sin updates, se considera zombie.
**Mejora Futura:** Implementar un "heartbeat" (actualizar `updated_at` cada min) y una política automática en el worker para resetear jobs con heartbeat antiguo.

### 🛑 Error 3: Offset de Páginas
**El Bug:** Las citas de páginas salían incorrectas (ej. página 1500 apuntaba a la 1000).
**Causa:** Al dividir el PDF, cada chunk empezaba en página 1. Se sumaba un offset manual, pero la función de extracción *ya sumaba* otro offset, duplicando el desplazamiento.
**Prevención:**
- **Validación:** Verificar siempre la lógica 0-indexed vs 1-indexed.
- **Pruebas Unitarias:** Crear tests con un PDF sintético pequeño (5 páginas) donde sea fácil verificar manualmente los índices.

### 🛑 Error 4: Sincronización Frontend/Backend
**El Bug:** El worker terminaba exitosamente, pero el frontend seguía mostrando "Procesando".
**Causa:** El worker no actualizaba explícitamente el estado a `completed` en la tabla `materials`, solo en `jobs`. O faltaba la columna `completed_at` en la query de actualización.
**Prevención:**
- **Transaccionalidad:** Actualizar tablas relacionadas en una misma operación lógico (o usar Triggers de Supabase).
- **Esquema Claro:** Verificar siempre que los campos referenciados (`completed_at`) existan en el esquema de producción.

### 🛑 Error 5: Columnas Inexistentes en Updates
**El Bug:** El worker intentaba actualizar columnas que no existen en las tablas, causando que los updates fallaran silenciosamente.
**Columnas incorrectas:**
- `file_processing_jobs.completed_at` → **NO EXISTE**
- `materials.updated_at` → **NO EXISTE**

**Prevención:**
- Siempre verificar el esquema de la tabla antes de agregar campos a un update.
- Usar herramientas como `\d table_name` en psql o revisar los scripts SQL de creación.

**Fix aplicado:**
```javascript
// ANTES (fallaba):
await supabase.from('file_processing_jobs').update({
    status: 'completed',
    completed_at: new Date().toISOString(), // NO EXISTE
    updated_at: new Date().toISOString()
}).eq('id', job.id);

await supabase.from('materials').update({
    rag_status: 'completed',
    updated_at: new Date().toISOString() // NO EXISTE
}).eq('id', materialId);

// DESPUÉS (funciona):
await supabase.from('file_processing_jobs').update({
    status: 'completed',
    metadata: { ...job.metadata, phase: 'completed' },
    updated_at: new Date().toISOString()
}).eq('id', job.id);

await supabase.from('materials').update({
    rag_status: 'completed'
}).eq('id', materialId);
```

---

## 4. Scripts de Mantenimiento

Se han creado scripts en `functions/rag-worker/` para diagnóstico y recuperación:

- `check_status.js`: Verifica estado real de un job.
- `reset_stuck_job.js`: Resetea jobs "zombie" a `pending`.
- `manual_complete.js`: Fuerza el estado `completed` si hay desincronización.

## 5. Conclusión

Para el procesamiento de archivos pesados en sistemas limitados (Cloud Functions, VMs pequeñas), **nunca confiar en la memoria RAM**. Siempre preferir:
1.  **Streaming** sobre Carga Completa.
2.  **Archivos Temporales en Disco** sobre Buffers en Memoria.
3.  **Herramientas Nativas (qpdf, ffmpeg)** sobre Librerías JS Puras para tareas pesadas.
