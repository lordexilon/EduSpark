# Instrucciones para Configurar Avatares de Usuarios

Este documento explica cómo configurar el almacenamiento de avatares para que todos los tipos de usuarios (student, teacher, admin) puedan subir sus fotos de perfil.

## Problema

El error `StorageApiError: new row violates row-level security policy` indica que:
1. El bucket de avatares no existe, o
2. Las políticas RLS no están configuradas correctamente

## Solución

### Paso 1: Crear el Bucket Manualmente

1. Ve al dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Storage** > **Buckets**
4. Click en **"New bucket"**
5. Configura:
   - **Nombre del bucket**: `avatars` (exactamente este nombre, sin espacios ni mayúsculas)
   - **Public bucket**: ✅ **MARCAR ESTA OPCIÓN** (importante para que las imágenes sean accesibles públicamente)
6. Click en **"Create bucket"**

### Paso 2: Ejecutar el Script SQL

1. Ve al **SQL Editor** en Supabase
2. Abre el archivo `sql_scripts/92_setup_avatars_storage.sql`
3. Copia y pega todo el contenido en el editor SQL
4. Ejecuta el script (click en "Run" o presiona Ctrl+Enter)

Este script creará las políticas RLS que permiten:
- ✅ Todos los usuarios autenticados (student, teacher, admin) pueden subir sus propios avatares
- ✅ Todos pueden ver los avatares (público)
- ✅ Cada usuario solo puede actualizar/eliminar sus propios avatares
- ✅ Los admins pueden eliminar cualquier avatar

### Paso 3: Verificar la Configuración

Después de ejecutar el script, verifica que las políticas se crearon correctamente:

```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%avatar%';
```

Deberías ver 4 políticas:
1. `Permitir lectura pública de avatares` (SELECT)
2. `Permitir subida de avatares para usuarios autenticados` (INSERT)
3. `Permitir actualización de avatares propios` (UPDATE)
4. `Permitir eliminación de avatares propios` (DELETE)

## Estructura de Archivos

Los avatares se almacenan en la siguiente estructura:
```
avatars/
  └── {user_id}/
      └── {user_id}-{timestamp}.{ext}
```

Ejemplo:
```
avatars/
  └── b72dabe7-9ace-4e50-aa17-f770c5c94c0e/
      └── b72dabe7-9ace-4e50-aa17-f770c5c94c0e-1699123456789.jpg
```

## URLs Públicas

Las URLs públicas de los avatares tienen el formato:
```
https://[proyecto].supabase.co/storage/v1/object/public/avatars/{user_id}/{filename}
```

## Notas Importantes

1. **El bucket debe ser público**: Esto es necesario para que las imágenes se muestren en el perfil del usuario
2. **Las políticas RLS verifican el user_id**: Cada usuario solo puede subir archivos en su propia carpeta (`{user_id}/`)
3. **No se puede crear el bucket desde el código**: Debe crearse manualmente desde el dashboard
4. **Los límites**: 
   - Tamaño máximo: 5MB
   - Tipos permitidos: JPEG, PNG, WebP

## Solución de Problemas

### Error: "Bucket not found"
- Verifica que el bucket `avatars` existe en Storage > Buckets
- Verifica que el nombre es exactamente `avatars` (sin espacios, minúsculas)

### Error: "new row violates row-level security policy"
- Ejecuta el script SQL `92_setup_avatars_storage.sql`
- Verifica que las 4 políticas existen (ver Paso 3)
- Verifica que el bucket es público

### Error: "Permission denied"
- Verifica que el usuario está autenticado
- Verifica que las políticas RLS están configuradas correctamente
- Verifica que el path del archivo incluye el `user_id` como primer folder

## Verificación Final

Para verificar que todo funciona:
1. Inicia sesión como cualquier usuario (student, teacher o admin)
2. Ve a la página de perfil (`/profile`)
3. Intenta subir una imagen de avatar
4. Debería subirse correctamente sin errores

