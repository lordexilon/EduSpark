# ✅ DESPLIEGUE COMPLETADO: Restricciones de Solo Lectura para Supabase Storage

## 🎉 Estado: COMPLETADO

### Cloud Function Desplegada:

**URL**: `https://servepdfreadonly-mcc5aevj6a-uc.a.run.app`
- ✅ Estado: ACTIVE
- ✅ Región: us-central1
- ✅ Runtime: Node.js 20
- ✅ Memoria: 512MB
- ✅ Timeout: 540s

## 📝 Configuración Necesaria

### 1. Agregar URL en `.env`:

```bash
# Cloud Function URLs
VITE_SERVE_PDF_READONLY_URL=https://servepdfreadonly-mcc5aevj6a-uc.a.run.app
```

### 2. Reconstruir y Desplegar Frontend:

```powershell
# Construir frontend
npm run build

# Desplegar a Cloud Run
./deploy-cloudrun.ps1
```

## 🔒 Cómo Funciona

### Flujo para Materiales de Solo Lectura:

1. **Usuario hace clic** en un material con `purpose: 'download'` en Supabase Storage
2. **Frontend** (`MaterialDisplay.tsx`) detecta que es un material protegido
3. **Genera URL segura**: `https://servepdfreadonly...?materialId=xxx&token=yyy`
4. **Cloud Function**:
   - ✅ Verifica que el token sea válido
   - ✅ Verifica que el usuario esté inscrito en el curso (o sea el profesor)
   - ✅ Descarga el PDF desde Supabase Storage
   - ✅ Sirve el PDF con headers que previenen descarga
5. **DocumentViewer** muestra el PDF con restricciones adicionales del navegador

## 🛡️ Restricciones Aplicadas

### Headers HTTP (Cloud Function):
- ✅ `Content-Disposition: inline` - Fuerza visualización, no descarga
- ✅ `X-Frame-Options: SAMEORIGIN` - Previene iframe externo
- ✅ `Cache-Control: no-store` - No cachea el archivo
- ✅ `X-Download-Options: noopen` - Previene descarga automática

### Restricciones del Navegador (Frontend):
- ✅ **Ctrl+P** bloqueado - No puede imprimir
- ✅ **Ctrl+S** bloqueado - No puede guardar
- ✅ **Clic derecho** bloqueado - No puede copiar
- ✅ **Drag & drop** bloqueado - No puede arrastrar
- ✅ **@media print** deshabilitado - CSS previene impresión

## 📊 Verificación

### 1. Verificar que la Cloud Function responde:

```powershell
# Probar endpoint (sin token, debe dar error 401)
Invoke-WebRequest -Uri "https://servepdfreadonly-mcc5aevj6a-uc.a.run.app?materialId=test" -Method GET
```

Respuesta esperada: `401 Unauthorized` (porque no hay token)

### 2. Probar desde la aplicación:

1. Ir a `/courses/12`
2. Hacer clic en un material (ej: "CAPÍTULO 31 HIGADO CIRUGIA CONAREM")
3. **Verificar en consola del navegador**:
   ```
   [MaterialDisplay] URL segura generada para material: xxx
   ```
4. **Intentar descargar** (Ctrl+S): Debe mostrar alerta "🔒 La descarga..."
5. **Intentar imprimir** (Ctrl+P): Debe mostrar alerta "🔒 La impresión..."
6. **Verificar iconos del visor PDF**: El icono ↓ y 🖨️ deben estar deshabilitados

### 3. Ver logs de la Cloud Function:

```powershell
gcloud functions logs read servePdfReadOnly --gen2 --region=us-central1 --limit=20
```

## 💰 Costos Estimados

**Para 1000 visualizaciones/mes de PDFs de 5MB:**
- Invocaciones: ~$0.0004
- CPU/Memoria: ~$0.02
- Red (5GB salida): ~$0.60
- **Total: ~$0.62/mes**

## ⚠️ Limitaciones

### No se puede prevenir:
- ❌ Capturas de pantalla
- ❌ Grabar pantalla
- ❌ Copiar contenido visualmente (transcribir)

### Sí previene:
- ✅ Descarga directa del archivo
- ✅ Impresión usando el navegador
- ✅ Acceso no autorizado (sin token)
- ✅ Compartir URL (el token expira)
- ✅ Cache del navegador

## 🔍 Troubleshooting

### Error: "Token inválido"
**Causa**: El token de sesión no es válido o expiró  
**Solución**: Recargar la página para obtener un nuevo token

### Error: "Material no encontrado"
**Causa**: El materialId no existe en la base de datos  
**Solución**: Verificar que el material existe y tiene URL válida

### Error: "No tienes acceso a este material"
**Causa**: El usuario no está inscrito en el curso  
**Solución**: Verificar inscripción en `course_enrollments`

### El PDF no carga
**Causa**: El archivo no existe en Supabase Storage  
**Solución**: 
1. Verificar que el archivo existe en el bucket
2. Verificar que la URL en `materials.url` es correcta
3. Ver logs de la Cloud Function

### Los iconos ↓ y 🖨️ siguen apareciendo
**Causa**: El PDF se está cargando directamente desde Supabase, no desde la Cloud Function  
**Solución**:
1. Verificar que `VITE_SERVE_PDF_READONLY_URL` está en `.env`
2. Reconstruir el frontend: `npm run build`
3. Verificar que `material.purpose === 'download'`
4. Ver consola del navegador para confirmar que usa la URL de la Cloud Function

## 📝 Próximos Pasos Opcionales

### 1. Agregar Watermark
Agregar marca de agua con nombre del usuario sobre el PDF

### 2. Tracking de Visualizaciones
Registrar quién vio qué material y cuándo

### 3. Límite de Tiempo
URLs que expiren después de X minutos

### 4. Rate Limiting
Limitar cantidad de visualizaciones por usuario/hora

---

**Estado**: ✅ COMPLETADO  
**Cloud Function**: https://servepdfreadonly-mcc5aevj6a-uc.a.run.app  
**Próximo paso**: Agregar URL en `.env` y redesplegar frontend  
**Fecha**: Diciembre 2025

