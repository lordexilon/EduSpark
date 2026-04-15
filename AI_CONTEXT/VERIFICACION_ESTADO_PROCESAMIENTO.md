# 🔍 Verificación del Estado de Procesamiento

**Fecha:** Enero 2025  
**Estado:** ✅ IMPLEMENTADO - Requiere verificación en frontend

---

## 📋 Resumen

Se han implementado mejoras en la visualización del estado de procesamiento en `/teacher/file-processing`, pero el usuario reporta que no ve los cambios en el frontend.

---

## ✅ Cambios Implementados

### 1. **Detección Mejorada de Estados**

#### Estados Detectados:
- **⏳ Pendiente** (`pending`) - Amarillo - En cola esperando procesamiento
- **🔄 Procesando** (`processing`) - Azul - Procesando activamente
- **⚠️ Detenido** (stuck) - Naranja - Más de 2 horas sin actualizar
- **✅ Completado** (`completed`) - Verde - Procesamiento exitoso
- **❌ Error** (`failed`) - Rojo - Error en el procesamiento

#### Lógica de Detección:
```typescript
// Detección de procesamiento (incluyendo pending)
const isProcessing = fileJobs.some(j => {
  if (j.status !== 'processing' && j.status !== 'pending') return false;
  
  // Verificar si el job lleva más de 2 horas sin actualizar
  const updatedAt = j.updatedAt ? new Date(j.updatedAt) : new Date(j.createdAt);
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceUpdate > 2) {
    console.warn(`⚠️ Job ${j.id} lleva ${hoursSinceUpdate.toFixed(1)} horas sin actualizar`);
    return true; // Aún lo mostramos como procesando pero con advertencia
  }
  return true;
});

// Detectar jobs "stuck"
const hasStuckJob = fileJobs.some(j => {
  if (j.status !== 'processing' && j.status !== 'pending') return false;
  const updatedAt = j.updatedAt ? new Date(j.updatedAt) : new Date(j.createdAt);
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceUpdate > 2;
});
```

### 2. **Badges de Estado Mejorados**

Los badges ahora muestran:
- **En cola** (amarillo) - Para jobs con status `pending`
- **Procesando** (azul con animación) - Para jobs con status `processing`
- **Detenido** (naranja) - Para jobs que llevan más de 2 horas sin actualizar

### 3. **Panel de Estado Detallado**

Cuando hay un job, se muestra un panel con:
- Estado principal con iconos
- Etapa actual del procesamiento
- Progreso de chunks (si aplica)
- Tiempo transcurrido y estimado
- Velocidad de procesamiento
- Advertencia si está "stuck"

### 4. **Advertencia para Jobs Stuck**

Si un job lleva más de 2 horas sin actualizar, se muestra:
- Badge naranja "Detenido"
- Panel de advertencia con explicación
- Botón para cancelar y reintentar

---

## 🔧 Verificación Necesaria

### 1. **Verificar que los cambios se hayan guardado**

El archivo `src/pages/FileProcessingPage.tsx` debe contener:
- Línea ~988-1000: Lógica de detección de `isProcessing` y `hasStuckJob`
- Línea ~1076-1101: Badges de estado con colores diferenciados
- Línea ~1130-1139: Detección de `isStuck` para el job principal
- Línea ~1176-1213: Panel de estado con advertencia para jobs stuck

### 2. **Verificar en el navegador**

1. Abrir `http://localhost:5173/teacher/file-processing`
2. Verificar que los archivos con jobs muestren:
   - Badges de estado con colores correctos
   - Panel de estado detallado cuando hay un job
   - Advertencia si un job está "stuck"

### 3. **Verificar en la consola del navegador**

Buscar mensajes como:
- `⚠️ Job [id] lleva [X] horas sin actualizar`
- Logs de estado de procesamiento

### 4. **Verificar actualización en tiempo real**

Los jobs deberían actualizarse automáticamente cuando cambian de estado gracias a la suscripción en tiempo real.

---

## 🐛 Posibles Problemas

### 1. **Cache del navegador**
- **Solución:** Hacer hard refresh (Ctrl+Shift+R o Cmd+Shift+R)
- O limpiar cache del navegador

### 2. **Código no compilado**
- **Solución:** Verificar que el servidor de desarrollo esté corriendo
- Verificar que no haya errores de compilación

### 3. **Jobs sin actualizar**
- Si los jobs no tienen `updatedAt`, la detección de "stuck" puede no funcionar
- Verificar que los jobs tengan `updatedAt` en la base de datos

### 4. **Suscripción en tiempo real no funcionando**
- Verificar que `subscribeToAllJobs` esté funcionando correctamente
- Verificar conexión a Supabase

---

## 📊 Logs del RAG Worker

El usuario reporta errores en el rag-worker. Los logs muestran:
- Despliegues del servicio en Cloud Run
- Errores de procesamiento (necesita revisar logs específicos)

### Errores Comunes en RAG Worker:

1. **Timeout en descarga** - Archivo muy grande o conexión lenta
2. **Timeout en extracción** - PDF muy grande o corrupto
3. **Error de memoria** - Archivo demasiado grande para procesar
4. **Error de conexión** - Problemas de red o con Google Drive
5. **Error de autenticación** - Token de Google Drive expirado

### Verificación de Logs:

1. Ir a Google Cloud Console
2. Cloud Run > rag-worker
3. Ver logs de la función
4. Buscar errores específicos con timestamp `2025-11-30 00:56:44`

---

## 🔍 Comandos de Verificación

### Verificar código en el archivo:
```bash
# Verificar que los cambios estén presentes
grep -n "hasStuckJob\|isStuck\|Detenido\|En cola" src/pages/FileProcessingPage.tsx
```

### Verificar en el navegador:
1. Abrir DevTools (F12)
2. Ir a la pestaña Console
3. Buscar mensajes de error o advertencias
4. Verificar que los componentes se rendericen correctamente

### Verificar jobs en la base de datos:
```sql
-- Ver jobs recientes
SELECT id, status, created_at, updated_at, 
       EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 as hours_since_update
FROM file_processing_jobs
ORDER BY updated_at DESC
LIMIT 10;
```

---

## ✅ Checklist de Verificación

- [ ] Código guardado correctamente en `FileProcessingPage.tsx`
- [ ] Servidor de desarrollo corriendo sin errores
- [ ] Navegador con cache limpiado (hard refresh)
- [ ] Jobs visibles en la página de procesamiento
- [ ] Badges de estado mostrando colores correctos
- [ ] Panel de estado detallado visible cuando hay jobs
- [ ] Advertencia de "stuck" visible para jobs antiguos
- [ ] Logs del navegador sin errores críticos
- [ ] Suscripción en tiempo real funcionando

---

## 🚀 Próximos Pasos

1. **Verificar que los cambios se vean en el frontend**
2. **Revisar logs del rag-worker para entender el error de procesamiento**
3. **Probar con un archivo nuevo para verificar el flujo completo**
4. **Documentar cualquier error encontrado**

---

**Última actualización:** Enero 2025

