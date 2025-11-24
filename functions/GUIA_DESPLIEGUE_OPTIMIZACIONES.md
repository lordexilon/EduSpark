# Guía de Despliegue - Optimizaciones de Costos

## ⚠️ IMPORTANTE: Funciones Modificadas

Las siguientes funciones fueron modificadas y **DEBEN ser redesplegadas**:

1. ✅ **`processFileJob`** - Cambios en:
   - Memoria: 8GB → 4GB
   - ChunkSize default: 25 → 60 páginas
   - Metadatos optimizados

2. ✅ **`createFileProcessingJob`** - Cambios en:
   - ChunkSize default: 25 → 60 páginas

3. ✅ **`analyzeFile`** - Cambios en:
   - ChunkSize default: 25 → 60 páginas

---

## 🚀 Pasos para Desplegar

### Opción 1: Desplegar Todas las Funciones (Recomendado)

```bash
# Desde la raíz del proyecto
cd functions
npm run deploy
```

O desde la raíz:

```bash
firebase deploy --only functions
```

### Opción 2: Desplegar Funciones Específicas

Si solo quieres desplegar las funciones modificadas:

```bash
# Desplegar solo processFileJob (la más importante)
firebase deploy --only functions:processFileJob

# Desplegar createFileProcessingJob
firebase deploy --only functions:createFileProcessingJob

# Desplegar analyzeFile
firebase deploy --only functions:analyzeFile
```

### Opción 3: Desplegar por Codebase

Según el `firebase.json`, los codebases son:

```bash
# Desplegar todas las funciones modificadas
firebase deploy --only functions:process-job,functions:create-job,functions:analyze-file
```

---

## ✅ Verificación Post-Despliegue

### 1. Verificar en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a **Functions**
4. Verifica que las funciones muestren:
   - **processFileJob**: Memoria 4GB (no 8GB)
   - Versiones actualizadas con timestamp reciente

### 2. Verificar Configuración

Puedes verificar la configuración ejecutando:

```bash
firebase functions:config:get
```

### 3. Probar con un Archivo Nuevo

1. Sube un archivo nuevo para procesar
2. Verifica en los logs que use `chunkSize: 60`
3. Verifica que la memoria usada sea ~4GB (no 8GB)

---

## 📋 Checklist Pre-Despliegue

- [ ] Verificar que estás en la rama correcta
- [ ] Verificar que los cambios están guardados
- [ ] Verificar que tienes acceso a Firebase
- [ ] Verificar que las variables de entorno están configuradas
- [ ] Hacer backup de la configuración actual (opcional)

---

## 🔍 Verificar Cambios Implementados

### En `processFileJob/index.ts`:
- [x] Línea 765: `memory: '4GiB'` (era 8GiB)
- [x] Línea 768: `maxInstances: 5` (comentario actualizado)
- [x] Línea 971: `chunkSize || 60` (era 25)
- [x] Líneas 1051-1067: Metadatos optimizados (sin sourceFileId/sourceFileName)

### En `createFileProcessingJob/index.ts`:
- [x] Línea 107: `chunkSize = 60` (era 25)

### En `analyzeFile/index.ts`:
- [x] Línea 95: `chunkSize: number = 60` (era 25)

---

## ⚠️ Notas Importantes

### Impacto en Jobs Existentes

- **Jobs ya procesados**: No se verán afectados (ya tienen sus chunks)
- **Jobs en proceso**: Pueden continuar con la configuración anterior
- **Nuevos jobs**: Usarán automáticamente la nueva configuración (60 páginas, 4GB)

### Rollback (Si es Necesario)

Si necesitas revertir los cambios:

```bash
# Revertir a commit anterior
git checkout HEAD~1 -- functions/processFileJob/index.ts
git checkout HEAD~1 -- functions/createFileProcessingJob/index.ts
git checkout HEAD~1 -- functions/analyzeFile/index.ts

# Redesplegar
firebase deploy --only functions
```

---

## 📊 Monitoreo Post-Despliegue

### Métricas a Observar

1. **Memoria usada**: Debe ser ~4GB (no 8GB)
2. **Chunks generados**: Debe ser ~58% menos que antes
3. **Costos**: Deben reducirse significativamente
4. **Tiempo de procesamiento**: Puede aumentar ligeramente (chunks más grandes)

### Ejecutar Análisis

Después de procesar algunos archivos nuevos, ejecuta:

```sql
-- En Supabase SQL Editor
-- Ver archivo: sql_scripts/analizar_uso_almacenamiento_resumen.sql
```

---

## 🆘 Troubleshooting

### Error: "Function deployment failed"

1. Verifica que tienes permisos en Firebase
2. Verifica que las dependencias están instaladas:
   ```bash
   cd functions/processFileJob
   npm install
   ```
3. Verifica que TypeScript compila sin errores:
   ```bash
   npm run build
   ```

### Error: "Memory limit exceeded"

- Esto no debería pasar con 4GB, pero si ocurre:
  - Verifica que no hay memory leaks
  - Considera aumentar temporalmente a 6GB si es necesario

### Los nuevos jobs no usan chunkSize 60

- Verifica que la función se desplegó correctamente
- Verifica los logs de Cloud Functions
- Verifica que el código tiene `chunkSize = 60` como default

---

## ✅ Confirmación de Despliegue Exitoso

Después de desplegar, deberías ver:

```
✔  functions[processFileJob(us-central1)] Successful update operation.
✔  functions[createFileProcessingJob(us-central1)] Successful update operation.
✔  functions[analyzeFile(us-central1)] Successful update operation.
```

---

## 📝 Notas Finales

- **Tiempo estimado de despliegue**: 5-10 minutos
- **Downtime**: Mínimo (las funciones se actualizan sin interrumpir jobs en proceso)
- **Impacto**: Solo afecta nuevos jobs, los existentes no se modifican

¡Las optimizaciones están listas para desplegar! 🚀

