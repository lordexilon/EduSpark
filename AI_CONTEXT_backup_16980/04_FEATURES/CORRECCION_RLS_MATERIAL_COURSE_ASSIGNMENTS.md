# 🔧 Corrección de Ambigüedad en RLS - Material Course Assignments

**Fecha:** Enero 2025  
**Estado:** ✅ **RESUELTO Y DOCUMENTADO**  
**Script:** `sql_scripts/147_fix_material_course_assignments_ambiguous.sql`

---

## 📋 Resumen

Corrección crítica del error **"column reference 'course_id' is ambiguous"** que ocurría al asignar materiales a múltiples cursos mediante la función `assign_material_to_courses`. El problema estaba en las políticas RLS (Row Level Security) que tenían JOINs complejos causando ambigüedad cuando PostgreSQL evaluaba las políticas durante operaciones INSERT.

---

## 🐛 Problema Identificado

### Error Original
```
ERROR: column reference "course_id" is ambiguous
```

### Contexto
- **Tabla afectada:** `material_course_assignments`
- **Función afectada:** `assign_material_to_courses()`
- **Operación:** INSERT de asignaciones de materiales a cursos
- **Cuándo ocurría:** Al ejecutar la función desde la interfaz de administración de materiales

### Causa Raíz

Las políticas RLS tenían JOINs complejos con múltiples tablas que contenían referencias a `course_id`:

```sql
-- ❌ PROBLEMÁTICO: JOIN directo causaba ambigüedad
JOIN public.courses c ON c.id = material_course_assignments.course_id
WHERE ... AND c.institution_id = ui.institution_id
```

Cuando PostgreSQL evaluaba estas políticas durante un INSERT en una función `SECURITY DEFINER`, no podía determinar de qué tabla provenía `course_id` en ciertos contextos, especialmente cuando había múltiples tablas con esa columna en el scope de evaluación.

---

## ✅ Solución Implementada

### Estrategia: Funciones Auxiliares

Se crearon **funciones auxiliares** que encapsulan la lógica de verificación de permisos, eliminando JOINs complejos de las políticas RLS y pasando `course_id` explícitamente como parámetro.

### Funciones Creadas

#### 1. `is_course_teacher(p_course_id INTEGER)`

Verifica si el usuario autenticado es profesor del curso especificado.

```sql
CREATE OR REPLACE FUNCTION public.is_course_teacher(p_course_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses
    WHERE courses.id = p_course_id
      AND courses.teacher_id = COALESCE(
        NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
        auth.uid()
      )
  );
$$;
```

**Características:**
- ✅ Recibe `course_id` como parámetro explícito
- ✅ Sin JOINs complejos
- ✅ Función `STABLE` (puede ser optimizada/cacheada)
- ✅ `SECURITY DEFINER` para ejecutar con privilegios del propietario

#### 2. `has_institution_access_to_course(p_course_id INTEGER)`

Verifica si el usuario tiene acceso de institución (admin-campus o coordinator) al curso.

```sql
CREATE OR REPLACE FUNCTION public.has_institution_access_to_course(p_course_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    JOIN public.user_institutions ui ON ui.user_id = u.id
    JOIN public.courses c ON c.id = p_course_id
    WHERE u.id = COALESCE(...)
      AND r.name IN ('admin-campus', 'coordinator')
      AND u.is_active = true
      AND c.institution_id = ui.institution_id
  );
$$;
```

**Características:**
- ✅ `course_id` se pasa como parámetro, no se referencia desde contexto externo
- ✅ JOINs están dentro de la función, no en la política RLS
- ✅ Lógica centralizada y reutilizable

### Políticas RLS Simplificadas

#### Antes (Problemático)
```sql
CREATE POLICY "teachers_manage_material_assignments"
ON public.material_course_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.courses c
    JOIN public.user_institutions ui ON ...
    WHERE c.id = material_course_assignments.course_id  -- ❌ Ambigüedad
      AND c.institution_id = ui.institution_id
  )
)
```

#### Después (Corregido)
```sql
CREATE POLICY "teachers_manage_material_assignments"
ON public.material_course_assignments
FOR ALL
TO authenticated
USING (
  public.is_course_teacher(material_course_assignments.course_id)  -- ✅ Sin ambigüedad
)
WITH CHECK (
  public.is_course_teacher(material_course_assignments.course_id)
);
```

**Ventajas:**
- ✅ Políticas más simples y legibles
- ✅ Sin ambigüedad: `course_id` se pasa explícitamente
- ✅ Mejor rendimiento: funciones pueden ser optimizadas
- ✅ Mantenibilidad: lógica centralizada

### Función Principal Mejorada

La función `assign_material_to_courses` también fue mejorada:

