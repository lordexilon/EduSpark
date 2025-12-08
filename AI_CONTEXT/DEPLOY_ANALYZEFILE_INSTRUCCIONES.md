# 📦 Instrucciones de Despliegue para analyzeFile

**Fecha:** Noviembre 2025  
**Estado:** ⚠️ REQUIERE DESPLIEGUE MANUAL

---

## 🔍 Situación Actual

Los cambios en `analyzeFile` están implementados en el código fuente (`index.ts`) y compilados (`lib/index.js`), pero Firebase CLI está reportando "No changes detected" cuando intenta desplegar solo `analyzeFile`.

El problema es que Firebase CLI con codebases tiene un timeout al analizar todas las funciones cuando se intenta desplegar todas juntas.

---

## ✅ Cambios Implementados

Los siguientes cambios están en el código y listos para desplegar:

1. ✅ Validación de header PDF antes de parsear
2. ✅ Manejo específico de errores `InvalidPDFException`
3. ✅ Logging mejorado para PDFs inválidos
4. ✅ Mensajes de error claros al usuario

**Archivos modificados:**
- `functions/analyzeFile/index.ts` - Código fuente
- `functions/analyzeFile/lib/index.js` - Código compilado

---

## 🚀 Opciones de Despliegue

### Opción 1: Desplegar Todas las Funciones (Recomendado si hay tiempo)

```bash
firebase deploy --only functions
```

**Nota:** Puede tardar varios minutos y puede tener timeout si alguna función tiene problemas.

### Opción 2: Desplegar Solo analyzeFile (Temporalmente)

1. **Modificar `firebase.json` temporalmente** para incluir solo `analyze-file`:

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

2. **Desplegar:**
```bash
firebase deploy --only functions --force
```

3. **Restaurar `firebase.json` original:**
```bash
Copy-Item firebase.json.backup firebase.json -Force
```

### Opción 3: Verificar si los Cambios Ya Están Desplegados

Los cambios pueden estar ya desplegados si Firebase dice "No changes detected". Para verificar:

1. **Probar la función:**
   ```bash
   curl -X POST https://analyzefile-mcc5aevj6a-uc.a.run.app \
     -H "Content-Type: application/json" \
     -d '{"fileId":"test","fileName":"test.pdf"}'
   ```

2. **Ver logs en Google Cloud Console:**
   - Ir a Cloud Run > analyzefile
   - Ver logs recientes
   - Buscar mensajes como `[analyzeFile] ⚠️ PDF inválido`

---

## 🔧 Verificación Post-Despliegue

### 1. Verificar que los Cambios Estén Activos

**Probar con un PDF inválido:**
- Los logs deberían mostrar: `[analyzeFile] ⚠️ PDF inválido o corrupto detectado`
- El usuario debería recibir un mensaje claro si el PDF es completamente inválido

### 2. Verificar Logs

En Google Cloud Console > Cloud Run > analyzefile, buscar:
- `✅ Páginas obtenidas del buffer parcial`
- `⚠️ PDF inválido o corrupto detectado`
- `📊 Estimación de páginas basada en tamaño`

---

## 📝 Notas

- Los cambios están en el código y compilados correctamente
- El problema es solo con el despliegue debido a timeouts en otras funciones
- Los cambios se aplicarán en el próximo despliegue exitoso

---

**Última actualización:** Noviembre 2025

