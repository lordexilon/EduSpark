# Solución: Restricciones de Solo Lectura para Archivos de Google Drive

## Problema

Los usuarios pueden imprimir y descargar archivos de Google Drive marcados como "solo visualizar" en materiales.

## Limitaciones Técnicas

### ⚠️ IMPORTANTE: Las restricciones del navegador tienen limitaciones

Las restricciones implementadas en el frontend pueden ser evadidas por usuarios técnicos:
- Desactivar JavaScript
- Usar herramientas de desarrollador
- Acceder directamente a la URL
- Hacer capturas de pantalla (no se puede prevenir)

### ✅ Solución más efectiva: Restricciones nativas de Google Drive

La forma más efectiva de prevenir impresión y descarga es usar las restricciones nativas de Google Drive cuando el archivo se comparte con permisos de solo lectura.

## Implementación Realizada

### 1. Compartido Automático ✅

Cuando se crea un material como "solo lectura":
- Se comparte automáticamente con los estudiantes usando `shareFileReadOnly()`
- Esto genera un `viewLink` con restricciones nativas de Google Drive
- El `viewLink` se guarda en `metadata.viewLink`

### 2. Uso de DocumentViewer ✅

- Los materiales con `viewLink` se abren en el `DocumentViewer` interno
- NO se abren directamente en Google Drive
- Aplica restricciones adicionales del navegador

### 3. Restricciones del Navegador ✅

- Bloqueo de Ctrl+P (imprimir) con alerta
- Bloqueo de Ctrl+S (guardar/descargar) con alerta
- Bloqueo de clic derecho (menú contextual)
- Bloqueo de drag & drop
- CSS para bloquear impresión (@media print)

## Verificación

Para verificar que las restricciones funcionan:

1. Crear un material como "solo lectura" desde `/file-processing`
2. Verificar que tenga `viewLink` en metadata:
   ```sql
   SELECT id, title, metadata->>'viewLink' as viewLink
   FROM materials
   WHERE metadata->>'ragProcessingType' = 'readonly'
   ORDER BY created_at DESC;
   ```
3. Verificar que se abra en DocumentViewer (no directamente en Google Drive)
4. Intentar imprimir (Ctrl+P) - debe mostrar alerta
5. Intentar descargar (Ctrl+S) - debe mostrar alerta

## Limitaciones Conocidas

- ❌ No se puede prevenir capturas de pantalla
- ❌ No se puede prevenir acceso directo si el usuario tiene la URL
- ❌ Usuarios técnicos avanzados pueden evadir las restricciones

## Mejoras Recomendadas (Futuras)

1. **Watermarking**: Agregar marcas de agua con información del usuario
2. **DRM**: Usar servicios especializados de DRM para PDFs
3. **Visor propio**: Servir el PDF desde nuestro servidor con autenticación

