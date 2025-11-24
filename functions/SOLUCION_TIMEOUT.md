# Solución al Error de Timeout en Despliegue

## Problema

```
Error: User code failed to load. Cannot determine backend specification. 
Timeout after 10000. See https://firebase.google.com/docs/functions/tips#avoid_deployment_timeouts_during_initialization
```

## Causa

Firebase está intentando analizar el código durante el despliegue y los imports dinámicos están causando timeout.

## Soluciones Aplicadas

### 1. ✅ Actualizar firebase-functions

Ya actualizado a `^6.0.0` en todos los package.json

### 2. Verificar que el código compile

```bash
cd functions/processFileJob
npm run build
```

Si hay errores de compilación, corrígelos primero.

### 3. Soluciones Adicionales

#### Opción A: Desplegar con más tiempo (Recomendado)

Agregar flag `--debug` para ver más detalles:

```bash
firebase deploy --only functions --debug
```

#### Opción B: Desplegar una función a la vez

```bash
# Primero la más simple
firebase deploy --only functions:create-job

# Luego analyze
firebase deploy --only functions:analyze-file

# Finalmente process (la más compleja)
firebase deploy --only functions:process-job
```

#### Opción C: Verificar que no haya código ejecutándose en el nivel superior

Asegúrate de que el código solo se ejecute dentro de las funciones, no al importar el módulo.

#### Opción D: Limpiar y reconstruir

```bash
# Limpiar node_modules y reinstalar
cd functions/processFileJob
rm -rf node_modules package-lock.json
npm install
npm run build

cd ../createFileProcessingJob
rm -rf node_modules package-lock.json
npm install
npm run build

cd ../analyzeFile
rm -rf node_modules package-lock.json
npm install
npm run build

# Volver a la raíz y desplegar
cd ../..
firebase deploy --only functions
```

## Verificación

Después de aplicar las soluciones, verifica:

1. ✅ `firebase-functions` actualizado a v6
2. ✅ Código compila sin errores
3. ✅ No hay código ejecutándose en el nivel superior del módulo
4. ✅ Imports dinámicos solo dentro de funciones

## Si el problema persiste

1. **Revisar logs detallados**:
   ```bash
   firebase deploy --only functions --debug 2>&1 | tee deploy.log
   ```

2. **Verificar imports dinámicos**: Asegúrate de que los `await import()` solo se ejecuten dentro de las funciones, no al cargar el módulo.

3. **Simplificar temporalmente**: Comentar temporalmente los imports dinámicos para ver si ese es el problema.

4. **Contactar soporte**: Si nada funciona, puede ser un problema con la configuración de Firebase.

## Nota sobre Imports Dinámicos

El código ya usa imports dinámicos correctamente (lazy loading), pero Firebase puede tener problemas analizándolos. Si el problema persiste, considera mover algunos imports al nivel superior con try-catch:

```typescript
// En lugar de:
let google: any = null;
if (!google) {
  google = (await import('googleapis')).google;
}

// Podrías intentar:
let google: any;
try {
  google = require('googleapis').google;
} catch (e) {
  // Fallback
}
```

Pero esto puede aumentar el tiempo de inicialización, así que úsalo solo si es necesario.

