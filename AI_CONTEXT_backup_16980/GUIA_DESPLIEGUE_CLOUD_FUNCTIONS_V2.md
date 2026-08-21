# 📘 Guía Completa: Despliegue de Cloud Functions v2 en Cloud Run

**Fecha:** Noviembre 2025  
**Estado:** ✅ DOCUMENTACIÓN COMPLETA Y VERIFICADA  
**Última actualización:** 30 de Noviembre 2025

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Problema Encontrado](#problema-encontrado)
4. [Causa Raíz](#causa-raíz)
5. [Solución Implementada](#solución-implementada)
6. [Mejores Prácticas](#mejores-prácticas)
7. [Comandos de Referencia](#comandos-de-referencia)
8. [Troubleshooting](#troubleshooting)
9. [Lecciones Aprendidas](#lecciones-aprendidas)

---

## 🎯 Resumen Ejecutivo

### Contexto
EduSpark utiliza **Firebase Functions v2** que se despliegan automáticamente como servicios de **Google Cloud Run**. Durante el proceso de despliegue de mejoras en `analyzeFile`, se identificaron revisiones fallidas causadas por intentar desplegar directamente con `gcloud run deploy` en lugar de usar Firebase CLI.

### Problema Principal
Las revisiones fallidas mostraban el error:
```
The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout.
```

### Solución
Usar **Firebase CLI** (`firebase deploy --only functions`) en lugar de `gcloud run deploy` directamente, ya que Firebase CLI maneja automáticamente la configuración específica de Cloud Functions v2.

### Estado Actual
✅ **Sistema funcionando correctamente**
- Todas las funciones desplegadas y operativas
- Revisión activa funcionando al 100%
- Cambios implementados y desplegados exitosamente

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

```
Frontend (React/Vite)
    ↓
Cloud Functions v2 (Firebase)
    ↓
Google Cloud Run (Infraestructura)
    ↓
Supabase (Base de datos)
```

### Funciones Desplegadas en Cloud Run

| Función | Codebase | Estado | Última Actualización |
|---------|----------|--------|---------------------|
| `analyzefile` | `analyze-file` | ✅ Activo | Nov 2025 |
| `createfileprocessingjob` | `create-job` | ✅ Activo | Nov 2025 |
| `processfilejob` | `process-job` | ✅ Activo | Nov 2025 |
| `cancelfileprocessingjob` | `cancel-job` | ✅ Activo | Nov 2025 |
| `changeuserpassword` | `change-password` | ✅ Activo | Nov 2025 |
| `confirmuseremail` | `confirm-email` | ✅ Activo | Nov 2025 |
| `rag-worker` | N/A | ✅ Activo | Nov 2025 |

### Configuración de Firebase Functions v2

**Archivo:** `firebase.json`

```json
{
  "functions": [
    {
      "source": "functions/analyzeFile",
      "codebase": "analyze-file",
      "runtime": "nodejs20",
      "environmentVariables": {
        "GOOGLE_CLIENT_ID": "...",
        "GOOGLE_CLIENT_SECRET": "..."
      }
    }
  ]
}
```

**Características clave:**
- Cada función tiene su propio `codebase`
- Variables de entorno definidas en `firebase.json`
- Runtime: Node.js 20
- Despliegue automático a Cloud Run

---

## ⚠️ Problema Encontrado

### Síntomas

1. **En la consola de Cloud Run:**
   - Revisiones marcadas como "Con errores"
   - Mensaje: "The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable"

2. **Revisiones afectadas:**
   - `analyzefile-00023-vvr` - Fallida
   - `analyzefile-00022-cqp` - Fallida

3. **Logs de error:**
   ```
   Default STARTUP TCP probe failed 1 time consecutively for container "worker" on port 8080.
   The instance was not started. Connection failed with status CANCELLED.
   ```

### Impacto

- ⚠️ **Visual:** Las revisiones fallidas aparecían en la consola causando confusión
- ✅ **Funcional:** El servicio seguía funcionando correctamente (revisión activa no afectada)
- ⚠️ **Operacional:** No se podían eliminar las revisiones fallidas directamente (eran las "latest created")

---

## 🔍 Causa Raíz

### Análisis Técnico

**Problema:** Intento de desplegar Cloud Functions v2 usando `gcloud run deploy` directamente.

**Por qué falla:**

1. **Cloud Run espera:**
   - Un servidor HTTP estándar que escuche en el puerto 8080
   - Un contenedor Docker con configuración específica
   - Health checks HTTP estándar

2. **Cloud Functions v2 requiere:**
   - Un wrapper especial que maneja las invocaciones HTTP
   - Configuración específica de Firebase Functions
   - Manejo automático del puerto y health checks

3. **Firebase CLI hace:**
   - Genera automáticamente el wrapper necesario
   - Configura el contenedor correctamente
   - Maneja el despliegue a Cloud Run de forma transparente

### Comando Problemático

```bash
# ❌ INCORRECTO - No funciona para Cloud Functions v2
gcloud run deploy analyzefile \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

**Resultado:** El contenedor intenta iniciar pero falla porque no encuentra un servidor HTTP escuchando en el puerto 8080.

---

## ✅ Solución Implementada

### Paso 1: Verificación del Estado

```bash
# Verificar revisión activa
gcloud run services describe analyzefile \
  --region=us-central1 \
  --format="value(status.latestReadyRevisionName,status.traffic)"
```

**Resultado:** `analyzefile-00021-yub` funcionando correctamente con 100% del tráfico.

### Paso 2: Despliegue Correcto con Firebase CLI

```bash
# 1. Compilar código TypeScript
cd functions/analyzeFile
npm run build
cd ../..

# 2. Desplegar usando Firebase CLI
firebase deploy --only functions
```

**Resultado:** ✅ Nueva revisión exitosa creada (`analyzefile-00025-yim`)

### Paso 3: Verificación Post-Despliegue

```bash
# Ver revisiones
gcloud run revisions list \
  --service=analyzefile \
  --region=us-central1 \
  --limit=5
```

**Resultado:** Nueva revisión exitosa, revisión fallida marcada como obsoleta.

---

## 📚 Mejores Prácticas

### ✅ Método Correcto para Desplegar

#### Opción 1: Desplegar Todas las Funciones

```bash
# Desde la raíz del proyecto
firebase deploy --only functions
```

**Ventajas:**
- Despliega todas las funciones de una vez
- Mantiene consistencia entre funciones
- Usa la configuración de `firebase.json`

**Cuándo usar:**
- Despliegues regulares
- Cuando múltiples funciones necesitan actualizarse
- Despliegues de producción

#### Opción 2: Desplegar una Función Específica

```bash
# 1. Modificar temporalmente firebase.json para incluir solo la función deseada
# 2. Compilar código TypeScript
cd functions/NOMBRE_FUNCION
npm run build
cd ../..

# 3. Desplegar
firebase deploy --only functions

# 4. Restaurar firebase.json original
```

**Ventajas:**
- Más rápido (solo una función)
- Evita timeouts al analizar múltiples funciones
- Útil para pruebas rápidas

**Cuándo usar:**
- Desarrollo iterativo
- Cuando otras funciones tienen problemas
- Despliegues de emergencia

### ❌ Métodos a Evitar

#### NO usar `gcloud run deploy` directamente

```bash
# ❌ INCORRECTO para Cloud Functions v2
gcloud run deploy SERVICE_NAME \
  --source . \
  --region REGION
```

**Razón:** No maneja la configuración específica de Firebase Functions v2.

#### NO modificar manualmente revisiones en Cloud Run

```bash
# ❌ INCORRECTO - Puede causar inconsistencias
gcloud run services update SERVICE_NAME \
  --region REGION \
  --revision-suffix SUFFIX
```

**Razón:** Firebase CLI maneja las revisiones automáticamente.

---

## 🔧 Comandos de Referencia

### Verificación de Estado

```bash
# Ver todas las funciones en Cloud Run
gcloud run services list --region=us-central1

# Ver detalles de una función específica
gcloud run services describe SERVICE_NAME \
  --region=us-central1

# Ver revisiones de una función
gcloud run revisions list \
  --service=SERVICE_NAME \
  --region=us-central1 \
  --limit=10

# Ver tráfico de revisiones
gcloud run services describe SERVICE_NAME \
  --region=us-central1 \
  --format="value(status.traffic)"
```

### Despliegue

```bash
# Desplegar todas las funciones
firebase deploy --only functions

# Desplegar una función específica (requiere modificar firebase.json)
firebase deploy --only functions --force

# Ver logs durante el despliegue
firebase deploy --only functions --debug
```

### Logs y Monitoreo

```bash
# Ver logs de una función
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=SERVICE_NAME" \
  --limit=50 \
  --format=json

# Ver solo errores
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=SERVICE_NAME AND severity>=ERROR" \
  --limit=20

# Stream logs en tiempo real
gcloud logging tail \
  "resource.type=cloud_run_revision AND resource.labels.service_name=SERVICE_NAME"
```

### Limpieza (Opcional)

```bash
# Eliminar revisión obsoleta (solo si no es "latest created")
gcloud run revisions delete REVISION_NAME \
  --region=us-central1 \
  --quiet

# Ver revisiones obsoletas sin tráfico
gcloud run revisions list \
  --service=SERVICE_NAME \
  --region=us-central1 \
  --format="table(name,status.conditions[0].status,trafficPercent)"
```

---

## 🐛 Troubleshooting

### Problema: "No changes detected"

**Síntoma:**
```
+  functions[analyze-file:analyzeFile(us-central1)] Skipped (No changes detected)
```

**Causa:** Firebase CLI compara el código compilado con la versión desplegada y no detecta diferencias.

**Solución:**
1. Verificar que los cambios estén en el código fuente
2. Recompilar: `cd functions/FUNCION && npm run build`
3. Forzar despliegue: `firebase deploy --only functions --force`

### Problema: Timeout al analizar código

**Síntoma:**
```
Error: User code failed to load. Cannot determine backend specification. 
Timeout after 10000.
```

**Causa:** Firebase CLI está analizando múltiples funciones y alguna tiene problemas.

**Solución:**
1. Desplegar solo la función problemática (modificar `firebase.json` temporalmente)
2. Verificar dependencias en `functions/FUNCION/package.json`
3. Verificar que el código TypeScript compile correctamente

### Problema: Revisión fallida no se puede eliminar

**Síntoma:**
```
ERROR: The latest created Revision "REVISION_NAME" cannot be directly deleted.
```

**Causa:** La revisión fallida es la "latest created" y Cloud Run no permite eliminarla directamente.

**Solución:**
1. Desplegar una nueva revisión exitosa usando Firebase CLI
2. La revisión fallida quedará marcada como obsoleta
3. Cloud Run la eliminará automáticamente después de un tiempo

### Problema: Función no responde después del despliegue

**Síntoma:** La función devuelve errores o no responde después del despliegue.

**Solución:**
1. Verificar logs: `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=SERVICE_NAME" --limit=20`
2. Verificar que la revisión activa esté funcionando: `gcloud run services describe SERVICE_NAME --region=REGION`
3. Verificar variables de entorno en `firebase.json`
4. Probar la función localmente antes de desplegar

---

## 💡 Lecciones Aprendidas

### 1. Siempre usar Firebase CLI para Cloud Functions v2

**Regla de oro:** Para Cloud Functions v2, siempre usar `firebase deploy --only functions`. No intentar usar `gcloud run deploy` directamente.

### 2. Verificar antes de desplegar

**Checklist pre-despliegue:**
- [ ] Código TypeScript compila sin errores
- [ ] Dependencias instaladas (`npm install`)
- [ ] Variables de entorno configuradas en `firebase.json`
- [ ] Código probado localmente (si es posible)

### 3. Revisiones fallidas no afectan el servicio activo

**Importante:** Si una revisión falla pero hay otra revisión activa funcionando, el servicio sigue operativo. Las revisiones fallidas solo causan confusión visual en la consola.

### 4. Firebase CLI maneja automáticamente Cloud Run

**Beneficio:** Firebase CLI genera automáticamente:
- El wrapper necesario para Cloud Functions v2
- La configuración correcta del contenedor
- El manejo del puerto y health checks
- Las revisiones y el tráfico

### 5. Documentar cambios importantes

**Práctica:** Documentar:
- Cambios en la configuración de despliegue
- Problemas encontrados y soluciones
- Comandos útiles para troubleshooting
- Mejores prácticas aprendidas

---

## 📊 Estado Actual del Sistema

### Funciones Desplegadas

| Función | Estado | Revisión Activa | Tráfico |
|---------|--------|----------------|---------|
| `analyzefile` | ✅ Operativo | `analyzefile-00025-yim` | 100% |
| `createfileprocessingjob` | ✅ Operativo | Última revisión | 100% |
| `processfilejob` | ✅ Operativo | Última revisión | 100% |
| `cancelfileprocessingjob` | ✅ Operativo | Última revisión | 100% |
| `changeuserpassword` | ✅ Operativo | Última revisión | 100% |
| `confirmuseremail` | ✅ Operativo | Última revisión | 100% |
| `rag-worker` | ✅ Operativo | Última revisión | 100% |

### Configuración

- **Runtime:** Node.js 20
- **Región:** us-central1
- **Plataforma:** Cloud Run (managed)
- **Método de despliegue:** Firebase CLI

---

## 🔄 Flujo de Despliegue Recomendado

### Para Desarrollo

```bash
# 1. Hacer cambios en el código
# 2. Compilar
cd functions/FUNCION
npm run build
cd ../..

# 3. Probar localmente (si es posible)
# 4. Desplegar
firebase deploy --only functions
```

### Para Producción

```bash
# 1. Verificar cambios en branch de desarrollo
# 2. Merge a main/master
# 3. Compilar todas las funciones
cd functions
for dir in */; do
  cd "$dir"
  npm run build
  cd ..
done
cd ..

# 4. Desplegar todas las funciones
firebase deploy --only functions

# 5. Verificar despliegue
gcloud run services list --region=us-central1
```

---

## 📝 Checklist de Despliegue

### Antes de Desplegar

- [ ] Código revisado y probado
- [ ] TypeScript compila sin errores
- [ ] Dependencias actualizadas (`npm install`)
- [ ] Variables de entorno configuradas en `firebase.json`
- [ ] Backup de `firebase.json` (si se va a modificar)

### Durante el Despliegue

- [ ] Usar Firebase CLI (`firebase deploy --only functions`)
- [ ] Verificar que no hay errores en la salida
- [ ] Esperar confirmación de despliegue exitoso

### Después del Despliegue

- [ ] Verificar estado en Cloud Run Console
- [ ] Verificar logs para errores
- [ ] Probar la función manualmente
- [ ] Verificar que la revisión activa está funcionando
- [ ] Restaurar `firebase.json` si se modificó temporalmente

---

## 🎓 Recursos Adicionales

### Documentación Oficial

- [Firebase Functions v2 Documentation](https://firebase.google.com/docs/functions)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

### Documentación del Proyecto

- `AI_CONTEXT/FLUJO_COMPLETO_PROCESAMIENTO_ARCHIVOS.md` - Flujo completo del sistema
- `AI_CONTEXT/ERROR_PDF_INVALIDO_ANALYZEFILE.md` - Manejo de errores en analyzeFile
- `AI_CONTEXT/SOLUCION_PROCESAMIENTO_JOBS_PENDIENTES.md` - Solución para jobs pendientes

---

## ✅ Conclusión

El despliegue de Cloud Functions v2 en Cloud Run funciona correctamente cuando se usa Firebase CLI. Las revisiones fallidas que aparecieron fueron causadas por intentar usar `gcloud run deploy` directamente, lo cual no es compatible con Cloud Functions v2.

**Recomendación principal:** Siempre usar `firebase deploy --only functions` para desplegar Cloud Functions v2.

**Estado del sistema:** ✅ Todas las funciones operativas y funcionando correctamente.

---

**Última actualización:** 30 de Noviembre 2025  
**Mantenido por:** Equipo de Desarrollo EduSpark

