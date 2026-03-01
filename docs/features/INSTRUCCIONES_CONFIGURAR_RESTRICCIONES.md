# INSTRUCCIONES: Configurar URL de Cloud Function

## 1. Editar archivo `.env`

Abre el archivo `.env` en el editor y agrega la siguiente línea al final:

```bash
# Cloud Function URLs
VITE_SERVE_PDF_READONLY_URL=https://servepdfreadonly-mcc5aevj6a-uc.a.run.app
```

## 2. Reconstruir Frontend

```powershell
npm run build
```

## 3. Desplegar Frontend a Cloud Run

```powershell
./deploy-cloudrun.ps1
```

## 4. Verificar Funcionamiento

1. Ir a `https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/courses/12`
2. Hacer clic en un material (ej: "CAPÍTULO 31 HIGADO")
3. **Verificar en consola del navegador**:
   ```
   [MaterialDisplay] URL segura generada para material: xxx
   ```
4. **Intentar descargar** (Ctrl+S): Debe mostrar alerta
5. **Intentar imprimir** (Ctrl+P): Debe mostrar alerta
6. **Verificar iconos**: Los iconos ↓ y 🖨️ no deben funcionar

## Si hay Problemas

### Ver logs de la Cloud Function:

```powershell
gcloud functions logs read servePdfReadOnly --gen2 --region=us-central1 --limit=20
```

### Verificar que el build incluyó la variable:

```powershell
# Buscar en dist/assets
Get-ChildItem dist/assets/*.js | Select-String "servepdfreadonly"
```

---

**URL de Cloud Function**: https://servepdfreadonly-mcc5aevj6a-uc.a.run.app  
**Estado**: ✅ Listo para configurar

