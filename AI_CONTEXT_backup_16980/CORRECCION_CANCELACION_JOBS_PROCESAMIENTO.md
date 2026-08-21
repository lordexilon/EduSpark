# Corrección: Cancelación de Jobs de Procesamiento

**Fecha:** 1 de Diciembre, 2025  
**Problema:** Jobs cancelados no se eliminaban correctamente y quedaban visibles en la UI  
**Estado:** ✅ Resuelto

## Problema Identificado

1. **Jobs cancelados permanecían visibles**: Cuando un usuario cancelaba un job, este se marcaba como `failed` con el mensaje "Cancelado por el usuario", pero permanecía visible en la interfaz junto con otros jobs fallidos.

2. **Función de cancelación usaba Firestore**: La función `cancelFileProcessingJob` estaba usando Firestore para actualizar jobs, pero los jobs están almacenados en Supabase.

3. **Múltiples jobs para el mismo archivo**: Al crear nuevos jobs después de cancelar uno, se acumulaban múltiples jobs (cancelados y nuevos) para el mismo archivo, causando confusión.

4. **Jobs eliminados no se refrescaban**: Después de eliminar un job manualmente, la lista no se actualizaba inmediatamente.

## Solución Implementada

### 1. Migración de `cancelFileProcessingJob` a Supabase

**Archivo:** `functions/cancelFileProcessingJob/index.ts`

**Cambios:**
- Migrado de Firestore a Supabase usando `@supabase/supabase-js`
- Implementada inicialización lazy de Supabase (igual que `createFileProcessingJob`)
- Cambiado el estado de `failed` a `cancelled` cuando se cancela un job
- Agregada validación para evitar cancelar jobs ya completados o cancelados

**Código clave:**
```typescript
// Actualizar el job a estado 'cancelled' en Supabase
const { error: updateError } = await getSupabase()
  .from('file_processing_jobs')
  .update({
    status: 'cancelled',
    error_message: 'Cancelado por el usuario',
    updated_at: new Date().toISOString()
  })
  .eq('id', jobId);
```

**Dependencias agregadas:**
- `@supabase/supabase-js`: ^2.75.1

### 2. Actualización de `cancelJob` en Frontend

**Archivo:** `src/services/firestoreService.ts`

**Cambios:**
- Cambiado el estado de `failed` a `cancelled` cuando se cancela un job desde el frontend

**Código:**
```typescript
export async function cancelJob(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('file_processing_jobs')
    .update({
      status: 'cancelled',  // Cambiado de 'failed' a 'cancelled'
      error_message: 'Cancelado por el usuario',
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);

  if (error) throw error;
}
```

### 3. Mejora del Filtrado de Jobs en la UI

**Archivo:** `src/pages/FileProcessingPage.tsx`

**Cambios:**
- Implementado filtrado inteligente de jobs cancelados
- Solo muestra jobs activos si existen
- Si todos los jobs están cancelados, muestra solo el más reciente
- Oculta automáticamente jobs cancelados antiguos

**Código clave:**
```typescript
// Filtrar jobs cancelados antiguos: solo mostrar el más reciente si todos están cancelados
// o excluir cancelados si hay otros jobs activos
const cancelledJobs = fileJobs.filter(j => 
  j.status === 'cancelled' || 
  (j.status === 'failed' && j.errorMessage === 'Cancelado por el usuario')
);
const activeJobs = fileJobs.filter(j => 
  j.status !== 'cancelled' && 
  !(j.status === 'failed' && j.errorMessage === 'Cancelado por el usuario')
);

// Si hay jobs activos, mostrar solo esos. Si todos están cancelados, mostrar solo el más reciente
if (activeJobs.length > 0) {
  fileJobs = activeJobs;
} else if (cancelledJobs.length > 0) {
  // Ordenar por fecha y tomar solo el más reciente
  cancelledJobs.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
    const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
    return dateB - dateA;
  });
  fileJobs = [cancelledJobs[0]]; // Solo el más reciente
}
```

### 4. Recarga Automática después de Eliminar

**Archivo:** `src/pages/FileProcessingPage.tsx`

**Cambios:**
- Agregada recarga manual de jobs después de eliminar un job
- Mejora la experiencia del usuario al reflejar cambios inmediatamente

**Código:**
```typescript
// Forzar recarga de jobs después de eliminar
setTimeout(async () => {
  console.log('[FileProcessing] Forzando recarga de jobs después de eliminar job...');
  try {
    const { getAllJobs } = await import('../services/firestoreService');
    const allJobs = await getAllJobs(user?.id || '');
    console.log(`[FileProcessing] Jobs cargados después de eliminar: ${allJobs.length}`, allJobs);
    setJobs(allJobs);
  } catch (err) {
    console.error('[FileProcessing] Error recargando jobs después de eliminar:', err);
  }
}, 1000);
```

