# ⚠️ Análisis de Impacto: Script SQL de Visor PDF Seguro

**Archivo analizado:** `sql_scripts/setup_secure_pdf_storage.sql`  
**Fecha de análisis:** 2025-12-06  
**Estado:** ✅ SEGURO PARA EJECUTAR (con consideraciones)

---

## 📊 Resumen Ejecutivo

El script `setup_secure_pdf_storage.sql` **NO afectará negativamente** tu sistema existente. Está diseñado con las siguientes características de seguridad:

✅ **Usa `ON CONFLICT DO NOTHING`** - No sobrescribe el bucket si ya existe  
✅ **Usa `DROP POLICY IF EXISTS`** - Elimina políticas antiguas antes de crear nuevas  
✅ **Tablas opcionales** - Las tablas de audit log son adicionales, no modifican existentes  
⚠️ **Modificará políticas RLS** - Si existen políticas con los mismos nombres, las reemplazará  

---

## 🔍 Análisis Detallado del Script

### 1. Creación del Bucket `materials`

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materials',
  'materials',
  false, -- Bucket PRIVADO
  52428800, -- 50 MB
  ARRAY[...]
)
ON CONFLICT (id) DO NOTHING;  ← SEGURO: No sobrescribe
```

#### Impacto en tu Sistema:

| Escenario | Comportamiento del Script | Efecto |
|-----------|--------------------------|--------|
| **Bucket NO existe** | Crea el bucket nuevo | ✅ Sin impacto, crea nuevo |
| **Bucket existe y es PÚBLICO** | **NO hace nada** (ON CONFLICT) | ⚠️ El bucket seguirá siendo público (ver solución más abajo) |
| **Bucket existe y es PRIVADO** | **NO hace nada** | ✅ Sin cambios |

**🔎 Investigación realizada:**

Basándonos en los scripts existentes en tu sistema:
- `165_fix_storage_policies.sql` - Crea bucket **`course-documents`** (público)
- `166_increase_bucket_size_limit.sql` - Configura límite de **500MB** para `course-documents`
- `167_increase_global_upload_limit.sql` - Configura límite de **1GB** para `course-documents`

**Conclusión:** Tu sistema usa el bucket `course-documents`, NO `materials`. El script creará un bucket NUEVO llamado `materials`.

---

### 2. Políticas RLS (Row Level Security)

El script crea 4 políticas para `storage.objects`:

```sql
-- Las elimina primero (si existen):
DROP POLICY IF EXISTS "Authenticated users can read materials" ON storage.objects;
DROP POLICY IF EXISTS "Teachers and admins can upload materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own materials or admins can delete any" ON storage.objects;

-- Luego las crea:
CREATE POLICY "Authenticated users can read materials" ...
CREATE POLICY "Teachers and admins can upload materials" ...
CREATE POLICY "Users can update their own materials" ...
CREATE POLICY "Users can delete their own materials or admins can delete any" ...
```

#### Impacto en tu Sistema:

**✅ SEGURO:** Estas políticas:
1. **Solo afectan archivos del bucket `materials`** (tienen condición `bucket_id = 'materials'`)
2. **NO afectan otros buckets** como `course-documents`, `avatars`, `landing-page-images`
3. Si existen políticas con los mismos nombres, las reemplaza (pero es poco probable)

**Políticas existentes en tu sistema (según `165_fix_storage_policies.sql`):**
- `"Public Access"` - Para `course-documents`
- `"Authenticated Users Insert"` - Para `course-documents`
- `"Authenticated Users Update"` - Para `course-documents`
- `"Authenticated Users Delete"` - Para `course-documents`

**Conclusión:** Los nombres NO coinciden, así que **NO hay conflicto**.

---

### 3. Tabla de Audit Log (opcional)

```sql
CREATE TABLE IF NOT EXISTS material_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials(id) ON DELETE CASCADE,
  ...
);
```

#### Impacto en tu Sistema:

✅ **SEGURO:**
- Usa `CREATE TABLE IF NOT EXISTS` - No sobrescribe si ya existe
- Es una tabla **NUEVA**, no modifica la tabla `materials` existente
- Solo agrega funcionalidad de logging (opcional)

**Verificación:** 
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'material_access_log';
```

