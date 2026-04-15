# 📋 Instrucciones para Migración: course_modules → course_units

**Estado Actual Verificado:**
- ✅ 6 módulos en `course_modules` (curso 9)
- ✅ 2 materiales en `course_materials` (vinculados a módulos)
- ✅ 0 materiales en `materials` (nuevo sistema)
- ✅ 1 sesión en `sessions` (curso 1, ya correcta)

---

## 🚀 Pasos de Ejecución

### Paso 1: Ejecutar Migración de Módulos

Ejecutar el script: `sql_scripts/77_migrar_modules_a_units.sql`

**Qué hace:**
- Migra los 6 módulos del curso 9 → 6 unidades
- Convierte tipos: BIGINT → INTEGER, genera UUIDs
- Mapea `order` → `number` y `order_index`

**Resultado esperado:**
```sql
-- Deberías ver:
accion                           | cantidad
---------------------------------|----------
Unidades migradas desde módulos | 6
```

**Verificar:**
```sql
-- Después del INSERT, ejecutar manualmente:
SELECT 
  cm.id as modulo_id_original,
  cm.name as modulo_nombre,
  cu.id as unidad_id_nueva,
  cu.title as unidad_titulo,
  cu.number as unidad_numero
FROM course_modules cm
INNER JOIN course_units cu ON cu.course_id = cm.course_id::INTEGER
  AND cu.title = COALESCE(cm.title, cm.name)
  AND cu.order_index = COALESCE(cm."order", 0)
ORDER BY cm.course_id, cu.order_index;
```

**Deberías ver 6 filas** mapeando módulos → unidades.

**Si todo está bien:**
```sql
COMMIT;
```

**Si hay problemas:**
```sql
ROLLBACK;
```

---

### Paso 2: Ejecutar Migración de Materiales

Ejecutar el script: `sql_scripts/78_migrar_materiales_modules_a_units.sql`

**Qué hace:**
- Migra 2 materiales de `course_materials` → `materials`
- Mapea `module_id` (BIGINT) → `unit_id` (UUID)
- Vincula materiales a las unidades migradas

**Resultado esperado:**
```sql
-- Deberías ver:
accion                | total_migrados
---------------------|----------------
Materiales migrados  | 2
```

**Verificar:**
```sql
-- Después del INSERT, ejecutar manualmente:
SELECT 
  m.id,
  m.course_id,
  cu.title as unidad_titulo,
  m.title as material_titulo,
  m.kind,
  m.metadata->>'original_module_id' as modulo_original_id
FROM materials m
INNER JOIN course_units cu ON cu.id = m.unit_id
WHERE m.metadata->>'migrated_from' = 'course_materials'
ORDER BY m.course_id, cu.order_index;
```

**Deberías ver 2 filas** con los materiales migrados.

**Si todo está bien:**
```sql
COMMIT;
```

**Si hay problemas:**
```sql
ROLLBACK;
```

---

### Paso 3: Verificar en el Frontend

1. **Como estudiante, ir a:** `/courses/9`
   - Deberías ver 6 unidades:
     - Comunicación
     - Matemática
     - Química
     - Biología
     - Anatomía
     - Psicotécnico

2. **Abrir cada unidad:**
   - Verificar que los materiales aparezcan (si los hay)

3. **Verificar que el contenido es visible:**
   - Las unidades deben tener descripción/título correctos
   - Los materiales deben estar vinculados correctamente

---

## ⚠️ Advertencias Importantes

1. **Los scripts NO hacen COMMIT automático:**
   - Debes ejecutar `COMMIT;` manualmente después de verificar
   - O `ROLLBACK;` si algo sale mal

2. **IDs nuevos:**
   - Las unidades tendrán UUIDs nuevos (no se preservan los BIGINTs)
   - Los materiales tendrán UUIDs nuevos

3. **Mapeo:**
   - Módulos se mapean a unidades por: `title` + `order_index`
   - Si hay duplicados, puede haber conflictos

4. **Materiales:**
   - Solo se migran materiales con `module_id` NOT NULL
   - Se verifica que no haya duplicados

---

## 📝 Checklist

- [ ] Ejecutar `77_migrar_modules_a_units.sql`
- [ ] Verificar que se crearon 6 unidades
- [ ] Hacer `COMMIT;` o `ROLLBACK;`
- [ ] Ejecutar `78_migrar_materiales_modules_a_units.sql`
- [ ] Verificar que se migraron 2 materiales
- [ ] Hacer `COMMIT;` o `ROLLBACK;`
- [ ] Verificar en frontend (`/courses/9`) que las unidades son visibles
- [ ] Actualizar `CourseModulesPage.tsx` para usar `course_units`
- [ ] Actualizar `ModuleEditorPage.tsx` para usar `course_units`

---

## 🔄 Rollback (si es necesario)

Si necesitas revertir la migración:

```sql
-- Eliminar unidades migradas
DELETE FROM course_units 
WHERE EXISTS (
  SELECT 1 
  FROM course_modules cm
  WHERE cm.course_id::INTEGER = course_units.course_id
    AND COALESCE(cm.title, cm.name) = course_units.title
    AND COALESCE(cm."order", 0) = course_units.order_index
);

-- Eliminar materiales migrados
DELETE FROM materials
WHERE metadata->>'migrated_from' = 'course_materials';
```

---

## ✅ Resultado Final Esperado

Después de la migración:
- ✅ Curso 9 tendrá 6 unidades visibles
- ✅ 2 materiales vinculados a esas unidades
- ✅ Estudiantes pueden ver todo el contenido
- ✅ Admin/Coordinator puede seguir creando contenido (pero usando `course_units`)