### 5. Configuración en `firebase.json`

**Archivo:** `firebase.json`

**Cambios:**
- Agregada configuración para `cancelFileProcessingJob` con codebase `cancel-job`
- Variables de entorno configuradas para Supabase

**Configuración:**
```json
{
  "source": "functions/cancelFileProcessingJob",
  "codebase": "cancel-job",
  "runtime": "nodejs20",
  "environmentVariables": {
    "SUPABASE_URL": "https://mckfscukxcqwntpjagar.supabase.co",
    "SUPABASE_SERVICE_KEY": "..."
  }
}
```

## Despliegue

### Compilación
```bash
cd functions/cancelFileProcessingJob
npm install
npm run build
```

### Despliegue
```bash
firebase deploy --only functions:cancel-job
```

### URLs Desplegadas
- **Cloud Run:** `https://cancelfileprocessingjob-mcc5aevj6a-uc.a.run.app`
- **Cloud Functions:** `https://us-central1-eduspark-py.cloudfunctions.net/cancelFileProcessingJob`

## Estados de Jobs

### Estados Válidos
- `pending`: Job creado, esperando procesamiento
- `processing`: Job en proceso de ser procesado
- `completed`: Job completado exitosamente
- `failed`: Job falló por error técnico
- `cancelled`: Job cancelado por el usuario

### Comportamiento por Estado

**Jobs Cancelados:**
- Se marcan con `status: 'cancelled'` y `error_message: 'Cancelado por el usuario'`
- Se ocultan automáticamente si hay jobs activos para el mismo archivo
- Si todos los jobs están cancelados, solo se muestra el más reciente

**Jobs Fallidos:**
- Se marcan con `status: 'failed'` y un `error_message` descriptivo
- Se muestran en la UI para que el usuario pueda ver el error y reintentar

## Flujo de Cancelación

1. **Usuario cancela un job:**
   - Frontend llama a `cancelJob()` desde `firestoreService.ts`
   - Se actualiza el job en Supabase con `status: 'cancelled'`

2. **Cloud Function (opcional):**
   - Si se usa la Cloud Function `cancelFileProcessingJob`, valida permisos y actualiza el job
   - Retorna éxito o error según corresponda

3. **UI se actualiza:**
   - La suscripción en tiempo real detecta el cambio
   - El filtrado inteligente oculta el job cancelado si hay jobs activos
   - Si todos están cancelados, muestra solo el más reciente

## Flujo de Eliminación

1. **Usuario elimina un job:**
   - Se ejecuta `handleDeleteFailed()` en `FileProcessingPage.tsx`
   - Se elimina el job de Supabase usando `DELETE` query
   - Se oculta el archivo asociado

2. **Recarga automática:**
   - Después de 1 segundo, se recargan los jobs manualmente
   - La UI se actualiza para reflejar la eliminación

## Pruebas Recomendadas

1. **Cancelar un job en procesamiento:**
   - Verificar que el job se marca como `cancelled`
   - Verificar que desaparece de la UI si hay otros jobs activos

2. **Eliminar un job fallido:**
   - Verificar que el job se elimina de la base de datos
   - Verificar que la lista se actualiza inmediatamente

3. **Crear nuevo job después de cancelar:**
   - Verificar que solo se muestra el nuevo job activo
   - Verificar que los jobs cancelados antiguos están ocultos

4. **Múltiples jobs para el mismo archivo:**
   - Crear varios jobs para el mismo archivo
   - Cancelar algunos y verificar que solo se muestran los activos

## Notas Técnicas

### Inicialización Lazy de Supabase
La función `cancelFileProcessingJob` usa inicialización lazy para evitar problemas durante el análisis del código por Firebase CLI:

```typescript
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || DEFAULT_SUPABASE_SERVICE_KEY;
    supabase = createClient(url, key);
  }
  return supabase;
}
```

### Manejo de Tipos TypeScript
Se usó `as any` para evitar problemas de tipos con Supabase durante la compilación:

```typescript
const { error: updateError } = await (getSupabase()
  .from('file_processing_jobs') as any)
  .update({...})
  .eq('id', jobId);
```

## Archivos Modificados

1. `functions/cancelFileProcessingJob/index.ts` - Migración a Supabase
2. `functions/cancelFileProcessingJob/package.json` - Agregada dependencia de Supabase
3. `src/services/firestoreService.ts` - Cambio de estado a `cancelled`
4. `src/pages/FileProcessingPage.tsx` - Filtrado inteligente y recarga automática
5. `firebase.json` - Configuración de codebase para cancel-job

