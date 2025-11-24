# 🔥 Guía Completa: Habilitar Firestore y Desplegar Cloud Functions

## 📋 Prerrequisitos

1. ✅ Tener Node.js 20+ instalado
2. ✅ Tener cuenta de Google con acceso a Firebase
3. ✅ Proyecto Firebase `eduspark-py` creado
4. ✅ Firebase CLI instalado

---

## Paso 1: Instalar Firebase CLI

Si no tienes Firebase CLI instalado:

```bash
npm install -g firebase-tools
```

Verifica la instalación:
```bash
firebase --version
```

---

## Paso 2: Iniciar Sesión en Firebase

```bash
firebase login
```

Esto abrirá tu navegador para autenticarte. Acepta los permisos.

---

## Paso 3: Inicializar Firebase en el Proyecto

Si no has inicializado Firebase en este proyecto:

```bash
firebase init
```

**Selecciona las siguientes opciones:**
- ✅ Firestore
- ✅ Functions
- ✅ Use an existing project → Selecciona `eduspark-py`
- ✅ Language: TypeScript
- ✅ ESLint: No (o Yes si prefieres)
- ✅ Install dependencies: Yes

**Nota**: Si ya tienes `firebase.json` y `.firebaserc`, puedes saltar este paso.

---

## Paso 4: Habilitar Firestore en Firebase Console

### 4.1. Ir a Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto **eduspark-py**

### 4.2. Crear Base de Datos Firestore

1. En el menú lateral, haz clic en **Firestore Database**
2. Si no está creada, haz clic en **Create database**
3. Selecciona **Start in production mode** (o test mode para desarrollo)
4. Elige una **ubicación** (recomendado: `us-central1` o `southamerica-east1` para latinoamérica)
5. Haz clic en **Enable**

**⏱️ Tiempo estimado**: 1-2 minutos

---

## Paso 5: Desplegar Reglas de Firestore

Las reglas básicas están en `firestore.rules`. Para desplegarlas:

```bash
firebase deploy --only firestore:rules
```

**Salida esperada:**
```
✔  Deployed firestore rules successfully
```

---

## Paso 6: Desplegar Índices de Firestore

Los índices están definidos en `firestore/indexes.json`. Para desplegarlos:

```bash
firebase deploy --only firestore:indexes
```

**Salida esperada:**
```
✔  Deployed firestore indexes successfully
```

**⏱️ Tiempo estimado**: 2-5 minutos (los índices se crean en segundo plano)

---

## Paso 7: Instalar Dependencias de Cloud Functions

### 7.1. Instalar dependencias en cada función

```bash
cd functions/analyzeFile
npm install
cd ../createFileProcessingJob
npm install
cd ../..
```

### 7.2. Verificar que TypeScript compile

```bash
cd functions/analyzeFile
npm run build
cd ../createFileProcessingJob
npm run build
cd ../..
```

Si hay errores, corrígelos antes de continuar.

---

## Paso 8: Configurar Variables de Entorno para Cloud Functions

Las Cloud Functions necesitan acceso a:
- Google Drive API (para descargar archivos)
- Gemini API (para embeddings)
- Supabase (para guardar chunks)

### 8.1. Habilitar APIs en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona el proyecto **eduspark-py**
3. Ve a **APIs & Services** > **Library**
4. Busca y habilita:
   - ✅ **Cloud Firestore API**
   - ✅ **Cloud Vision API** (para OCR)
   - ✅ **Google Drive API**
   - ✅ **Cloud Functions API**

### 8.2. Configurar Service Account

1. Ve a **IAM & Admin** > **Service Accounts**
2. Busca o crea un Service Account para Cloud Functions
3. Asigna los siguientes roles:
   - **Cloud Datastore User** (para Firestore)
   - **Storage Object Viewer** (para Google Drive)
   - **Cloud Vision API User** (para OCR)

**Nota**: Las Cloud Functions usan el Service Account por defecto del proyecto.

---

## Paso 9: Desplegar Cloud Functions

### 9.1. Desplegar todas las funciones

```bash
firebase deploy --only functions
```

**O desplegar una por una:**

```bash
# Desplegar analyzeFile
firebase deploy --only functions:analyzeFile

# Desplegar createFileProcessingJob
firebase deploy --only functions:createFileProcessingJob
```

**⏱️ Tiempo estimado**: 3-5 minutos por función

**⚠️ Nota sobre la Política de Limpieza de Imágenes:**

Durante el despliegue, Firebase puede preguntarte sobre una política de limpieza para imágenes de contenedores:

