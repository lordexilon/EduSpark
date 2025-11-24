# Configuración de Firebase para Motor de Ingesta

## Pasos para Configurar Firebase

### 1. Crear Proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el **Project ID**

### 2. Habilitar Firestore

1. En Firebase Console, ve a **Firestore Database**
2. Clic en **Create database**
3. Selecciona modo de producción o prueba
4. Elige una ubicación (ej: `us-central1`)

### 3. Obtener Configuración de Firebase

1. Ve a **Project Settings** (ícono de engranaje)
2. Baja hasta **Your apps**
3. Si no tienes una app web, clic en **</>** (Add app)
4. Registra la app con un nombre (ej: "EduSpark Web")
5. Copia los valores de configuración:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 4. Agregar Variables al .env

Agrega estas variables a tu archivo `.env` o `.env.local`:

```env
# Firebase (para Firestore)
VITE_FIREBASE_API_KEY=AIza... (del paso 3)
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto-id
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 5. Desplegar Índices de Firestore

```bash
# Instalar Firebase CLI si no lo tienes
npm install -g firebase-tools

# Iniciar sesión
firebase login

# Inicializar Firebase en el proyecto (si no está inicializado)
firebase init firestore

# Desplegar índices
firebase deploy --only firestore:indexes
```

### 6. Configurar Reglas de Firestore

Las reglas básicas están en `firestore.rules`. Para desplegarlas:

```bash
firebase deploy --only firestore:rules
```

**Nota**: En producción, deberías restringir el acceso basado en `userId` en el metadata del trabajo.

### 7. Desplegar Cloud Functions

```bash
cd functions
npm install

# Desplegar todas las funciones
firebase deploy --only functions

# O desplegar una función específica
firebase deploy --only functions:analyzeFile
firebase deploy --only functions:createFileProcessingJob
```

Después del deploy, copia las URLs de las funciones y agrégalas a tu `.env`:

```env
VITE_ANALYZE_FILE_URL=https://us-central1-tu-proyecto.cloudfunctions.net/analyzeFile
VITE_CREATE_JOB_URL=https://us-central1-tu-proyecto.cloudfunctions.net/createFileProcessingJob
```

### 8. Configurar Service Account para Worker

1. En Google Cloud Console, ve a **IAM & Admin** > **Service Accounts**
2. Crea un nuevo Service Account o usa uno existente
3. Asigna los siguientes roles:
   - **Cloud Datastore User** (para Firestore)
   - **Storage Object Viewer** (para Google Drive)
   - **Cloud Vision API User** (para OCR)
4. Crea una clave JSON:
   - Clic en el Service Account
   - Pestaña **Keys**
   - **Add Key** > **Create new key** > **JSON**
5. Guarda el archivo JSON de forma segura
6. Configura `GOOGLE_APPLICATION_CREDENTIALS` en Cloud Run apuntando a este archivo

## Verificación

Después de configurar todo, verifica:

1. ✅ Firestore está habilitado y los índices están desplegados
2. ✅ Las Cloud Functions están desplegadas y funcionando
3. ✅ Las variables de entorno están configuradas en `.env.local`
4. ✅ El frontend puede conectarse a Firestore (ver consola del navegador)