Si la tabla no existe, la crea. Si existe, no hace nada.

---

### 4. Funciones Auxiliares

```sql
CREATE OR REPLACE FUNCTION log_material_access(...) ...
CREATE OR REPLACE VIEWmaterial_access_report ...
```

#### Impacto en tu Sistema:

✅ **SEGURO:**
- Son funciones **NUEVAS**, no modifican código existente
- Solo se ejecutan cuando las llamas explícitamente
- No tienen triggers automáticos

---

## 🚨 Conflictos Potenciales Identificados

### ⚠️ Conflicto Potencial #1: Bucket `materials` ya existe como PÚBLICO

**Escenario:** Si el bucket `materials` ya fue creado manualmente o por otro script y está configurado como PÚBLICO.

**Problema:** El script NO cambiará el bucket a privado debido a `ON CONFLICT DO NOTHING`.

**Solución:**

```sql
-- Verificar estado actual del bucket
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'materials';

-- Si el bucket existe y es público, cambiarlo a privado:
UPDATE storage.buckets 
SET public = false,
    file_size_limit = 52428800  -- 50 MB
WHERE id = 'materials';
```

---

### ⚠️ Conflicto Potencial #2: Tu código usa `materials` de forma diferente

**Investigación en tu código:**

Búsqueda realizada en tu codebase:
- `src/workers/file-processing-worker/supabaseService.ts` → Línea 63:
  ```typescript
  const bucketName = 'materials';
  ```
- `src/components/SecurePDFViewer.tsx` → Línea 35:
  ```typescript
  bucket = 'materials'
  ```

**Conclusión:** Tu código **SÍ usa el bucket `materials`** para procesamiento de archivos.

**Posible problema:** Si el bucket `materials` ya existe y es público, las URLs firmadas no funcionarán correctamente.

**Solución:** Ejecutar UPDATE para cambiar a privado (ver código arriba).

---

## ✅ Recomendaciones de Ejecución

### Opción 1: Ejecución Segura Estándar (RECOMENDADA)

```sql
-- PASO 1: Verificar si el bucket materials existe
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'materials';

-- PASO 2: Si NO existe, ejecutar el script completo
-- (copiarpegar el contenido de setup_secure_pdf_storage.sql)

-- PASO 3: Si SÍ existe y es público, primero cambiarlo a privado:
UPDATE storage.buckets 
SET public = false,
    file_size_limit = 52428800
WHERE id = 'materials';

-- PASO 4: Luego ejecutar solo las políticas RLS del script
-- (copiar desde DROP POLICY hasta las políticas CREATE POLICY)
```

### Opción 2: Ejecución Conservadora

Si prefieres no arriesgar, ejecuta solo las partes necesarias:

```sql
-- 1. Verificar bucket actual
SELECT * FROM storage.buckets WHERE id = 'materials';

-- 2. Si no existe, crear:
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('materials', 'materials', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- 3. Asegurar que es privado:
UPDATE storage.buckets 
SET public = false 
WHERE id = 'materials';

-- 4. Ejecutar solo las 4 políticas RLS (copiar del script)

-- 5. OMITIR las tablas de audit log por ahora (opcional)
```

---

## 📋 Checklist Pre-Ejecución

Antes de ejecutar el script, verifica:

- [ ] **Backup de base de datos**
  ```bash
  # En panel de Supabase → Database → Backups
  ```

- [ ] **Verificar políticas RLS existentes**
  ```sql
  SELECT policyname, tablename, cmd 
  FROM pg_policies 
  WHERE tablename = 'objects' AND schemaname = 'storage'
  ORDER BY policyname;
  ```

