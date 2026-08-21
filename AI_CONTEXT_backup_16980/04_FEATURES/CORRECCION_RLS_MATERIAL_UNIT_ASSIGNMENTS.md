# 🔧 Corrección de Ambigüedad en RLS de Asignación de Unidades

**Fecha:** 23 de Noviembre 2025
**Estado:** ✅ Implementado
**Prioridad:** Alta (Bloqueante)

## 📄 Descripción del Problema

Al intentar asignar un material a una unidad específica mediante la función `assign_material_to_units`, se producía un error de base de datos:

```
column reference "unit_id" is ambiguous
```

Este error ocurría porque las políticas de seguridad (RLS) de la tabla `material_unit_assignments` hacían referencia a `unit_id` en consultas que involucraban joins con otras tablas que también tenían una columna `unit_id` (o donde el contexto de la columna no era explícito), causando confusión al motor de PostgreSQL sobre a qué columna se refería.

## 🛠️ Solución Implementada

Se ha creado y ejecutado un script SQL (`147_fix_ambiguous_unit_id_v2.sql`) que realiza las siguientes acciones:

1.  **Recreación de Políticas RLS:** Se han eliminado y vuelto a crear todas las políticas de seguridad de la tabla `material_unit_assignments` utilizando **alias únicos y explícitos** para cada tabla en los joins.
    *   `u_admin`, `r_admin` para políticas de admin.
    *   `u_inst`, `r_inst`, `ui_inst`, `cu_inst`, `c_inst` para políticas de institución.
    *   `cu_teach`, `c_teach` para políticas de docentes.
    *   `cu_stud`, `ce_stud` para políticas de estudiantes.

2.  **Recreación de Función RPC:** Se ha actualizado la función `assign_material_to_units` para utilizar variables con nombres distintos a las columnas (`v_target_unit_id` en lugar de `unit_id`) y cualificar explícitamente todas las referencias a columnas en las consultas SQL.

## 💻 Código SQL Clave

```sql
-- Ejemplo de política corregida con alias explícitos
CREATE POLICY "institution_access_material_unit_assignments"
ON public.material_unit_assignments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users u_inst 
        JOIN public.roles r_inst ON u_inst.role_id = r_inst.id 
        JOIN public.user_institutions ui_inst ON ui_inst.user_id = u_inst.id
        JOIN public.course_units cu_inst ON cu_inst.id = material_unit_assignments.unit_id
        JOIN public.courses c_inst ON c_inst.id = cu_inst.course_id
        WHERE u_inst.id = ...
        AND r_inst.name IN ('admin-campus', 'coordinator')
        AND u_inst.is_active = true
        AND ui_inst.institution_id = c_inst.institution_id
    )
);
```

## 🔍 Verificación

1.  **Prueba de Asignación:** Se ha verificado que la asignación de materiales a unidades desde la interfaz de usuario (`MaterialsManagementPage.tsx`) funciona correctamente sin lanzar el error de ambigüedad.
2.  **Seguridad:** Las políticas siguen restringiendo el acceso correctamente según el rol del usuario (Admin, Coordinador, Profesor, Estudiante).

## 📂 Archivos Relacionados

- `sql_scripts/147_fix_ambiguous_unit_id_v2.sql`: Script de corrección.
- `src/services/teacherCourses.ts`: Servicio que invoca la función RPC.
