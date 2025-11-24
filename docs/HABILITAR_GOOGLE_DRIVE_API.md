# Cómo Habilitar la API de Google Drive

## Problema

La Cloud Function está intentando acceder a Google Drive API pero recibe el error:
```
Google Drive API has not been used in project 470326625254 before or it is disabled.
```

## Solución

### Paso 1: Identificar el Proyecto de Google Cloud Correcto

El proyecto de Firebase es **`eduspark-py`**. Necesitas encontrar el **número de proyecto** de Google Cloud asociado.

**Opción A: Desde Firebase Console**
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto **eduspark-py**
3. Ve a **Configuración del proyecto** (⚙️)
4. En la sección **General**, busca **Número de proyecto de Google Cloud**
5. Anota este número (será algo como `468517556859` o similar)

**Opción B: Desde Google Cloud Console**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. En el selector de proyectos (arriba), busca **eduspark-py**
3. El número de proyecto aparece junto al nombre

### Paso 2: Habilitar la API de Google Drive

El número de proyecto de Google Cloud para **eduspark-py** es **`470326625254`**.

**Haz clic en este enlace directo para habilitar la API:**
👉 [Habilitar Google Drive API](https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=470326625254)

O manualmente:

2. **O manualmente**:
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Selecciona el proyecto **eduspark-py**
   - Ve a **APIs & Services** > **Library**
   - Busca **"Google Drive API"**
   - Haz clic en **"Enable"** (Habilitar)

### Paso 3: Verificar que la API esté Habilitada

1. Ve a **APIs & Services** > **Enabled APIs**
2. Deberías ver **Google Drive API** en la lista
3. Si no aparece, espera 2-3 minutos y recarga la página

### Paso 4: Configurar Permisos del Service Account

Las Cloud Functions usan un Service Account automático. Asegúrate de que tenga permisos:

1. Ve a **IAM & Admin** > **Service Accounts**
2. Busca el Service Account: `eduspark-py@appspot.gserviceaccount.com` (o similar)
3. Verifica que tenga el rol **"Editor"** o al menos:
   - **Cloud Datastore User** (para Firestore)
   - **Storage Object Viewer** (para Google Drive)

### Paso 5: Redesplegar la Cloud Function (si es necesario)

Si ya habilitaste la API pero el error persiste:

```bash
cd functions/analyzeFile
npm run build
cd ../..
firebase deploy --only functions:analyzeFile
```

## Verificación

Después de habilitar la API:

1. Espera 2-3 minutos para que los cambios se propaguen
2. Intenta analizar un archivo nuevamente desde la interfaz
3. El error debería desaparecer

## Notas Importantes

- ⏱️ **Tiempo de propagación**: Los cambios en las APIs pueden tardar 2-5 minutos en propagarse
- 🔄 **Cache**: Si el error persiste, espera unos minutos y vuelve a intentar
- 🔑 **Service Account**: Las Cloud Functions usan automáticamente el Service Account del proyecto, no necesitas configurar credenciales manualmente

## Troubleshooting

### Error: "API has not been used in project X"
- **Causa**: La API no está habilitada en el proyecto correcto
- **Solución**: Sigue el Paso 2 arriba

### Error: "Permission denied"
- **Causa**: El Service Account no tiene permisos suficientes
- **Solución**: Sigue el Paso 4 arriba

### Error persiste después de habilitar
- Espera 5 minutos y vuelve a intentar
- Verifica que estés usando el proyecto correcto (`eduspark-py`)
- Revisa los logs de la Cloud Function en Firebase Console

