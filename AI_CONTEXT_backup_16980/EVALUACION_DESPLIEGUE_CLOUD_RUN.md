# 🔍 Evaluación del Despliegue en Cloud Run

**Fecha:** Noviembre 2025  
**Estado:** ✅ ANÁLISIS COMPLETO Y SOLUCIÓN PROPUESTA

---

## 📊 Situación Actual

### Estado de las Funciones en Cloud Run

Según la consola de Google Cloud Run, todas las funciones están desplegadas como servicios de Cloud Run:

| Función | Estado | Última Implementación | Tipo |
|---------|--------|----------------------|------|
| `analyzefile` | ✅ Activo | Hace 1 hora | Función |
| `cancelfileprocessingjob` | ⚠️ Error | Hace 12 días | Función |
| `changeuserpassword` | ✅ Activo | Hace 3 horas | Función |
| `createfileprocessingjob` | ✅ Activo | Hace 4 horas | Función |
| `processfilejob` | ✅ Activo | Hace 4 horas | Función |
| `rag-worker` | ✅ Activo | Hace 8 horas | Función |

### Revisión Activa de `analyzefile`

- **Revisión activa:** `analyzefile-00021-yub`
- **Estado:** ✅ Funcionando correctamente
- **URL:** `https://analyzefile-mcc5aevj6a-uc.a.run.app`
- **Último despliegue exitoso:** Hace aproximadamente 1 hora

### Intentos Fallidos de Despliegue Directo

Se detectaron 2 revisiones fallidas:
- `analyzefile-00023-vvr` - Falló al intentar desplegar con `gcloud run deploy`
- `analyzefile-00022-cqp` - Falló al intentar desplegar con `gcloud run deploy`

**Causa del fallo:** `gcloud run deploy` espera un servidor HTTP que escuche en el puerto 8080, pero las Cloud Functions v2 se despliegan de manera diferente usando Firebase CLI.

---

## ✅ Cambios Implementados en Código

Los siguientes cambios están implementados en el código fuente y compilado:

1. ✅ **Validación de header PDF** antes de parsear
2. ✅ **Manejo específico de errores** `InvalidPDFException`
3. ✅ **Logging mejorado** para PDFs inválidos
4. ✅ **Mensajes de error claros** al usuario

**Archivos modificados:**
- `functions/analyzeFile/index.ts` - Código fuente ✅
- `functions/analyzeFile/lib/index.js` - Código compilado ✅

---

## 🔍 Verificación: ¿Están los Cambios Desplegados?

### Opción 1: Verificar Revisión Activa

La revisión activa (`analyzefile-00021-yub`) fue desplegada hace 1 hora. Necesitamos verificar si contiene los cambios más recientes.

**Comando para verificar:**
```bash
gcloud run revisions describe analyzefile-00021-yub --region=us-central1 --format="value(spec.containers[0].image)"
```

### Opción 2: Probar la Función

Probar con un PDF inválido y verificar los logs:
```bash
curl -X POST https://analyzefile-mcc5aevj6a-uc.a.run.app \
  -H "Content-Type: application/json" \
  -d '{"fileId":"test","fileName":"test.pdf"}'
```

Luego verificar logs en Google Cloud Console para ver si aparecen los mensajes:
- `[analyzeFile] ⚠️ PDF inválido o corrupto detectado`
- `[analyzeFile] 📊 Estimación de páginas basada en tamaño`

---

## 🎯 Solución Recomendada

### **Solución 1: Desplegar Solo `analyzeFile` con Firebase CLI (RECOMENDADO)**

Esta es la forma correcta de desplegar Cloud Functions v2:

