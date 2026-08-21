# 🔍 Debug: Acceso de Estudiante a Contenido

## Problema Reportado
- ✅ **Admin puede ver:** http://localhost:5173/#/teacher/courses/1
- ❌ **Estudiante NO puede ver:** http://localhost:5173/#/courses/1

## Diagnóstico SQL (Ejecutado)

### ✅ Confirmado:
1. **Curso 1 existe** con 1 unidad, 1 sesión, 1 material
2. **2 estudiantes inscritos** activamente:
   - miguec@gmail.com (student_id: 228e43a9-d78d-4117-ab00-a01a39df51d3)
   - albertovillalba@gmail.com (student_id: b72dabe7-9ace-4e50-aa17-f770c5c94c0e)
3. **Políticas RLS existen:**
   - `students_can_view_enrolled_course_units` ✅
   - `students_can_view_enrolled_course_sessions` ✅
   - `students_can_view_enrolled_course_materials` ✅
4. **Test de acceso SQL:** El estudiante miguec@gmail.com PUEDE ver la unidad ✅

### ⚠️ Nota:
- Hay materiales legacy en `course_materials` (6 registros)
- Hay materiales migrados en `materials` (1 registro)

---

## 🔧 Pasos de Debug

### Paso 1: Verificar Consola del Navegador

1. **Inicia la app** si no está corriendo:
   ```bash
   npm run dev
   ```

2. **Abre DevTools** (F12 en el navegador)

3. **Login como estudiante:**
   - Email: `miguec@gmail.com`
   - Contraseña: [la que uses en tu sistema]

4. **Navega a:** http://localhost:5173/#/courses/1

5. **Revisa la consola** por errores:
   - Busca mensajes de error en rojo
   - Copia TODOS los mensajes que aparezcan
   - Especialmente busca errores relacionados con:
     - `course_units`
     - `sessions`
     - `materials`
     - `RLS policy`
     - `403` o `401`

---

### Paso 2: Verificar Auth Context

En la consola del navegador, ejecuta:
```javascript
// Verificar usuario autenticado
console.log('Usuario actual:', window.location.href);

// Ver roles y permisos
// Esto requiere acceso a la app, así que mejor revisa el código
```

---

### Paso 3: Verificar Network Tab

1. **Abre DevTools → Network**
2. **Filtra por "Fetch/XHR"**
3. **Recarga la página** `/courses/1`
4. **Busca requests a Supabase:**
   - Deberías ver requests a:
     - `courses` (para obtener el curso)
     - `course_units` (para obtener unidades)
     - `sessions` (para obtener sesiones)
   - **Revisa el Status Code:**
     - `200` = OK
     - `401` = No autenticado
     - `403` = Política RLS bloquea
     - `404` = No encontrado
   - **Revisa Response JSON:** Copia cualquier error

---

### Paso 4: Verificar RLS Policy Con Usuario Real

```sql
-- Ejecutar ESTA query en Supabase SQL Editor
-- Reemplaza el UUID con el student_id de miguec@gmail.com
-- (228e43a9-d78d-4117-ab00-a01a39df51d3 según el diagnóstico)

-- Test RLS policy con usuario real
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '228e43a9-d78d-4117-ab00-a01a39df51d3';

SELECT 
  id, 
  number, 
  title, 
  description
FROM course_units
WHERE course_id = 1;

-- Si esto retorna 0 filas, la política RLS está bloqueando
```

---

### Paso 5: Verificar Autenticación del Cliente

El cliente de Supabase necesita estar autenticado. Verifica:

1. **En la consola del navegador:**
   ```javascript
   // Esto debería imprimir el usuario actual
   const { supabase } = await import('./lib/supabase');
   supabase.auth.getUser().then(({ data, error }) => {
     console.log('Usuario autenticado:', data.user);
     console.log('Error:', error);
   });
   ```

2. **Si no está autenticado:**
   - El login no se completó correctamente
   - El token expiró
   - Hay un problema con la configuración de Supabase

---

## 🎯 Próximos Pasos

**Comparte:**
1. ✅ Todos los mensajes de consola cuando navegas a `/courses/1`
2. ✅ Screenshots de Network Tab (requests a Supabase)
3. ✅ Resultado del Paso 4 (query SQL con SET ROLE)

Con esta información podré identificar exactamente dónde está el problema.