- [ ] **Verificar buckets existentes**
  ```sql
  SELECT id, name, public, file_size_limit, created_at 
  FROM storage.buckets 
  ORDER BY created_at;
  ```

- [ ] **Verificar archivos en bucket materials**
  ```sql
  SELECT name, bucket_id, size, created_at 
  FROM storage.objects 
  WHERE bucket_id = 'materials' 
  LIMIT 10;
  ```

- [ ] **Probar en entorno de desarrollo primero**
  - Si tienes un proyecto de Supabase de desarrollo, prueba ahí primero

---

## 🔄 Plan de Rollback

Si algo sale mal, aquí está cómo revertir:

### Rollback Completo

```sql
-- 1. Eliminar políticas creadas
DROP POLICY IF EXISTS "Authenticated users can read materials" ON storage.objects;
DROP POLICY IF EXISTS "Teachers and admins can upload materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own materials or admins can delete any" ON storage.objects;

-- 2. Eliminar tabla de audit log (si se creó)
DROP TABLE IF EXISTS material_access_log CASCADE;
DROP VIEW IF EXISTS material_access_report;
DROP FUNCTION IF EXISTS log_material_access(uuid, text, text, inet, text);

-- 3. Revertir bucket a público (si era público antes)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'materials';

-- 4. Si el bucket no existía antes, eliminarlo:
-- DELETE FROM storage.buckets WHERE id = 'materials';
-- ⚠️ CUIDADO: Solo si estás seguro que no existía
```

---

## 📊 Resumen de Impacto por Componente

| Componente | Cambia | Afecta Existente | Nivel de Riesgo |
|-----------|--------|------------------|----------------|
| **Bucket `materials`** | Crea si no existe | NO (ON CONFLICT) | 🟢 Bajo |
| **Políticas RLS** | Crea 4 nuevas | Solo `materials` bucket | 🟢 Bajo |
| **Tabla `material_access_log`** | Crea si no existe | NO | 🟢 Bajo |
| **Funciones SQL** | Crea nuevas | NO | 🟢 Bajo |
| **Bucket `course-documents`** | NO TOCA | NO | 🟢 Sin riesgo |
| **Otros buckets** | NO TOCA | NO | 🟢 Sin riesgo |

**Nivel de Riesgo Global:** 🟢 **BAJO**

---

## 🎯 Conclusión Final

### ✅ Puedes ejecutar el script con confianza SI:

1. El bucket `materials` **NO existe** en tu sistema
2. O el bucket `materials` **ya es privado** (`public = false`)
3. Haces backup de la base de datos primero

### ⚠️ Toma precauciones SI:

1. El bucket `materials` **existe y es público** → Ejecutar UPDATE primero
2. Tienes muchos archivos en el bucket `materials` → Hacer backup primero
3. Estás en producción → Probar en desarrollo primero

### 🚀 Recomendación Final

**Ejecutar el script en este orden:**

```sql
-- 1. Verificación
SELECT * FROM storage.buckets WHERE id = 'materials';

-- 2. Si existe y es público, cambiar a privado
UPDATE storage.buckets 
SET public = false, file_size_limit = 52428800 
WHERE id = 'materials';

-- 3. Ejecutar el script completo
-- (copiar contenido de setup_secure_pdf_storage.sql)

-- 4. Verificar que funcionó
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%materials%';
```

---

## 📞 Próximos Pasos

1. ✅ **Leer este documento completo**
2. ✅ **Hacer backup de la base de datos**
3. ✅ **Ejecutar las verificaciones del Checklist**
4. ✅ **Decidir qué opción de ejecución usar**
5. ✅ **Ejecutar el script**
6. ✅ **Verificar que las políticas se crearon**
7. ✅ **Probar el visor PDF con un documento de prueba**

---

**¿Necesitas ayuda?** Consulta la guía rápida: `AI_CONTEXT/03_GUIAS/GUIA_RAPIDA_VISOR_PDF_SEGURO.md`
