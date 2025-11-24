# Configuración de Supabase Storage para Imágenes

## 📋 Resumen

El editor de contenido rico (`RichTextEditor`) soporta múltiples formas de manejar imágenes con **compresión automática**:

1. **Supabase Storage** (recomendado para producción) - Sube imágenes comprimidas a un bucket en Supabase
2. **Data URIs (base64)** - Imágenes comprimidas embebidas directamente en el HTML (funciona sin configuración)
3. **URLs HTTPS** - Imágenes externas mediante URLs

## ✨ Características de Compresión Automática

El sistema comprime y redimensiona automáticamente las imágenes antes de guardarlas:

- **Imágenes pequeñas (< 2MB):** Redimensiona a máximo 1920x1080px, calidad 80%
- **Imágenes grandes (> 2MB):** Redimensiona a máximo 1280x1280px, calidad 80%
- **Compresión progresiva:** Si después de la primera compresión aún es grande (> 1MB), aplica una segunda compresión
- **Mantiene relación de aspecto:** Las imágenes no se deforman
- **Logging detallado:** Muestra en consola el tamaño original, comprimido y porcentaje de reducción

## ⚙️ Configuración del Bucket (Opcional)

Si quieres usar Supabase Storage para almacenar las imágenes (recomendado para producción), sigue estos pasos:

### 1. Crear el Bucket en Supabase Dashboard

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Storage > Buckets**
3. Click en **"New bucket"**
4. Configura:
   - **Name:** `course-images`
   - **Public bucket:** ✅ Marcar esta casilla (IMPORTANTE)
5. Click en **"Create bucket"**

### 2. Ejecutar el Script SQL

Ejecuta el script `sql_scripts/43_setup_supabase_storage_images.sql` en el SQL Editor de Supabase.

Este script crea las políticas RLS necesarias para:
- ✅ Lectura pública de imágenes (para que se muestren en el contenido)
- ✅ Subida de imágenes solo para teachers y admins autenticados
- ✅ Actualización/eliminación solo para el propietario o admin

### 3. Verificar la Configuración

Después de crear el bucket y ejecutar el script, intenta subir una imagen en el editor. Deberías ver en la consola:

```
✅ Imagen subida exitosamente a Supabase Storage
```

## 🔄 Comportamiento con Fallback

Si el bucket **NO** está configurado:
- ⚠️ El sistema detecta el error "Bucket not found"
- ✅ Automáticamente comprime la imagen y usa data URI (base64) como fallback
- ℹ️ Muestra un mensaje informativo en la consola
- ✅ **La imagen funciona perfectamente** (se guarda comprimida en el HTML como base64)

**Ventajas del fallback a base64 (con compresión):**
- No requiere configuración adicional
- Funciona inmediatamente
- Las imágenes están siempre disponibles (no dependen de servicios externos)
- **Las imágenes se comprimen automáticamente**, reduciendo significativamente el tamaño del HTML
- Reducción típica: 70-95% del tamaño original

**Notas sobre base64:**
- Base64 añade ~33% de overhead sobre el tamaño del archivo original
- Con la compresión automática, este overhead es mínimo comparado con el beneficio
- Ejemplo: Imagen de 5MB → Comprimida a 400KB → Base64 ~530KB (muy manejable)

## 📝 Ejemplo de Uso

Cuando un usuario hace click en el botón de imagen en el editor:

1. **Si elige "Subir archivo":**
   - Si el bucket existe → sube a Supabase Storage y obtiene URL pública
   - Si el bucket NO existe → convierte a base64 y la inserta directamente

2. **Si elige "URL":**
   - Acepta URLs HTTPS, data URIs, o URLs de Supabase Storage
   - Valida y inserta la imagen directamente

## 🛠️ Estructura de Archivos en Storage

Las imágenes se organizan así:

```
course-images/
  └── course-content/
      ├── 1761933515886_abc123.jpg
      ├── 1761933515999_def456.png
      └── ...
```

## 🔒 Seguridad

Las políticas RLS configuradas aseguran que:
- ✅ Cualquiera puede **ver** las imágenes (necesario para que se muestren en el contenido)
- ✅ Solo teachers y admins pueden **subir** imágenes
- ✅ Solo el propietario o admin puede **modificar/eliminar** imágenes

## 💡 Notas Importantes

1. **El bucket DEBE ser público** para que las imágenes se muestren en el contenido educativo
2. **Las imágenes funcionan sin el bucket** usando base64 comprimido, así que no es crítico configurarlo
3. **Para producción**, se recomienda usar Supabase Storage para mejor rendimiento
4. **Límite de tamaño:** 
   - Máximo 5MB antes de compresión (archivo original)
   - Máximo 2MB después de compresión (si excede, se rechaza)
5. **Compresión automática:** Todas las imágenes se comprimen antes de guardarse, reduciendo significativamente el tamaño
6. **Información en consola:** El sistema muestra en la consola el proceso de compresión y el tamaño final

## 🐛 Solución de Problemas

### Error: "Bucket not found"
- ✅ **Solución:** Crear el bucket `course-images` en Supabase Dashboard
- ✅ **Alternativa:** No hacer nada, el sistema usará base64 automáticamente

### Error: "Permission denied"
- ✅ **Solución:** Ejecutar el script SQL `43_setup_supabase_storage_images.sql`

### Las imágenes no se muestran
- ✅ Verificar que el bucket sea público
- ✅ Verificar las políticas RLS están aplicadas
- ✅ Revisar la consola del navegador para errores específicos

