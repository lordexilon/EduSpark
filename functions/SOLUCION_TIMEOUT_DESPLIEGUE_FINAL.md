# Solución al Timeout de Despliegue de Firebase Functions

## Problema

Al ejecutar `firebase deploy --only functions`, se producía el siguiente error:

```
Error: User code failed to load. Cannot determine backend specification. Timeout after 10000.
```

Este error ocurría durante la fase de análisis local del código, antes de subirlo a la nube.

## Causa

Firebase CLI intenta analizar el código localmente para determinar la especificación del backend antes de desplegarlo. Este análisis tiene un timeout predeterminado de 10 segundos. Si el código tarda más en cargarse (por ejemplo, debido a imports pesados o inicializaciones complejas), se produce el timeout.

## Solución

Aumentar el timeout de descubrimiento usando la variable de entorno `FUNCTIONS_DISCOVERY_TIMEOUT`.

### En Windows (PowerShell)

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT=30
firebase deploy --only functions
```

### En Linux/Mac

```bash
export FUNCTIONS_DISCOVERY_TIMEOUT=30
firebase deploy --only functions
```

### Desplegar función específica

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT=30
firebase deploy --only functions:create-job
```

## Resultado

Con el timeout aumentado a 30 segundos, el despliegue se completa exitosamente:

```
✓ functions[create-job:createFileProcessingJob(us-central1)] Successful update operation.
✓ functions[analyze-file:analyzeFile(us-central1)] Successful update operation.
✓ functions[process-job:processFileJob(us-central1)] Successful update operation.
✓ Deploy complete!
```

## Notas

- El timeout de 30 segundos es suficiente para la mayoría de los casos
- Si aún tienes problemas, puedes aumentar el valor a 60 segundos
- Esta solución no afecta el rendimiento de las funciones en producción, solo el proceso de despliegue
- La advertencia sobre `firebase-functions` desactualizado no impide el despliegue, pero se recomienda actualizar cuando sea posible

## Referencias

- [Firebase Functions Tips - Avoid Deployment Timeouts](https://firebase.google.com/docs/functions/tips#avoid_deployment_timeouts_during_initialization)

