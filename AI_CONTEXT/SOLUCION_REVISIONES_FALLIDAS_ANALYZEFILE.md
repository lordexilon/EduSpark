# ✅ Solución para Revisiones Fallidas de analyzeFile

**Fecha:** Noviembre 2025  
**Estado:** ✅ RESUELTO

---

## 🔍 Problema Identificado

### Síntomas:
- La consola de Cloud Run mostraba revisiones con errores:
  - `analyzefile-00023-vvr` - "The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable"
  - `analyzefile-00022-cqp` - Mismo error

### Causa Raíz:
Estas revisiones fallaron porque se intentó desplegarlas directamente usando `gcloud run deploy`, que espera un servidor HTTP que escuche en el puerto 8080. Sin embargo, las **Cloud Functions v2** se despliegan de manera diferente usando Firebase CLI, que maneja automáticamente la configuración del puerto y el contenedor.

**Error específico:**
```
Default STARTUP TCP probe failed 1 time consecutively for container "worker" on port 8080. 
The instance was not started. Connection failed with status CANCELLED.
```

---

## ✅ Solución Implementada

### Paso 1: Verificar Estado Actual
Se verificó que la revisión activa `analyzefile-00021-yub` estaba funcionando correctamente y recibiendo el 100% del tráfico.

### Paso 2: Desplegar Nueva Revisión Correcta
Se desplegó una nueva revisión usando **Firebase CLI** (el método correcto):

```bash
# 1. Modificar temporalmente firebase.json para incluir solo analyze-file
# 2. Compilar código TypeScript
cd functions/analyzeFile
npm run build
cd ../..

# 3. Desplegar usando Firebase CLI
firebase deploy --only functions
```

### Paso 3: Resultado
✅ **Despliegue exitoso:**
```
+  functions[analyze-file:analyzeFile(us-central1)] Successful update operation.
Function URL (analyze-file:analyzeFile(us-central1)): https://analyzefile-mcc5aevj6a-uc.a.run.app
```

---

## 📊 Estado Final

### Revisión Activa:
- **Nombre:** Nueva revisión creada por Firebase CLI
- **Estado:** ✅ Funcionando correctamente
- **Tráfico:** 100%
- **Método de despliegue:** Firebase CLI (correcto)

### Revisiones Fallidas:
- Las revisiones fallidas (`analyzefile-00023-vvr` y `analyzefile-00022-cqp`) ahora están marcadas como obsoletas
- Cloud Run automáticamente las eliminará después de un período de tiempo
- No afectan el funcionamiento del servicio ya que no están recibiendo tráfico

---

## 🎯 Lecciones Aprendidas

### ✅ Método Correcto para Desplegar Cloud Functions v2:

**SIEMPRE usar Firebase CLI:**
```bash
firebase deploy --only functions
```

### ❌ NO usar directamente:
```bash
gcloud run deploy analyzefile --source . --region us-central1
```

**Razón:** Cloud Run espera un servidor HTTP estándar, pero Firebase Functions v2 usa un sistema diferente que Firebase CLI maneja automáticamente.

---

## 🔧 Comandos Útiles

### Ver revisiones de un servicio:
```bash
gcloud run revisions list --service=analyzefile --region=us-central1
```

### Ver estado del servicio:
```bash
gcloud run services describe analyzefile --region=us-central1
```

### Ver tráfico de revisiones:
```bash
gcloud run services describe analyzefile --region=us-central1 --format="value(status.traffic)"
```

### Eliminar revisión obsoleta (si es necesario):
```bash
# Nota: Solo funciona si la revisión no es la "latest created"
gcloud run revisions delete REVISION_NAME --region=us-central1 --quiet
```

---

## ✅ Verificación Post-Solución

Para verificar que todo está funcionando correctamente:

1. **Verificar que la nueva revisión está activa:**
   ```bash
   gcloud run services describe analyzefile --region=us-central1 --format="value(status.latestReadyRevisionName)"
   ```

2. **Probar la función:**
   ```bash
   curl -X POST https://analyzefile-mcc5aevj6a-uc.a.run.app \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
     -d '{"fileId":"test","fileName":"test.pdf"}'
   ```

3. **Ver logs:**
   - Ir a Cloud Run > analyzefile > Logs
   - Verificar que no hay errores relacionados con el puerto 8080

---

## 📋 Resumen

| Aspecto | Estado |
|---------|--------|
| **Problema** | ✅ Identificado y resuelto |
| **Causa** | Despliegue incorrecto con `gcloud run deploy` |
| **Solución** | Despliegue correcto con Firebase CLI |
| **Revisión activa** | ✅ Funcionando correctamente |
| **Revisiones fallidas** | ✅ Marcadas como obsoletas |
| **Servicio** | ✅ Funcionando normalmente |

---

## 🚨 Prevención Futura

**Regla de oro:** Siempre usar Firebase CLI para desplegar Cloud Functions v2:

```bash
# ✅ CORRECTO
firebase deploy --only functions

# ❌ INCORRECTO (no funciona para Cloud Functions v2)
gcloud run deploy SERVICE_NAME --source . --region REGION
```

---

**Última actualización:** Noviembre 2025

