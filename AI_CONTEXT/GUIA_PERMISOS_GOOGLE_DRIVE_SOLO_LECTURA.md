# 📄 Guía: Configurar Permisos de Solo Lectura en Google Drive

**Objetivo:** Configurar un documento en Google Drive para que solo se pueda visualizar (solo lectura), sin permitir descargar ni imprimir.

---

## 🎯 Requisitos

- El dueño del documento puede configurar estos permisos
- Los usuarios con acceso solo pueden **ver** el documento
- **No pueden descargar** el archivo
- **No pueden imprimir** el documento
- **No pueden copiar** el contenido

---

## 📋 Pasos para Configurar Permisos

### **Método 1: Configuración Manual en Google Drive (Recomendado)**

#### **Paso 1: Abrir el Documento**
1. Abre Google Drive en tu navegador
2. Localiza el documento que deseas compartir
3. Haz clic derecho sobre el archivo → **Compartir** (o haz clic en el botón "Compartir")

#### **Paso 2: Configurar Permisos de Solo Lectura**
1. En la ventana de "Compartir", verás un campo para agregar personas o grupos
2. Agrega los correos electrónicos de las personas que quieres que vean el documento
3. **Importante:** Asegúrate de que el permiso esté configurado como **"Lector"** (no "Editor" ni "Comentarista")

#### **Paso 3: Desactivar Descarga e Impresión (Configuración Avanzada)**
1. Haz clic en el ícono de **⚙️ Configuración** (engranaje) en la esquina superior derecha de la ventana de compartir
2. O ve a: **Configuración → General → Opciones de descarga e impresión**
3. Desmarca las siguientes opciones:
   - ❌ **"Los lectores y comentaristas pueden descargar, imprimir y copiar"**
   - ❌ **"Los editores pueden cambiar permisos y compartir"** (si aplica)

#### **Paso 4: Verificar Configuración**
1. Cierra la ventana de compartir
2. Abre el documento en modo de vista previa
3. Verifica que:
   - No aparezca el botón de descarga
   - No aparezca la opción de imprimir
   - Solo se pueda ver el contenido

---

### **Método 2: Usando Google Drive API (Para Integración en Código)**

Si necesitas configurar estos permisos programáticamente desde tu aplicación, puedes usar la API de Google Drive:

#### **Ejemplo de Código (Node.js)**

```javascript
const { google } = require('googleapis');

async function configurarPermisosSoloLectura(fileId, userEmail, accessToken) {
  const drive = google.drive({ version: 'v3', auth: accessToken });

  // 1. Compartir el archivo con permiso de "lector"
  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: 'reader', // Solo lectura
      type: 'user',
      emailAddress: userEmail,
    },
  });

  // 2. Actualizar los permisos del archivo para desactivar descarga e impresión
  await drive.files.update({
    fileId: fileId,
    requestBody: {
      // Desactivar opciones de descarga e impresión
      copyRequiresWriterPermission: true, // Evita que se copie
      viewersCanCopyContent: false, // Los lectores no pueden copiar
    },
  });

  // 3. Obtener el enlace de vista previa (sin permisos de descarga)
  const file = await drive.files.get({
    fileId: fileId,
    fields: 'webViewLink, webContentLink',
  });

  return {
    viewLink: file.data.webViewLink, // Enlace para ver solo
    message: 'Documento configurado para solo lectura',
  };
}
```

#### **Ejemplo de Código (Python)**

```python
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

def configurar_permisos_solo_lectura(file_id, user_email, credentials):
    drive_service = build('drive', 'v3', credentials=credentials)
    
    # 1. Compartir con permiso de lector
    permission = {
        'type': 'user',
        'role': 'reader',  # Solo lectura
        'emailAddress': user_email
    }
    drive_service.permissions().create(
        fileId=file_id,
        body=permission
    ).execute()
    
    # 2. Desactivar descarga e impresión
    file_metadata = {
        'copyRequiresWriterPermission': True,  # Evita copias
        'viewersCanCopyContent': False  # Los lectores no pueden copiar
    }
    drive_service.files().update(
        fileId=file_id,
        body=file_metadata
    ).execute()
    
    # 3. Obtener enlace de vista previa
    file = drive_service.files().get(
        fileId=file_id,
        fields='webViewLink, webContentLink'
    ).execute()
    
    return {
        'view_link': file.get('webViewLink'),
        'message': 'Documento configurado para solo lectura'
    }
```

---

## 🔒 Limitaciones Importantes

### **⚠️ Limitaciones de Google Drive**

