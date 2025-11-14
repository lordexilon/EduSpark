# Migración Frontend: course_modules → course_units

**Fecha:** Diciembre 2024  
**Estado:** ✅ En progreso

---

## ✅ Completado

1. **`pages/CourseModulesPage.tsx`** - Actualizado para usar `unitService`
   - Cambiado de `listModulesByCourse` → `unitService.getCourseUnits`
   - Cambiado de `createModule` → `unitService.createUnit`
   - Cambiado de `updateModule` → `unitService.updateUnit`
   - Cambiado de `deleteModule` → `unitService.deleteUnit`
   - Componente `ModuleCard` → `UnitCard`
   - Tipo: `BIGINT` → `UUID` para IDs

---

## ⏳ Pendiente

### 2. `pages/ModuleEditorPage.tsx`
**Cambios necesarios:**
- Cambiar `course_modules` → `course_units`
- Cambiar `course_materials` → `materials`
- Cambiar rutas: `/modules/${moduleId}` → `/units/${unitId}`
- Actualizar servicios:
  - `updateModule` → `unitService.updateUnit`
  - `listMaterialsByModule` → `materialService.getUnitMaterials`
  - `createMaterial` → `materialService.createMaterial`
  - `deleteMaterial` → `materialService.deleteMaterial`
  - `updateMaterial` → `materialService.updateMaterial`

### 3. `services/adminCourses.ts`
**Cambios necesarios:**
- `getModulesByCourse` → Usar `unitService.getCourseUnits` o crear wrapper
- Actualizar tipo de retorno: `CourseModuleRow` → `CourseUnit`

### 4. Rutas en `App.tsx`
**Cambios necesarios:**
- Verificar rutas que usan `/modules/` y cambiarlas a `/units/`
- Actualizar referencias en navegación

---

## 🔄 Archivos a deprecar (después de migración)

1. `services/modules.ts` - Ya no se usa (reemplazado por `unitService`)
2. `services/materials.ts` - Ya no se usa (reemplazado por `materialService` de `teacherCourses.ts`)

---

## 📋 Checklist Final

- [x] Actualizar `CourseModulesPage.tsx`
- [ ] Actualizar `ModuleEditorPage.tsx`
- [ ] Actualizar `services/adminCourses.ts`
- [ ] Verificar rutas en `App.tsx`
- [ ] Probar creación/edición de unidades
- [ ] Probar gestión de materiales
- [ ] Verificar que estudiantes ven el contenido
- [ ] Deprecar `services/modules.ts` y `services/materials.ts`