```sql
-- Usa INSERT...SELECT con NOT EXISTS para evitar duplicados
INSERT INTO public.material_course_assignments (
    material_id, course_id, assigned_by, notes
)
SELECT 
    p_material_id::UUID, 
    v_mca_course_id::INTEGER,  -- Variable local para evitar ambigüedad
    p_assigned_by::UUID, 
    p_notes::TEXT
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.material_course_assignments mca
    WHERE mca.material_id = p_material_id
      AND mca.course_id = v_mca_course_id
);
```

**Mejoras:**
- ✅ Usa variable local `v_mca_course_id` para mayor claridad
- ✅ `INSERT...SELECT` con `NOT EXISTS` en lugar de `ON CONFLICT`
- ✅ Manejo de errores por curso individualmente

---

## 📊 Impacto y Beneficios

### Antes
- ❌ Error "column reference 'course_id' is ambiguous"
- ❌ Asignación de materiales fallaba completamente
- ❌ Políticas RLS complejas y difíciles de mantener
- ❌ JOINs en políticas causaban problemas de rendimiento

### Después
- ✅ Asignación de materiales funciona correctamente
- ✅ Políticas RLS simples y legibles
- ✅ Funciones auxiliares reutilizables
- ✅ Mejor rendimiento (funciones STABLE pueden ser cacheadas)
- ✅ Código más mantenible

---

## 🔍 Verificación Post-Implementación

### 1. Verificar Funciones
```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('is_course_teacher', 'has_institution_access_to_course');
```

### 2. Verificar Políticas
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'material_course_assignments';
```

### 3. Probar Función
```sql
SELECT * FROM assign_material_to_courses(
    'material-uuid'::uuid,
    ARRAY[1, 2]::integer[],
    'user-uuid'::uuid,
    'Notas de prueba'::text
);
```

---

## 📝 Lecciones Aprendidas

### 1. Evitar JOINs Complejos en Políticas RLS
Las políticas RLS deben ser simples. Si necesitas lógica compleja, usa funciones auxiliares.

### 2. Pasar Parámetros Explícitos
En lugar de referenciar columnas desde contexto externo, pasar valores como parámetros elimina ambigüedad.

### 3. Funciones STABLE para Verificaciones
Las funciones de verificación de permisos deben ser `STABLE` para permitir optimizaciones de PostgreSQL.

### 4. SECURITY DEFINER con Cuidado
Las funciones auxiliares usan `SECURITY DEFINER` para ejecutar con privilegios del propietario, pero deben tener `SET search_path` explícito para seguridad.

---

## 🔗 Referencias

- **Script SQL:** `sql_scripts/147_fix_material_course_assignments_ambiguous.sql`
- **Tabla relacionada:** `material_course_assignments`
- **Función principal:** `assign_material_to_courses()`
- **Documentación relacionada:** `SISTEMA_BIBLIOTECA_DOCUMENTOS.md`

---

## 🎨 Visualización en Interfaz

### Problema de Visualización en Tabla

Después de resolver el error de ambigüedad, se identificó que las asignaciones de materiales a cursos no se visualizaban en la tabla de administración de materiales, aunque sí se guardaban correctamente en la base de datos.

### Solución Implementada

Se agregó la función `loadAllMaterialAssignments()` que carga todas las asignaciones (cursos, unidades y sesiones) cuando se cargan los materiales en la página.

**Ubicación:** `src/pages/MaterialsManagementPage.tsx`

**Implementación:**
```typescript
const loadAllMaterialAssignments = async () => {
  // Carga asignaciones para todos los materiales en paralelo
  // Actualiza estados: materialCourses, materialUnits, materialSessions
};
```

**Integración:**
- Se ejecuta automáticamente cuando cambian los materiales (`useEffect`)
- Se recarga cuando se asigna un material desde el modal (`onAssigned` callback)
- Muestra badges con colores diferentes:
  - 🔵 Azul: Cursos asignados
  - 🟣 Morado: Unidades asignadas
  - 🟢 Verde: Sesiones asignadas

### Funciones del Servicio Utilizadas

- `materialService.getMaterialCourses(materialId)` - Obtiene cursos asignados
- `materialService.getMaterialUnits(materialId)` - Obtiene unidades asignadas
- `materialService.getMaterialSessions(materialId)` - Obtiene sesiones asignadas

---

## 🚀 Próximos Pasos

- [x] Resolver error de ambigüedad en RLS ✅
- [x] Implementar visualización de asignaciones en tabla ✅
- [ ] Considerar aplicar el mismo patrón a otras políticas RLS complejas
- [ ] Documentar funciones auxiliares en esquema de base de datos
- [ ] Crear tests unitarios para funciones auxiliares
- [ ] Monitorear rendimiento de políticas RLS simplificadas
- [ ] Verificar visualización de materiales en páginas de cursos (teacher/student)

---

**Última actualización:** Enero 2025  
**Autor:** Sistema de corrección automática  
**Estado:** ✅ Resuelto y en producción

