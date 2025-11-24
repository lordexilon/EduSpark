# Edge Function: migrate-drive-to-bucket

Esta función migra archivos de Google Drive a Supabase Storage.

## Funcionalidad

1. Descarga un archivo de Google Drive usando el `sourceFileId`
2. Sube el archivo a Supabase Storage en el bucket `course-documents`
3. Retorna la ruta del bucket y la URL pública del archivo

## Variables de Entorno Requeridas

- `SUPABASE_URL`: URL de tu proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key de Supabase
- `GOOGLE_CLIENT_ID`: Client ID de Google OAuth
- `GOOGLE_CLIENT_SECRET`: Client Secret de Google OAuth

## Uso

```typescript
const { data, error } = await supabase.functions.invoke('migrate-drive-to-bucket', {
  body: {
    materialId: 'uuid-del-material',
    sourceFileId: 'google-drive-file-id',
    courseId: 1,
    fileName: 'nombre-del-archivo.pdf',
    mimeType: 'application/pdf' // opcional
  }
});
```

## Respuesta

```json
{
  "success": true,
  "bucketPath": "materials/1/nombre_archivo_1234567890.pdf",
  "publicUrl": "https://...supabase.co/storage/v1/object/public/documents/...",
  "fileSize": 1234567,
  "mimeType": "application/pdf"
}
```

## Despliegue

```bash
supabase functions deploy migrate-drive-to-bucket
```

