# Restricciones de Solo Lectura - Mejoras Implementadas

## Problema Reportado

El usuario puede imprimir y descargar archivos de Google Drive marcados como "solo visualizar" en materiales, lo cual no debería ser posible.

## Limitaciones Técnicas Importantes

### Restricciones del Navegador
Las restricciones implementadas en el frontend (bloqueo de Ctrl+P, Ctrl+S, etc.) tienen limitaciones:

1. **Pueden ser evadidas**: Un usuario técnico puede:
   - Desactivar JavaScript
   - Usar herramientas de desarrollador
   - Acceder directamente a la URL del archivo
   - Usar extensiones del navegador
   - Hacer capturas de pantalla (no se puede bloquear)

2. **Cross-Origin**: Cuando el PDF se muestra en un iframe, las restricciones aplicadas desde el documento padre pueden no funcionar completamente debido a políticas de seguridad del navegador.

## Soluciones Implementadas

### 1. Compartido Automático con Restricciones de Google Drive

Cuando se crea un material como "solo lectura":
- ✅ Se comparte automáticamente con los estudiantes usando `shareFileReadOnly()`
- ✅ Esto genera un `viewLink` que tiene restricciones nativas de Google Drive
- ✅ Google Drive aplica restricciones más efectivas que el navegador

### 2. Uso de DocumentViewer para Materiales con viewLink

- ✅ Los materiales con `viewLink` se abren en el `DocumentViewer` interno
- ✅ NO se abren directamente en Google Drive
- ✅ Esto permite aplicar restricciones adicionales del navegador

### 3. Restricciones del Navegador Mejoradas

- ✅ Bloqueo de Ctrl+P (imprimir) con alerta
- ✅ Bloqueo de Ctrl+S (guardar) con alerta
- ✅ Bloqueo de clic derecho (menú contextual)
- ✅ Bloqueo de drag & drop
- ✅ CSS para bloquear impresión (@media print)
- ✅ Bloqueo de beforeprint event

## Limitaciones Conocidas

### Lo que NO se puede prevenir completamente:

1. **Capturas de pantalla**: No hay forma técnica de prevenir que un usuario tome capturas de pantalla.
2. **Acceso directo a Google Drive**: Si el usuario conoce la URL directa, puede acceder desde Google Drive (aunque las restricciones de Google Drive aplicarán).
3. **Usuarios técnicos avanzados**: Pueden evadir las restricciones del navegador usando herramientas especializadas.

### Lo que SÍ se puede prevenir:

1. ✅ Descarga directa del archivo desde el visor
2. ✅ Impresión usando el diálogo estándar del navegador (Ctrl+P)
3. ✅ Copia fácil de texto usando el portapapeles
4. ✅ Acceso casual al menú de descarga

## Mejoras Adicionales Recomendadas

### 1. Watermarking (Marcas de Agua)
- Agregar marcas de agua con información del usuario
- Esto permite rastrear quién compartió el archivo

### 2. DRM (Digital Rights Management)
- Usar servicios especializados de DRM para PDFs
- Más costoso pero más efectivo

### 3. Visor Propio con Restricciones del Servidor
- Servir el PDF desde nuestro servidor con autenticación
- Bloquear el acceso directo al archivo original
- Más complejo pero más seguro

## Próximos Pasos

1. ✅ Verificar que el compartido automático funcione correctamente
2. ✅ Probar que los materiales con viewLink usen DocumentViewer
3. ⏳ Considerar implementar watermarking para mayor seguridad
4. ⏳ Documentar las limitaciones para los usuarios

## Comandos para Verificar

```bash
# Verificar que los materiales tienen viewLink
# En Supabase SQL Editor:
SELECT 
  id,
  title,
  metadata->>'viewLink' as viewLink,
  metadata->>'ragProcessingType' as ragProcessingType,
  purpose
FROM materials
WHERE metadata->>'ragProcessingType' = 'readonly'
ORDER BY created_at DESC;
```