1. **Modificar temporalmente `firebase.json`** para incluir solo `analyze-file`:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore/indexes.json"
  },
  "functions": [
    {
      "source": "functions/analyzeFile",
      "codebase": "analyze-file",
      "runtime": "nodejs20",
      "environmentVariables": {
        "GOOGLE_CLIENT_ID": "468517556859-qtbplkfnqqc6ru8ga7o3d1npo76t1b62.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "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"
      }
    }
  ]
}
```

2. **Compilar el código TypeScript:**
```bash
cd functions/analyzeFile
npm run build
cd ../..
```

3. **Desplegar:**
```bash
firebase deploy --only functions --force
```

4. **Restaurar `firebase.json` original:**
```bash
Copy-Item firebase.json.backup firebase.json -Force
```

**Ventajas:**
- ✅ Usa el método correcto para Cloud Functions v2
- ✅ Evita timeouts al analizar solo una función
- ✅ Firebase CLI maneja correctamente el despliegue a Cloud Run

**Desventajas:**
- ⚠️ Requiere modificar temporalmente `firebase.json`

---

### **Solución 2: Desplegar Todas las Funciones (Si hay tiempo)**

Si tienes tiempo y quieres asegurarte de que todas las funciones estén actualizadas:

```bash
firebase deploy --only functions
```

**Ventajas:**
- ✅ Despliega todas las funciones de una vez
- ✅ No requiere modificar `firebase.json`

**Desventajas:**
- ⚠️ Puede tardar varios minutos
- ⚠️ Puede tener timeout si alguna función tiene problemas
- ⚠️ Si falla, no sabrás cuál función causó el problema

---

### **Solución 3: Verificar si los Cambios Ya Están Desplegados**

Es posible que los cambios ya estén desplegados en la revisión activa (`analyzefile-00021-yub`).

**Pasos para verificar:**

1. **Probar la función con un PDF inválido:**
   ```bash
   curl -X POST https://analyzefile-mcc5aevj6a-uc.a.run.app \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
     -d '{"fileId":"test-invalid","fileName":"invalid.pdf"}'
   ```

2. **Ver logs en Google Cloud Console:**
   - Ir a Cloud Run > analyzefile > Logs
   - Buscar mensajes como:
     - `[analyzeFile] ⚠️ PDF inválido o corrupto detectado`
     - `[analyzeFile] 📊 Estimación de páginas basada en tamaño`

3. **Si los logs muestran los nuevos mensajes:**
   - ✅ Los cambios ya están desplegados
   - No es necesario desplegar nuevamente

---

## 🚫 **NO USAR: Despliegue Directo con `gcloud run deploy`**

**❌ NO usar este método:**
```bash
gcloud run deploy analyzefile --source . --region us-central1
```

**Razón:** Cloud Run espera un servidor HTTP que escuche en el puerto 8080, pero las Cloud Functions v2 se despliegan de manera diferente. Firebase CLI maneja esto automáticamente.

**Evidencia:** Las revisiones `analyzefile-00022-cqp` y `analyzefile-00023-vvr` fallaron con este método.

---

## 📋 Plan de Acción Recomendado

### Paso 1: Verificar Estado Actual
1. Probar la función `analyzeFile` con un PDF inválido
2. Revisar logs en Google Cloud Console
3. Determinar si los cambios ya están desplegados

### Paso 2: Desplegar si es Necesario
1. Si los cambios NO están desplegados:
   - Usar **Solución 1** (desplegar solo `analyzeFile` con Firebase CLI)
2. Si los cambios YA están desplegados:
   - No es necesario hacer nada
   - Los cambios están activos

### Paso 3: Verificación Post-Despliegue
1. Probar la función nuevamente
2. Verificar logs para confirmar que los nuevos mensajes aparecen
3. Documentar el resultado

---

## 🔧 Comandos Útiles

### Ver estado de todas las funciones:
```bash
gcloud run services list --region=us-central1
```

### Ver revisiones de una función específica:
```bash
gcloud run revisions list --service=analyzefile --region=us-central1
```

### Ver logs de una función:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=analyzefile" --limit 50 --format json
```

### Probar función:
```bash
curl -X POST https://analyzefile-mcc5aevj6a-uc.a.run.app \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -d '{"fileId":"test","fileName":"test.pdf"}'
```

---

## ✅ Conclusión

**Recomendación:** Usar **Solución 1** (desplegar solo `analyzeFile` con Firebase CLI) para asegurar que los cambios estén desplegados correctamente.

**Alternativa:** Si prefieres verificar primero, usar **Solución 3** para determinar si los cambios ya están desplegados antes de intentar desplegar nuevamente.

**NO usar:** Despliegue directo con `gcloud run deploy` ya que no es compatible con Cloud Functions v2.

---

**Última actualización:** Noviembre 2025

