# Plan de Migración: course_modules → course_units

**Fecha:** Diciembre 2024  
**Objetivo:** Unificar el sistema para que Admin/Coordinator y Student usen la misma tabla (`course_units`)

---

## 📊 Estado Actual (Verificado)

### Datos Existentes:
- **`course_modules`**: 6 módulos (todos del curso 9)
  - Comunicación (order: 1)
  - Matemática (order: 2)
  - Química (order: 3)
  - Biología (order: 4)
  - Anatomía (order: 5)
  - Psicotécnico (order: 6)

- **`course_units`**: 1 unidad (curso 1)
  - Monomios (number: 1)

### Problema:
- Admin/Coordinator crea contenido en `course_modules` (curso 9)
- Student solo ve `course_units` (curso 1)
- **Resultado:** El contenido del curso 9 NO es visible para estudiantes

---

## ✅ Plan de Migración

### Fase 1: Migración de Datos ✅ (Scripts Creados)

1. **Ejecutar:** `sql_scripts/77_migrar_modules_a_units.sql`
   - Migra 6 módulos del curso 9 → 6 unidades
   - Convierte BIGINT → INTEGER para course_id
   - Mapea `order` → `order_index` y `number`

2. **Ejecutar:** `sql_scripts/78_migrar_materiales_modules_a_units.sql` (si hay materiales)
   - Migra materiales de `course_materials` → `materials`
   - Mapea `module_id` (BIGINT) → `unit_id` (UUID)

### Fase 2: Actualizar Frontend (Pendiente)

#### 2.1 Actualizar `CourseModulesPage.tsx`
**Actual:** Usa `course_modules` (servicio `modules.ts`)  
**Nuevo:** Debe usar `course_units` (servicio `unitService`)

**Cambios necesarios:**
- Cambiar servicio de `modules.ts` a `unitService` de `teacherCourses.ts`
- Adaptar tipos: `BIGINT` → `UUID`
- Actualizar rutas si es necesario

#### 2.2 Actualizar `ModuleEditorPage.tsx`
**Actual:** Usa `course_modules` y `course_materials`  
**Nuevo:** Debe usar `course_units` y `materials`

**Cambios necesarios:**
- Cambiar de `course_modules` a `course_units`
- Cambiar de `course_materials` a `materials`
- Actualizar servicios y tipos

#### 2.3 Verificar `CourseEditorPage.tsx`
**Estado:** ✅ Ya usa `course_units` correctamente  
**Acción:** Solo verificar compatibilidad después de migración

---

## 📋 Checklist de Ejecución

### Pre-Migración:
- [x] Verificar datos existentes (✅ Completado)
- [x] Crear scripts de migración (✅ Completado)
- [ ] **Revisar scripts con usuario antes de ejecutar**

### Ejecución de Migración:
- [ ] Ejecutar `77_migrar_modules_a_units.sql`
  - ⚠️ Está en modo BEGIN; debe hacer COMMIT al final si todo está bien
- [ ] Verificar que se crearon 6 nuevas unidades para curso 9
- [ ] Ejecutar `78_migrar_materiales_modules_a_units.sql` (si aplica)
- [ ] Verificar que CourseViewPage muestra el contenido del curso 9

### Post-Migración:
- [ ] Actualizar `CourseModulesPage.tsx` para usar `course_units`
- [ ] Actualizar `ModuleEditorPage.tsx` para usar `course_units`
- [ ] Probar creación/edición de unidades desde Admin/Coordinator
- [ ] Verificar que Student ve el contenido
- [ ] Opcional: Deprecar `course_modules` después de verificar

---

## ⚠️ Advertencias

1. **Scripts en modo BEGIN:** Los scripts tienen `BEGIN;` pero NO hacen `COMMIT` automático
   - Revisar resultados antes de hacer COMMIT
   - Si hay problemas, hacer ROLLBACK

2. **Tipos de datos diferentes:**
   - `course_modules.id`: BIGINT
   - `course_units.id`: UUID
   - Los scripts generan nuevos UUIDs, no se preservan los IDs originales

3. **Verificar mapeo:**
   - Los módulos se mapean a unidades por: `title` + `order_index`
   - Si hay duplicados de título, puede haber conflictos

4. **Materiales:**
   - `course_materials` usa `module_id` (BIGINT)
   - `materials` usa `unit_id` (UUID)
   - El script de migración mapea correctamente, pero verificar manualmente

---

## 🎯 Resultado Esperado

Después de la migración:
- ✅ El curso 9 tendrá 6 unidades visibles para estudiantes
- ✅ Admin/Coordinator pueden crear unidades (en lugar de módulos)
- ✅ Un solo sistema unificado: `course_units`
- ✅ El estudiante ve todo el contenido creado

---

## 📝 Próximos Pasos

1. **Usuario revisa scripts de migración**
2. **Ejecutar migración de datos** (scripts 77 y 78)
3. **Actualizar frontend** (CourseModulesPage y ModuleEditorPage)
4. **Probar flujo completo**
5. **Documentar cambios**

