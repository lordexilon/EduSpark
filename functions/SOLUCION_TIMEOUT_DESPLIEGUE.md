# Solución al Timeout en Despliegue de Firebase Functions

## Problema
```
Error: User code failed to load. Cannot determine backend specification. 
Timeout after 10000.
```

## Cambios Aplicados ✅

1. ✅ **Import dinámico de googleapis** en `analyzeFile/index.ts`
2. ✅ **Cálculo de costos actualizado** (2 vCPU, 4GB en lugar de 4 vCPU, 8GB)
3. ✅ **ChunkSize actualizado** a 60 páginas

## Solución: Desplegar Una Función a la Vez

El timeout ocurre cuando Firebase intenta analizar todas las funciones simultáneamente. La solución es desplegar una función a la vez:

### Paso 1: Desplegar createFileProcessingJob (La más simple)
```bash
firebase deploy --only functions:create-job
```

### Paso 2: Desplegar analyzeFile
```bash
firebase deploy --only functions:analyze-file
```

### Paso 3: Desplegar processFileJob (La más compleja)
```bash
firebase deploy --only functions:process-job
```

## Alternativa: Aumentar Timeout de Análisis

Si el problema persiste, puedes intentar:

1. **Limpiar y reconstruir**:
```bash
cd functions/analyzeFile
rm -rf node_modules lib package-lock.json
npm install
npm run build

cd ../createFileProcessingJob
rm -rf node_modules lib package-lock.json
npm install
npm run build

cd ../processFileJob
rm -rf node_modules lib package-lock.json
npm install
npm run build

cd ../..
firebase deploy --only functions
```

2. **Verificar que no haya código ejecutándose en el nivel superior**:
   - ✅ `analyzeFile`: Solo imports y definiciones de funciones
   - ✅ `createFileProcessingJob`: Solo imports y definiciones
   - ✅ `processFileJob`: Usa imports dinámicos correctamente

## Verificación Post-Despliegue

Después de desplegar, verifica en Firebase Console:
- ✅ Funciones desplegadas correctamente
- ✅ Configuración de memoria correcta (4GB para processFileJob)
- ✅ Timestamp reciente

## Si el Problema Persiste

1. **Revisar logs detallados**:
```bash
firebase deploy --only functions --debug 2>&1 | tee deploy.log
```

2. **Verificar versión de firebase-functions**:
```bash
cd functions/analyzeFile
npm list firebase-functions
# Debe ser v7.0.0 o superior
```

3. **Verificar que TypeScript compile sin errores**:
```bash
cd functions/analyzeFile
npm run build
# No debe haber errores
```

## Nota Importante

El timeout de 10 segundos es un límite de Firebase para analizar el código durante el despliegue. Los imports dinámicos ayudan, pero si el módulo tiene muchas dependencias pesadas, puede tardar más.

La mejor solución es **desplegar una función a la vez** para evitar que Firebase intente analizar todo simultáneamente.

