# Guía de Despliegue en Google Cloud Run

## Estado del Despliegue

✅ **Servicio desplegado exitosamente**

- **URL**: https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
- **Región**: us-central1
- **Estado**: Activo y funcionando
- **Recursos**: 1 CPU, 512Mi memoria
- **Configuración**: min-instances: 0 (sin costo cuando no hay tráfico)

## Configuración Actual

### Recursos
- **CPU**: 1
- **Memoria**: 512Mi
- **Puerto**: 8080 (configurado automáticamente por Cloud Run)
- **Timeout**: 300 segundos
- **Concurrencia**: 80 requests por instancia

### Escalado
- **Min Instances**: 0 (sin costo cuando no hay tráfico)
- **Max Instances**: 10
- **CPU Throttling**: Habilitado (ahorra costos)

### Permisos
- **Acceso público**: Configurado (allUsers tiene rol run.invoker)

## Variables de Entorno

Las variables de entorno están hardcodeadas en `vite.config.ts` con valores por defecto. Si necesitas cambiarlas, puedes:

### Opción 1: Rebuild con nuevas variables (recomendado)
Modifica `vite.config.ts` y vuelve a desplegar:
```bash
gcloud builds submit --config cloudbuild.yaml
```

### Opción 2: Variables de entorno en tiempo de ejecución (limitado)
Para aplicaciones React/Vite, las variables deben estar en el build, no en runtime. Sin embargo, puedes configurar variables del sistema si es necesario:
```bash
gcloud run services update eduspark-frontend \
  --region us-central1 \
  --set-env-vars "NODE_ENV=production"
```

## Comandos Útiles

### Ver logs del servicio
```bash
gcloud run services logs read eduspark-frontend --region us-central1
```

### Ver logs en tiempo real
```bash
gcloud run services logs tail eduspark-frontend --region us-central1
```

### Ver información del servicio
```bash
gcloud run services describe eduspark-frontend --region us-central1
```

### Obtener URL del servicio
```bash
gcloud run services describe eduspark-frontend --region us-central1 --format 'value(status.url)'
```

### Actualizar el servicio
```bash
gcloud builds submit --config cloudbuild.yaml
```

### Ver métricas y uso
```bash
# En la consola de Google Cloud
https://console.cloud.google.com/run/detail/us-central1/eduspark-frontend/metrics?project=eduspark-py
```

## Health Check

El servicio incluye un endpoint de health check:
- **URL**: https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/health
- **Respuesta esperada**: `healthy`

## Costos Estimados

Con la configuración actual (min-instances: 0):

- **Sin tráfico**: $0.00/mes
- **1,000 requests/día**: ~$0.10-0.50/mes
- **10,000 requests/día**: ~$1-5/mes
- **100,000 requests/día**: ~$10-50/mes

### Desglose de costos
- **CPU**: $0.00002400 por vCPU-segundo
- **Memoria**: $0.00000250 por GiB-segundo
- **Requests**: $0.40 por millón
- **Tráfico saliente**: $0.12 por GB (primeros 10GB gratis/mes)

## Troubleshooting

### Error 403 (Forbidden)
Si recibes error 403, verifica los permisos IAM:
```bash
gcloud run services add-iam-policy-binding eduspark-frontend \
  --region us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

### El servicio no inicia
Revisa los logs para ver errores:
```bash
gcloud run services logs read eduspark-frontend --region us-central1 --limit 50
```

### Problemas con el puerto
El servicio debe escuchar en el puerto definido por la variable `PORT` (por defecto 8080). El script `start-nginx.sh` se encarga de esto automáticamente.

### Build falla
Verifica que todos los archivos necesarios estén incluidos:
- `src/` (código fuente)
- `audio-tutor/` (dependencias del tutor)
- `package.json` y archivos de configuración

## Próximos Pasos Recomendados

1. **Configurar dominio personalizado** (opcional):
   ```bash
   gcloud run domain-mappings create \
     --service eduspark-frontend \
     --domain tu-dominio.com \
     --region us-central1
   ```

2. **Configurar CDN** (opcional):
   - Usar Cloud CDN para mejorar rendimiento
   - Configurar cache para assets estáticos

3. **Monitoreo**:
   - Configurar alertas en Cloud Monitoring
   - Revisar métricas de uso y costos

4. **Backup y versionado**:
   - Las imágenes Docker se guardan automáticamente en Container Registry
   - Cada build crea una nueva versión con tag `$BUILD_ID`

## Archivos de Configuración

- `Dockerfile-cloudrun`: Dockerfile optimizado para Cloud Run
- `nginx-cloudrun.conf`: Configuración de Nginx
- `start-nginx.sh`: Script de inicio para puerto dinámico
- `cloudbuild.yaml`: Configuración de Cloud Build
- `.gcloudignore`: Archivos excluidos del build
- `deploy-cloudrun.ps1`: Script de despliegue automatizado

## Soporte

Para más información:
- [Documentación de Cloud Run](https://cloud.google.com/run/docs)
- [Troubleshooting de Cloud Run](https://cloud.google.com/run/docs/troubleshooting)
- [Pricing de Cloud Run](https://cloud.google.com/run/pricing)

