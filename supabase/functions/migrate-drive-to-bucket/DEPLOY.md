# Instrucciones de Despliegue

## 1. Instalar Supabase CLI (si no está instalado)

```bash
npm install -g supabase
```

O descargar desde: https://github.com/supabase/cli/releases

## 2. Iniciar sesión en Supabase

```bash
supabase login
```

## 3. Vincular proyecto

```bash
supabase link --project-ref mckfscukxcqwntpjagar
```

## 4. Configurar variables de entorno

Las variables de entorno se configuran en el dashboard de Supabase:

1. Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/settings/functions
2. Agrega las siguientes variables:
   - `GOOGLE_CLIENT_ID`: Tu Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Tu Google OAuth Client Secret

**Nota**: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están disponibles automáticamente.

## 5. Desplegar la función

```bash
supabase functions deploy migrate-drive-to-bucket
```

## 6. Verificar que el bucket "course-documents" existe

1. Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/storage/buckets
2. Verifica que el bucket "course-documents" existe (ya debería existir)
3. Si no existe, créalo:
   - Nombre: `course-documents`
   - Público: Sí (para URLs públicas)
   - Política de acceso: Configurar según necesidades

## 7. Probar la función

Desde el frontend, la función se invoca automáticamente cuando se hace clic en "Migrar a Bucket" en la página de materiales.

## Solución de Problemas

### Error CORS
Si sigues viendo errores CORS, verifica que:
- La función esté desplegada correctamente
- Los headers CORS estén en la respuesta (ya incluidos en el código)
- El método OPTIONS esté manejado (ya incluido en el código)

### Error de autenticación
- Verifica que el usuario tenga un token de Google Drive válido
- Verifica que el token no esté expirado (la función lo refresca automáticamente)

### Error de Storage
- Verifica que el bucket "course-documents" exista
- Verifica que el bucket tenga permisos de escritura
- Verifica que la ruta del archivo sea válida
- Ejecuta el script `sql_scripts/125_create_documents_bucket.sql` para crear las políticas RLS

