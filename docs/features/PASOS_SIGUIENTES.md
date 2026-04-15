# Próximos pasos para verificar procesamiento

## Estado actual

✅ Cloud Scheduler funcionando correctamente (envía JSON válido)
✅ `rag-worker` se ejecuta cada 2 minutos sin errores
❌ Williams Obstetricia no tiene chunks procesados (0/273, 273 fallidos según logs anteriores)

## Para verificar en la UI

### 1. En `/file-processing`

Busca el archivo "Williams Obstetricia 25a Edicion.pdf" y verifica:
- ¿Qué estado tiene el job? (Pendiente / Procesando / Completado / Fallido)
- ¿Muestra algún error?
- ¿Cuántos chunks se procesaron?

### 2. En `/materials`

Verifica el material "Williams Obstetricia 25a Edicion.pdf":
- ¿Aparece en la lista?
- ¿Qué estado RAG tiene? (pending / processing / completed / failed)
- ¿Muestra un conteo de chunks?

## Posibles causas del fallo

1. **Error al generar embeddings**: El servicio de OpenAI/Gemini falló
2. **Archivo muy grande**: Timeout durante el procesamiento
3. **Formato de PDF problemático**: El PDF no se pudo parsear correctamente
4. **Job en estado "processing" bloqueado**: El job está stuck y no vuelve a "pending"

## Acciones según el estado

### Si el job está en "Fallido" o "Completado" con 0 chunks:
- Reintentarlo desde la UI (botón "Reintentar")
- Esto creará un nuevo job con estado "pending" que el scheduler procesará

### Si el job está en "Procesando" stuck:
- Manualmente cambiar el estado a "pending" en Firestore
- O eliminar el job y crear uno nuevo

### Si el material no aparece:
- Verificar que el material esté en Supabase con el ID correcto
- Verificar que tenga `rag_status` definido

## Comando útil para verificar logs del procesamiento

```powershell
gcloud functions logs read rag-worker --region=us-central1 --limit=100 | Select-String -Pattern "Williams|880a47a7|error|Error|fallido|failed"
```

## Verificación manual desde la consola del navegador

En `/materials`, abre la consola y ejecuta:
```javascript
// Ver el material Williams Obstetricia
materials.find(m => m.title?.includes('Williams'))

// Ver conteo de chunks para ese material
materialChunks['dc42ade9-4883-4028-8049-693ff86a6763']
```

