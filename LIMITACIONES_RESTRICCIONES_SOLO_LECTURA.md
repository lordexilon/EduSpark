# Limitaciones y Restricciones de Solo Lectura

## Problema Reportado

Los usuarios pueden imprimir y descargar archivos de Google Drive marcados como "solo visualizar" en materiales.

## Limitaciones Técnicas Importantes ⚠️

### 1. Restricciones del Navegador

Las restricciones implementadas en el frontend tienen limitaciones técnicas:

- ✅ **Bloquean usuarios casuales**: Previenen la impresión y descarga para la mayoría de usuarios
- ❌ **Pueden ser evadidas**: Usuarios técnicos pueden:
  - Desactivar JavaScript
  - Usar herramientas de desarrollador (F12)
  - Acceder directamente a la URL del archivo
  - Usar extensiones del navegador
  - Hacer capturas de pantalla (imposible de prevenir)
  - Usar herramientas de terceros para descargar

### 2. Restricciones Nativas de Google Drive

Las restricciones más efectivas vienen de Google Drive cuando:
- El archivo se comparte con permisos de solo lectura (`role: 'reader'`)
- Se usan los parámetros correctos en la URL de vista previa
- El archivo tiene restricciones aplicadas (`copyRequiresWriterPermission: true`)

**IMPORTANTE**: Estas restricciones solo funcionan si:
1. ✅ El archivo se comparte correctamente con los estudiantes
2. ✅ Se genera el `viewLink` con los parámetros correctos
3. ✅ El archivo se abre usando el `viewLink` (no la URL directa)

## Soluciones Implementadas

### ✅ 1. Compartido Automático

Cuando se crea un material como "solo lectura":
- Se comparte automáticamente con los estudiantes
- Se genera el `viewLink` con restricciones nativas de Google Drive
- El `viewLink` se guarda en `metadata.viewLink`

### ✅ 2. Uso de DocumentViewer

- Los materiales con `viewLink` se abren en el `DocumentViewer` interno
- NO se abren directamente en Google Drive (evita que se descargue directamente)
- Aplica restricciones adicionales del navegador

### ✅ 3. Restricciones del Navegador

- Bloqueo de Ctrl+P (imprimir)
- Bloqueo de Ctrl+S (guardar/descargar)
- Bloqueo de clic derecho
- Bloqueo de drag & drop
- CSS para bloquear impresión

## Lo que NO se puede prevenir completamente

1. **Capturas de pantalla**: No hay forma técnica de prevenirlas
2. **Acceso directo a Google Drive**: Si el usuario tiene la URL directa
3. **Usuarios técnicos avanzados**: Pueden evadir las restricciones

## Lo que SÍ previene

1. ✅ Descarga casual del archivo
2. ✅ Impresión usando Ctrl+P
3. ✅ Copia fácil de texto
4. ✅ Acceso casual al menú de descarga

## Próximos Pasos Recomendados

Para mejorar aún más la seguridad:

1. **Watermarking**: Agregar marcas de agua con información del usuario
2. **DRM**: Usar servicios especializados de DRM para PDFs
3. **Visor propio**: Servir el PDF desde nuestro servidor con autenticación

