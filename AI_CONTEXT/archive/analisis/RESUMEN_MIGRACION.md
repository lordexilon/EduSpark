# Resumen de Análisis: Migración Módulos → Unidades

**Fecha:** Diciembre 2024  
**Estado:** ✅ Análisis Completo - Listo para Migración

---

## 📊 Datos Actuales Verificados

### Tabla `course_modules` (Sistema Admin/Coordinator):
- **Total:** 6 módulos
- **Cursos:** 1 curso (curso 9: "Cursillo de Ingreso - Medicina")
- **Módulos:**
  1. Comunicación (order: 1)
  2. Matemática (order: 2)
  3. Química (order: 3)
  4. Biología (order: 4)
  5. Anatomía (order: 5)
  6. Psicotécnico (order: 6)

### Tabla `course_units` (Sistema Teacher/Student):
- **Total:** 1 unidad
- **Cursos:** 1 curso (curso 1: "Matematica para Empresas 1")
- **Unidad:** Monomios (number: 1)

### Materiales:
- **`course_materials`** (con `module_id`): 2 materiales
- **`materials`** (con `unit_id`): 0 materiales

### Sesiones:
- **Total:** 1 sesión vinculada a unidad (curso 1)

---

## 🎯 Problema Confirmado

**El curso 9 tiene:**
- ✅ 6 módulos creados por Admin/Coordinator
- ✅ 2 materiales vinculados a esos módulos
- ❌ 0 unidades (por lo tanto, estudiantes NO ven nada)

**El curso 1 tiene:**
- ✅ 1 unidad creada por Teacher
- ✅ 1 sesión vinculada
- ✅ Visible para estudiantes

---

## ✅ Plan de Migración

### Paso 1: Migrar Módulos → Unidades
**Script:** `sql_scripts/77_migrar_modules_a_units.sql`

**Resultado esperado:**
- 6 nuevos registros en `course_units`
- Curso 9 tendrá 6 unidades
- Estudiantes podrán ver el contenido

### Paso 2: Migrar Materiales
**Script:** `sql_scripts/78_migrar_materiales_modules_a_units.sql`

**Resultado esperado:**
- 2 nuevos registros en `materials`
- Materiales vinculados a las unidades migradas
- Visible en CourseViewPage

### Paso 3: Actualizar Frontend
- Actualizar `CourseModulesPage.tsx`
- Actualizar `ModuleEditorPage.tsx`
- Ambos deben usar `course_units` en lugar de `course_modules`

---

## ⚠️ Advertencias

1. **Scripts en modo transacción:** Tienen `BEGIN;` pero requieren `COMMIT` manual
2. **Verificar antes de commit:** Revisar resultados de migración
3. **IDs nuevos:** Se generan nuevos UUIDs (no se preservan BIGINTs originales)
4. **Mapeo:** Módulos se mapean a unidades por `title` + `order_index`

---

## 🚀 Ejecutar Migración

1. Ejecutar `77_migrar_modules_a_units.sql`
   - Revisar resultados
   - Si todo OK: `COMMIT;`
   - Si hay problemas: `ROLLBACK;`

2. Ejecutar `78_migrar_materiales_modules_a_units.sql`
   - Revisar resultados
   - Si todo OK: `COMMIT;`

3. Verificar:
   - Ir a `/courses/9` como estudiante
   - Deberías ver 6 unidades con sus materiales

4. Actualizar frontend (después de migración)

---

## 📝 Estado

- ✅ Análisis completo
- ✅ Scripts de migración creados
- ⏳ Pendiente: Ejecutar migración
- ⏳ Pendiente: Actualizar frontend

