# 🚀 Despliegue Rápido - Optimizaciones de Costos

## ✅ Verificación Pre-Despliegue

### 1. Verificar que estás en el directorio correcto

```bash
# Desde la raíz del proyecto
pwd
# Debe mostrar: .../eduspark
```

### 2. Verificar que Firebase CLI está instalado

```bash
firebase --version
# Debe mostrar una versión (ej: 13.0.0)
```

Si no está instalado:
```bash
npm install -g firebase-tools
firebase login
```

### 3. Verificar que estás autenticado

```bash
firebase projects:list
# Debe mostrar tu proyecto
```

---

## 🚀 Despliegue (3 Opciones)

### Opción 1: Desplegar TODO (Más Simple) ⭐ RECOMENDADO

```bash
firebase deploy --only functions
```

**Tiempo estimado**: 5-10 minutos

### Opción 2: Desplegar Solo las Funciones Modificadas

```bash
firebase deploy --only functions:process-job,functions:create-job,functions:analyze-file
```

**Tiempo estimado**: 3-5 minutos

### Opción 3: Desplegar Una por Una (Si hay problemas)

```bash
# 1. La más importante (processFileJob)
firebase deploy --only functions:process-job

# 2. createFileProcessingJob
firebase deploy --only functions:create-job

# 3. analyzeFile
firebase deploy --only functions:analyze-file
```

---

## ✅ Verificación Post-Despliegue

### 1. Ver en Firebase Console

1. Ve a: https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a **Functions** (en el menú lateral)
4. Verifica:
   - ✅ `processFileJob` muestra **4GB** de memoria (no 8GB)
   - ✅ Timestamp reciente (hace unos minutos)

### 2. Verificar en Logs

```bash
# Ver logs de la función más reciente
firebase functions:log --only processFileJob --limit 5
```

### 3. Probar con un Archivo Nuevo

1. Sube un archivo nuevo para procesar
2. En los logs, busca: `chunkSize: 60` o `60 páginas por chunk`
3. Verifica que la memoria usada sea ~4GB

---

## 📊 Resultado Esperado

Después del despliegue exitoso, deberías ver:

```
✔  functions[processFileJob(us-central1)] Successful update operation.
✔  functions[createFileProcessingJob(us-central1)] Successful update operation.
✔  functions[analyzeFile(us-central1)] Successful update operation.

✔  Deploy complete!
```

---

## ⚠️ Si Hay Errores

### Error: "Permission denied"
```bash
firebase login --reauth
```

### Error: "Function not found"
```bash
# Verificar que el proyecto está correcto
firebase use --add
# Selecciona tu proyecto
```

### Error: "Build failed"
```bash
# Compilar manualmente primero
cd functions/processFileJob
npm install
npm run build
cd ../..
firebase deploy --only functions
```

---

## 🎯 Checklist Final

- [ ] Firebase CLI instalado y autenticado
- [ ] Estás en el directorio raíz del proyecto
- [ ] Cambios guardados en los archivos
- [ ] Despliegue ejecutado
- [ ] Verificado en Firebase Console
- [ ] Probado con un archivo nuevo

---

## 📝 Notas

- **Downtime**: Mínimo (las funciones se actualizan sin interrumpir)
- **Jobs existentes**: No se ven afectados
- **Nuevos jobs**: Usarán automáticamente la nueva configuración

¡Listo para desplegar! 🚀

