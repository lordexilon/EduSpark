# Solución: Cloud Scheduler enviando JSON malformado

## Problema identificado

El `rag-worker` estaba fallando continuamente con:
```
SyntaxError: Expected property name or '}' in JSON at position 1
```

## Causa raíz

El Cloud Scheduler `rag-worker-scheduler` estaba enviando JSON malformado:
- **Antes**: `{action:processPendingJobs}` (sin comillas en las propiedades)
- **Esperado**: `{"action":"processPendingJobs"}` (JSON válido)

## Solución aplicada

1. **Eliminamos y recreamos el Cloud Scheduler** con JSON válido:
```bash
gcloud scheduler jobs delete rag-worker-scheduler --location=us-central1 --quiet

gcloud scheduler jobs create http rag-worker-scheduler \
  --location=us-central1 \
  --schedule="*/2 * * * *" \
  --uri="https://us-central1-eduspark-py.cloudfunctions.net/rag-worker" \
  --http-method=POST \
  --message-body-from-file=scheduler-body.json \
  --headers="Content-Type=application/json" \
  --time-zone="America/Montevideo" \
  --attempt-deadline=540s \
  --max-retry-attempts=3 \
  --min-backoff=10s \
  --max-backoff=300s
```

Donde `scheduler-body.json` contiene:
```json
{"action":"processPendingJobs"}
```

2. **Resultado**: El scheduler ahora invoca correctamente el `rag-worker` cada 2 minutos sin errores.

## Verificación

Logs del `rag-worker` después del fix (15:18:00):
```
[RAG Worker] Iniciando procesamiento...
[RAG Worker] No hay jobs pendientes
```

✅ **Sin errores de JSON parsing**

## Próximo paso

Investigar por qué no hay jobs pendientes para procesar (Williams Obstetricia y otros materiales).

