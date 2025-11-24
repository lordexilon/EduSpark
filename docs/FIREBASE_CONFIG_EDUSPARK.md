# Configuración de Firebase para EduSpark

## Valores de Configuración

Agrega estos valores a tu archivo `.env` o `.env.local`:

```env
# Firebase (para Firestore - Motor de Ingesta)
VITE_FIREBASE_API_KEY=AIzaSyAwcdqI2DJfmYY_CAuA35vnZYmYJtuL3rc
VITE_FIREBASE_AUTH_DOMAIN=eduspark-py.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=eduspark-py
VITE_FIREBASE_STORAGE_BUCKET=eduspark-py.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=470326625254
VITE_FIREBASE_APP_ID=1:470326625254:web:87632d5146a1d0332d0c27
```

## Pasos para Configurar

1. **Copia estos valores a tu `.env.local`** (o `.env` si prefieres)

2. **Habilita Firestore en Firebase Console**:
   - Ve a [Firebase Console](https://console.firebase.google.com/)
   - Selecciona el proyecto `eduspark-py`
   - Ve a **Firestore Database**
   - Clic en **Create database** (si no está creado)
   - Selecciona modo de producción o prueba
   - Elige una ubicación (ej: `us-central1`)

3. **Desplegar índices de Firestore**:
   ```bash
   firebase deploy --only firestore:indexes
   ```

4. **Desplegar reglas de Firestore**:
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Desplegar Cloud Functions** (cuando estén listas):
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

## Verificación

Después de agregar las variables, reinicia el servidor de desarrollo:

```bash
npm run dev
```

El error de importación de Firebase debería desaparecer.

