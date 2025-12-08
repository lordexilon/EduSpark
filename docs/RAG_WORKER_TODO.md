# TODO: Mejoras Pendientes para RAG Worker

## 🔴 ALTA PRIORIDAD

### 1. Arreglar Tipos de TypeScript
**Estado:** ⏳ Pendiente  
**Problema Actual:**  
- El worker está desplegado usando `ts-node` para ejecutar TypeScript directamente
- Hay 40+ errores de tipo en el código
- El `tsconfig.json` tiene `strict: false` como workaround temporal

**Solución Propuesta:**
1. Definir interfaces correctas para todos los tipos usados:
   - `FileProcessingJob` en `src/types/fileProcessing.ts`
   - Tipos de Supabase (user_google_tokens, materials, etc.)
   - Tipos de metadata de Google Drive

2. Arreglar imports problemáticos:
   - `driveService.ts:73` - `tokens.access_token` no está tipado
   - `worker.ts` - propiedades `driveFileId`, `sessionId`, `materialId` no están en los tipos
   - `supabaseService.ts` - múltiples errores de tipo `any`

3. Compilar a JavaScript en el Dockerfile:
   ```dockerfile
   # En lugar de:
   CMD ["npx", "ts-node", "index.ts"]
   
   # Usar:
   RUN npx tsc
   CMD ["node", "dist/index.js"]
   ```

**Archivos a Modificar:**
- `src/types/fileProcessing.ts` - Añadir interfaces completas
- `src/workers/file-processing-worker/tsconfig.json` - Re-habilitar `strict: true`
- `src/workers/file-processing-worker/Dockerfile` - Compilar en build time
- Todos los archivos `.ts` del worker - Arreglar tipos

**Beneficios:**
- ✅ Código más robusto y mantenible
- ✅ Detección de errores en tiempo de compilación
- ✅ Mejor performance (JavaScript compilado vs ts-node)
- ✅ Imagen Docker más pequeña (sin TypeScript en runtime)

**Tiempo Estimado:** 4-6 horas

---

### 2. Centralizar Tipos Compartidos
**Estado:** ⏳ Pendiente  
**Problema Actual:**  
- El worker intenta importar tipos desde `../../types/fileProcessing`
- Esto causa errores porque el worker se deploya independientemente
- Duplicación de definiciones de tipos

**Solución Propuesta:**
1. Crear paquete NPM privado o workspace compartido:
   ```
   packages/
     shared-types/
       src/
         fileProcessing.ts
         materials.ts
         googleDrive.ts
   ```

2. O copiar tipos necesarios al worker:
   ```
   src/workers/file-processing-worker/
     types/
       fileProcessing.ts (copia local)
   ```

3. Configurar build para incluir tipos:
   ```json
   // package.json del worker
   {
     "dependencies": {
       "@eduspark/shared-types": "workspace:*"
     }
   }
   ```

**Beneficios:**
- ✅ Un solo source of truth para tipos
- ✅ Más fácil mantener sincronizado frontend y worker
- ✅ Evita duplicación de código

**Tiempo Estimado:** 2-3 horas

---

## 🟡 MEDIA PRIORIDAD

### 3. Implementar Manejo Robusto de Errores
**Estado:** ⏳ Pendiente  
**Problema Actual:**  
- Algunos errores no son categorizados correctamente
- Falta retry logic para errores transitorios
- No hay circuit breaker para fallas repetidas

**Solución Propuesta:**
1. Categorizar errores:
   ```typescript
   enum ErrorType {
     TRANSIENT,      // Retry
     PERMANENT,      // Mark as failed
     RATE_LIMIT,     // Exponential backoff
     AUTH_FAILURE    // Refresh token
   }
   ```

2. Implementar retry con exponential backoff:
   ```typescript
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (!isRetryable(error) || i === maxRetries - 1) throw error;
         await sleep(Math.pow(2, i) * 1000);
       }
     }
   }
   ```

**Tiempo Estimado:** 3-4 horas

---

### 4. Añadir Métricas y Observabilidad
**Estado:** ⏳ Pendiente  
**Solución Propuesta:**
1. Integrar Google Cloud Monitoring
2. Métricas clave:
   - Jobs procesados/hora
   - Tiempo promedio de procesamiento
   - Tasa de errores por tipo
   - Uso de memoria/CPU

**Tiempo Estimado:** 2-3 horas

---

## 🟢 BAJA PRIORIDAD

### 5. Optimizar Tamaño de Imagen Docker
**Estado:** ⏳ Pendiente  
**Problema Actual:**  
- Imagen Docker incluye todas las dependencias de desarrollo
- Tamaño actual: ~800 MB

**Solución Propuesta:**
- Multi-stage build
- Tamaño objetivo: ~300 MB

**Tiempo Estimado:** 1-2 horas

---

### 6. Tests Unitarios e Integración
**Estado:** ⏳ Pendiente  
**Solución Propuesta:**
- Tests para procesamiento de PDFs
- Tests para integración con Gemini API
- Tests para retry logic

**Tiempo Estimado:** 6-8 horas

---

## 📊 PRIORIZACIÓN RECOMENDADA

1. **Semana 1:** Arreglar tipos de TypeScript (#1)
2. **Semana 2:** Centralizar tipos compartidos (#2)
3. **Semana 3:** Manejo robusto de errores (#3)
4. **Semana 4:** Métricas y observabilidad (#4)
5. **Backlog:** Optimizaciones (#5, #6)

---

## 🔗 REFERENCIAS

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Cloud Run Best Practices](https://cloud.google.com/run/docs/tips/general)
- [Google Cloud Monitoring](https://cloud.google.com/monitoring/docs)