1. **No hay protección 100% absoluta:**
   - Los usuarios pueden tomar capturas de pantalla
   - Si tienen acceso a la vista, pueden ver el contenido
   - No se puede prevenir completamente la copia visual

2. **Restricciones de descarga e impresión:**
   - Google Drive permite desactivar la descarga directa
   - Sin embargo, algunos navegadores pueden permitir "Guardar como PDF" desde la vista previa
   - La impresión puede estar limitada pero no completamente bloqueada

3. **Permisos de "Lector":**
   - Los lectores pueden ver el documento
   - No pueden editar ni comentar (a menos que se les dé permiso de "Comentarista")
   - No pueden compartir el documento con otros

---

## 🛠️ Configuración Avanzada: Usar Google Workspace Admin

Si tienes Google Workspace (anteriormente G Suite), puedes configurar políticas más estrictas:

1. **Ve a Google Admin Console**
2. **Apps → Google Workspace → Drive and Docs**
3. **Configuración de compartir:**
   - Desactiva "Permitir que los usuarios compartan archivos fuera de la organización"
   - Activa "Solo permitir compartir dentro de la organización"

---

## 📝 Integración con EduSpark

Si necesitas implementar esta funcionalidad en EduSpark, puedes:

### **1. Modificar el Servicio de Google Drive**

Agregar una función para configurar permisos de solo lectura:

```typescript
// src/services/googleDriveService.ts

export async function compartirDocumentoSoloLectura(
  userId: string,
  fileId: string,
  userEmails: string[]
): Promise<{ viewLink: string }> {
  const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
  
  if (!accessToken) {
    throw new Error('No se encontró token de Google Drive');
  }

  const drive = google.drive({ version: 'v3', auth: accessToken });

  // Compartir con cada usuario como lector
  for (const email of userEmails) {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'user',
        emailAddress: email,
      },
    });
  }

  // Desactivar descarga e impresión
  await drive.files.update({
    fileId: fileId,
    requestBody: {
      copyRequiresWriterPermission: true,
      viewersCanCopyContent: false,
    },
  });

  // Obtener enlace de vista previa
  const file = await drive.files.get({
    fileId: fileId,
    fields: 'webViewLink',
  });

  return {
    viewLink: file.data.webViewLink || '',
  };
}
```

### **2. Actualizar la UI de Compartir Materiales**

En `MaterialsManagementPage.tsx`, cuando se comparte un material:

```typescript
const handleShareMaterial = async (material: Material, studentEmails: string[]) => {
  if (!material.drive_file_id) {
    alert('Este material no tiene un archivo de Google Drive asociado.');
    return;
  }

  try {
    // Configurar permisos de solo lectura
    const result = await materialService.shareMaterialWithStudents(
      material.id,
      studentEmails,
      { readOnly: true, preventDownload: true, preventPrint: true }
    );

    alert(`✅ Material compartido exitosamente.\n\nLos estudiantes pueden ver el documento en:\n${result.viewLink}`);
  } catch (error) {
    console.error('Error compartiendo material:', error);
    alert('❌ Error al compartir el material. Verifica los permisos de Google Drive.');
  }
};
```

---

## ✅ Verificación

### **Checklist de Verificación:**

- [ ] El documento está compartido con permiso de "Lector"
- [ ] La opción "Los lectores pueden descargar, imprimir y copiar" está **desactivada**
- [ ] El enlace de compartir funciona correctamente
- [ ] Los usuarios invitados solo pueden ver el documento
- [ ] No aparece el botón de descarga en la vista previa
- [ ] No aparece la opción de imprimir en el menú

---

## 🔗 Referencias

- [Documentación de Google Drive API - Permisos](https://developers.google.com/drive/api/v3/reference/permissions)
- [Configurar permisos de compartir en Google Drive](https://support.google.com/drive/answer/2494822)
- [Controlar descarga e impresión en Google Drive](https://support.google.com/drive/answer/2494822?hl=es#zippy=%2Ccontrolar-la-descarga-y-la-impresi%C3%B3n)

---

## 📌 Notas Finales

1. **El dueño siempre puede cambiar estos permisos** - Solo el dueño del documento puede configurar y modificar estos permisos.

2. **Los permisos se aplican a nivel de archivo** - Cada archivo debe configurarse individualmente.

3. **Considera usar Google Workspace** - Para mayor control y seguridad, considera usar Google Workspace con políticas administrativas.

4. **Prueba con una cuenta de prueba** - Antes de compartir documentos importantes, prueba la configuración con una cuenta de prueba para verificar que funciona como esperas.

---

**Última actualización:** Enero 2025  
**Autor:** Sistema EduSpark

