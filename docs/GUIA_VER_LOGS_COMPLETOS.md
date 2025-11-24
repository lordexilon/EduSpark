# Guía: Ver Logs Completos de un Job

## Problema
Solo estás viendo el error final, pero necesitas ver los logs de diagnóstico que muestran qué está pasando antes del error.

## Solución: Ver Logs Completos en Firebase Console

### Opción 1: Desde Firebase Console (Recomendado)

1. Ve a [Firebase Console - Logs](https://console.firebase.google.com/project/eduspark-py/functions/logs)
2. En el filtro de búsqueda, escribe: `processfilejob`
3. Busca el timestamp del error: `2025-11-18T11:16:01`
4. **IMPORTANTE**: Busca logs **ANTES** de ese timestamp que contengan:
   - `🔍 Buscando token de Google Drive para userId:`
   - `Verificando todos los tokens del usuario`
   - `Buscando token de Drive`
   - `Token encontrado` o `No se encontró token`

### Opción 2: Desde Google Cloud Console

1. Ve a [Google Cloud Console - Logs Explorer](https://console.cloud.google.com/logs/query?project=eduspark-py)
2. Usa esta consulta:

```
resource.type="cloud_run_revision"
resource.labels.service_name="processfilejob"
timestamp>="2025-11-18T11:15:00Z"
timestamp<="2025-11-18T11:17:00Z"
```

3. Esto mostrará todos los logs de ese período, incluyendo los de diagnóstico

### Opción 3: Desde la Terminal (si tienes gcloud CLI)

```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=processfilejob AND timestamp>=\"2025-11-18T11:15:00Z\" AND timestamp<=\"2025-11-18T11:17:00Z\"" \
  --project=eduspark-py \
  --limit=100 \
  --format="table(timestamp, textPayload)" \
  --freshness=1h
```

## Qué Buscar en los Logs

Los logs deberían mostrar esta secuencia:

1. **Inicio del procesamiento:**
   ```
   🚀 Iniciando procesamiento del job WywM1Kgj5aFFqaE4mjgh
   👤 Obteniendo token para userId: b72dabe7-9ace-4e50-aa17-f770c5c94c0e
   ```

2. **Diagnóstico de tokens:**
   ```
   🔍 Buscando token de Google Drive para userId: b72dabe7-9ace-4e50-aa17-f770c5c94c0e
     - Supabase URL: https://mckfscukxcqwntpjagar...
     - Service Role Key configurado: Sí
     - Verificando todos los tokens del usuario...
     - Tokens encontrados para este usuario: X
     - Token 1: service_type="drive", expires_at="...", created_at="..."
   ```

3. **Búsqueda específica:**
   ```
     - Buscando token de Drive...
     - ✅ Token de tipo "drive" encontrado
   ```
   O:
   ```
     - ⚠️ Error buscando token "drive": 404 - ...
     - Buscando token de tipo "both"...
   ```

4. **Resultado final:**
   ```
   ❌ No se encontró token de Google Drive para userId: ...
   ```
   O:
   ```
   ✅ Token obtenido exitosamente (longitud: XXX caracteres)
   ```

## Si No Aparecen los Logs de Diagnóstico

Si no ves los logs que empiezan con `🔍 Buscando token`, significa que:

1. **La función no se desplegó correctamente:**
   - Verifica que el deployment fue exitoso
   - Espera 2-3 minutos después del deployment
   - Intenta procesar un archivo nuevo

2. **El error ocurre antes de llegar a getGoogleDriveToken:**
   - Revisa los logs anteriores para ver si hay otro error
   - Verifica que `userId` esté presente en `jobData.metadata`

3. **Los logs están en otro lugar:**
   - Busca en `stdout` en lugar de `stderr`
   - Algunos logs pueden estar en diferentes streams

## Próximos Pasos

1. **Ejecuta la consulta de logs** usando una de las opciones arriba
2. **Copia todos los logs** relacionados con ese job
3. **Compártelos** para que pueda analizar qué está pasando exactamente

## Consulta SQL Rápida para Verificar Tokens

Mientras tanto, ejecuta esto en Supabase para verificar que el token existe:

```sql
SELECT 
  id,
  user_id,
  service_type,
  expires_at,
  created_at,
  CASE 
    WHEN expires_at IS NULL THEN 'No expira'
    WHEN expires_at > NOW() THEN 'Válido'
    ELSE 'Expirado'
  END as estado
FROM user_google_tokens
WHERE user_id = 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e'
ORDER BY created_at DESC;
```