```
functions: No cleanup policy detected for repositories in us-central1. 
This may result in a small monthly bill as container images accumulate over time.
```

**¿Qué significa esto?**
- Firebase crea imágenes Docker internas cada vez que despliegas funciones
- Sin política de limpieza, estas imágenes se acumulan y generan costos de almacenamiento
- La política de limpieza **elimina automáticamente** imágenes antiguas para ahorrar costos

**¿Afecta mis datos o imágenes procesadas?**
- ❌ **NO afecta** tus imágenes procesadas (archivos subidos, imágenes analizadas, etc.)
- ❌ **NO afecta** tus datos en Firestore
- ✅ **Solo afecta** las imágenes Docker internas usadas para construir las funciones

**Recomendación:**
- **Desarrollo**: 1-3 días (suficiente para rollbacks rápidos)
- **Producción**: 7-30 días (permite rollbacks más antiguos)

### 9.2. Verificar el despliegue

Después del despliegue, verás las URLs de las funciones:

```
✔  functions[analyzeFile(us-central1)] Successful create operation.
Function URL (analyzeFile): https://us-central1-eduspark-py.cloudfunctions.net/analyzeFile

✔  functions[createFileProcessingJob(us-central1)] Successful create operation.
Function URL (createFileProcessingJob): https://us-central1-eduspark-py.cloudfunctions.net/createFileProcessingJob
```

---

## Paso 10: Actualizar Variables de Entorno del Frontend

Copia las URLs de las funciones y agrégalas a tu `.env` o `.env.local`:

```env
# Cloud Functions URLs
VITE_ANALYZE_FILE_URL=https://us-central1-eduspark-py.cloudfunctions.net/analyzeFile
VITE_CREATE_JOB_URL=https://us-central1-eduspark-py.cloudfunctions.net/createFileProcessingJob
```

**Nota**: Reemplaza `us-central1` con la región que elegiste.

---

## Paso 11: Verificar que Todo Funciona

### 11.1. Verificar Firestore

1. Ve a Firebase Console > Firestore Database
2. Deberías ver la base de datos creada
3. Puedes crear manualmente una colección `file_processing_jobs` para probar

### 11.2. Verificar Cloud Functions

1. Ve a Firebase Console > Functions
2. Deberías ver las dos funciones desplegadas:
   - `analyzeFile`
   - `createFileProcessingJob`

### 11.3. Probar desde el Frontend

1. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Ve a `/teacher/file-processing` en tu aplicación
3. Intenta analizar un archivo

---

## 🔧 Solución de Problemas

### Error: "Permission denied" al desplegar

**Solución**: Verifica que estés autenticado:
```bash
firebase login --reauth
```

### Error: "Functions directory does not exist"

**Solución**: Verifica que `functions/` exista y tenga la estructura correcta.

### Error: "Module not found" en las funciones

**Solución**: Asegúrate de instalar dependencias en cada función:
```bash
cd functions/analyzeFile && npm install && cd ../..
cd functions/createFileProcessingJob && npm install && cd ../..
```

### Error: "API not enabled"

**Solución**: Habilita las APIs necesarias en Google Cloud Console (ver Paso 8.1).

### Las funciones no aparecen en Firebase Console

**Solución**: 
1. Espera 1-2 minutos (puede haber delay)
2. Refresca la página
3. Verifica que el despliegue fue exitoso con `firebase functions:log`

---

## 📊 Ver Logs de Cloud Functions

Para ver los logs en tiempo real:

```bash
firebase functions:log
```

Para ver logs de una función específica:

```bash
firebase functions:log --only analyzeFile
```

---

## 🎯 Checklist Final

- [ ] Firebase CLI instalado y autenticado
- [ ] Firestore habilitado en Firebase Console
- [ ] Reglas de Firestore desplegadas
- [ ] Índices de Firestore desplegados
- [ ] APIs habilitadas en Google Cloud Console
- [ ] Dependencias de Cloud Functions instaladas
- [ ] Cloud Functions compiladas sin errores
- [ ] Cloud Functions desplegadas exitosamente
- [ ] URLs de funciones agregadas a `.env`
- [ ] Frontend puede conectarse a Firestore
- [ ] Frontend puede llamar a las Cloud Functions

---

## 🚀 Siguiente Paso: Desplegar el Worker

Una vez que las Cloud Functions estén funcionando, puedes desplegar el Worker de Cloud Run. Ver `workers/file-processing-worker/README.md` para más detalles.

---

## 📚 Recursos Adicionales

- [Documentación de Firestore](https://firebase.google.com/docs/firestore)
- [Documentación de Cloud Functions](https://firebase.google.com/docs/functions)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