## Referencias

- [GUIA_DESPLIEGUE_CLOUD_FUNCTIONS_V2.md](./GUIA_DESPLIEGUE_CLOUD_FUNCTIONS_V2.md) - Guía de despliegue de Cloud Functions v2
- [FLUJO_COMPLETO_PROCESAMIENTO_ARCHIVOS.md](./FLUJO_COMPLETO_PROCESAMIENTO_ARCHIVOS.md) - Flujo completo de procesamiento
- [DIAGNOSTICO_ERRORES_PROCESAMIENTO_ARCHIVOS.md](./DIAGNOSTICO_ERRORES_PROCESAMIENTO_ARCHIVOS.md) - Diagnóstico de errores

## Problema Adicional: Eliminación de Jobs

**Fecha:** 1 de Diciembre, 2025  
**Problema:** Los jobs no se eliminaban correctamente después de hacer DELETE  
**Causa:** Falta de política RLS para operaciones DELETE  
**Estado:** ✅ Resuelto

### Problema Identificado

1. **DELETE no funcionaba**: Los jobs no se eliminaban de la base de datos
2. **Error de permisos**: `auth.uid()` devolvía `null` en consultas SQL directas
3. **RLS bloqueando DELETE**: No había política RLS que permitiera DELETE para usuarios autenticados

### Solución Implementada

#### 1. Política RLS para DELETE

**Script:** `sql_scripts/91_fix_rls_delete_file_processing_jobs.sql`

```sql
CREATE POLICY "Users can delete own jobs" ON public.file_processing_jobs
    FOR DELETE 
    TO authenticated
    USING (user_id = auth.uid());
```

#### 2. Verificación de Permisos en Frontend

**Archivo:** `src/pages/FileProcessingPage.tsx`

**Cambios:**
- Verifica sesión activa antes de eliminar
- Verifica que el job pertenezca al usuario
- Logging detallado para diagnóstico
- Eliminación inmediata del estado local
- Recarga después de eliminar con verificación

**Código clave:**
```typescript
// Verificar que el usuario esté autenticado
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !session) {
  throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
}

// Verificar que el job pertenece al usuario antes de eliminar
const { data: jobData, error: fetchError } = await supabase
  .from('file_processing_jobs')
  .select('id, user_id')
  .eq('id', jobId)
  .single();

if (jobData.user_id !== session.user.id) {
  throw new Error('No tienes permisos para eliminar este job.');
}

// Eliminar el job (la política RLS verifica user_id = auth.uid())
const { data: deleteData, error: deleteError } = await supabase
  .from('file_processing_jobs')
  .delete()
  .eq('id', jobId)
  .select();

// Filtrar inmediatamente del estado local
setJobs(prevJobs => prevJobs.filter(j => j.id !== jobId));
```

### Políticas RLS para file_processing_jobs

Después de la corrección, las políticas son:

1. **SELECT**: `Users can view their own jobs` - `auth.uid() = user_id`
2. **INSERT**: `Users can insert their own jobs` - `auth.uid() = user_id`
3. **UPDATE**: `Users can update their own jobs` - `auth.uid() = user_id`
4. **DELETE**: `Users can delete own jobs` - `user_id = auth.uid()`

### Scripts SQL de Diagnóstico

- `sql_scripts/90_check_rls_policies_file_processing_jobs.sql`: Verifica políticas RLS existentes
- `sql_scripts/91_fix_rls_delete_file_processing_jobs.sql`: Crea política DELETE si falta

### Flujo de Eliminación

1. **Usuario hace clic en eliminar**
   - Se muestra confirmación
   - Se verifica sesión activa
   - Se verifica que el job pertenezca al usuario

2. **Ejecución del DELETE**
   - DELETE se ejecuta con política RLS verificando `user_id = auth.uid()`
   - Se retorna el job eliminado en `deleteData`

3. **Actualización del estado**
   - Job se filtra inmediatamente del estado local
   - Se recarga la lista después de 2 segundos
   - Se verifica que el job realmente se eliminó

4. **Suscripción en tiempo real**
   - Detecta el evento DELETE
   - Recarga la lista de jobs
   - UI se actualiza automáticamente

## Estado Final

✅ **Función de cancelación migrada a Supabase**  
✅ **Jobs cancelados se ocultan automáticamente**  
✅ **Recarga automática después de eliminar**  
✅ **Despliegue exitoso en Cloud Run**  
✅ **UI mejorada con filtrado inteligente**  
✅ **Política RLS para DELETE creada**  
✅ **Eliminación de jobs funcionando correctamente**  
✅ **Verificación de permisos implementada**

