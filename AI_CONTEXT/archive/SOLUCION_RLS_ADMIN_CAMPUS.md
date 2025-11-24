# Solución: Filtrado por Institución para Admin-Campus

**Fecha:** 2025-11-19  
**Estado:** ✅ RESUELTO  
**Prioridad:** ALTA

---

## 📋 Problema Original

El usuario con rol `admin-campus` podía ver **TODOS** los usuarios e instituciones del sistema, en lugar de ver solo los usuarios e instituciones de su propia institución.

### Síntomas:
- En `/admin/users`: Admin-campus veía los 5 usuarios de todas las instituciones
- En `/admin/institutions`: Admin-campus veía todas las instituciones
- Las políticas RLS no estaban filtrando correctamente

---

## 🔍 Diagnóstico

### Problemas Identificados:

1. **Políticas RLS Conflictivas**
   - Existían múltiples políticas con nombres diferentes que se contradecían
   - Políticas antiguas como `"Allow authenticated read users"` permitían acceso sin restricción
   - Había políticas duplicadas de diferentes scripts SQL ejecutados anteriormente

2. **Verificación de Permisos en Frontend**
   - `UsersManagementPage.tsx` no incluía `'admin-campus'` en la verificación de permisos (línea 376)
   - Mostraba mensaje "Acceso Restringido" aunque el `AdminRoute` permitía el acceso

3. **Error en función `get_user_email_status`**
   - La función devolvía `TEXT` pero `auth.users.email` es `VARCHAR(255)`
   - Causaba error 400: "structure of query does not match function result type"

4. **Error en `user_query_limits`**
   - Usaba `.single()` en lugar de `.maybeSingle()`
   - Causaba error 406 cuando el usuario no tenía límites configurados

---

## ✅ Soluciones Implementadas

### 1. Políticas RLS Corregidas

**Script:** `sql_scripts/FIX_RLS_DEFINITIVO.sql`

#### Políticas para `users`:
```sql
-- Admin ve TODOS los usuarios
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-campus/Coordinator ven SOLO usuarios de su institución
CREATE POLICY "users_institution_access" ON public.users
  FOR SELECT
  USING (
    NOT public.is_admin() AND
    (public.is_admin_campus() OR public.is_coordinator() OR public.is_teacher()) AND
    public.get_user_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = users.id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );

-- Usuarios ven su propio perfil
CREATE POLICY "users_own_read" ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- Permitir INSERT para registro
CREATE POLICY "users_allow_insert" ON public.users
  FOR INSERT
  WITH CHECK (true);
```

#### Políticas para `institutions`:
```sql
-- Admin ve TODAS las instituciones
CREATE POLICY "institutions_admin_all" ON public.institutions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Otros ven SOLO su institución
CREATE POLICY "institutions_institution_access" ON public.institutions
  FOR SELECT
  USING (
    NOT public.is_admin() AND
    id = public.get_user_institution_id()
  );
```

### 2. Frontend Corregido

**Archivo:** `pages/UsersManagementPage.tsx`

```typescript
// Antes (línea 376)
const isAdmin = currentUser?.role?.name === 'admin' || 
  currentUser?.role?.name === 'coordinator';

// Después
const isAdmin = currentUser?.role?.name === 'admin' || 
  currentUser?.role?.name === 'coordinator' || 
  currentUser?.role?.name === 'admin-campus';
```

### 3. Función `get_user_email_status` Corregida

**Archivo:** `sql_scripts/FIX_get_user_email_status.sql`

```sql
-- Cambio de TEXT a VARCHAR(255)
CREATE OR REPLACE FUNCTION public.get_user_email_status(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  email VARCHAR(255),  -- Cambiado de TEXT
  email_confirmed_at TIMESTAMPTZ,
  is_confirmed BOOLEAN
)
```

### 4. Query de `user_query_limits` Corregida

**Archivo:** `pages/UsersManagementPage.tsx` (línea 295)

```typescript
// Antes
.from('user_query_limits')
.select('*')
.eq('user_id', userId)
.single();  // Error si no existe

// Después
.from('user_query_limits')
.select('*')
.eq('user_id', userId)
.maybeSingle();  // Devuelve null si no existe
```

---

## 🎯 Resultado Final

### Comportamiento Correcto:

**Admin Global (`admin`):**
- ✅ Ve TODOS los usuarios (5 usuarios)
- ✅ Ve TODAS las instituciones (3 instituciones)
- ✅ Puede gestionar todo sin restricciones

**Admin-Campus (`admin-campus` - jorgelinamedi@gmail.com):**
- ✅ Ve SOLO 2 usuarios de su institución:
  - Jorgelina Medina (admin-campus)
  - Perla Caceres (teacher)
- ✅ Ve SOLO 1 institución:
  - Alianza Educativa Internacional (ID: 3)
- ✅ Puede gestionar solo usuarios de su institución

**Coordinator (`coordinator`):**
- ✅ Mismo comportamiento que admin-campus
- ✅ Ve solo usuarios e instituciones de su institución

---

## 📝 Funciones Helper Utilizadas

Las políticas RLS dependen de estas funciones (definidas en `implement_institution_based_roles.sql`):

```sql
-- Verifica si el usuario es admin global
public.is_admin()

-- Verifica si el usuario es admin-campus
public.is_admin_campus()

-- Verifica si el usuario es coordinator
public.is_coordinator()

-- Obtiene la institución primaria del usuario actual
public.get_user_institution_id()
```

---

## 🔧 Scripts SQL Importantes

1. **`FIX_RLS_DEFINITIVO.sql`** ⭐ (PRINCIPAL)
   - Elimina TODAS las políticas conflictivas
   - Crea las políticas correctas para filtrado por institución
   - **Ejecutar este script resuelve el problema**

2. **`implement_institution_based_roles.sql`**
   - Define las funciones helper
   - Crea el rol `admin-campus`
   - Políticas base (puede tener conflictos con políticas antiguas)

3. **`fix_users_rls_for_admin_campus.sql`**
   - Script anterior que intentaba resolver el problema
   - **NO ejecutar** (puede causar conflictos)
   - Reemplazado por `FIX_RLS_DEFINITIVO.sql`

4. **`FIX_get_user_email_status.sql`**
   - Corrige el tipo de dato de la función
   - Ejecutar si hay errores 400 con `get_user_email_status`

5. **`VERIFICAR_Y_ASIGNAR_INSTITUCION.sql`**
   - Script de diagnóstico
   - Verifica si un usuario tiene institución asignada
   - Permite asignar institución si falta

---

## ⚠️ Requisitos Importantes

### Para que las políticas RLS funcionen correctamente:

1. **Todos los usuarios deben tener institución asignada** (excepto admin global)
   ```sql
   -- Verificar
   SELECT u.email, ui.institution_id 
   FROM users u
   LEFT JOIN user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
   WHERE u.role_id != (SELECT id FROM roles WHERE name = 'admin');
   
   -- Asignar si falta
   INSERT INTO user_institutions (user_id, institution_id, is_primary, joined_at)
   VALUES ('USER_ID', INSTITUTION_ID, true, NOW())
   ON CONFLICT (user_id, institution_id) DO UPDATE SET is_primary = true;
   ```

2. **RLS debe estar habilitado en las tablas**
   ```sql
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
   ```

3. **Las funciones helper deben existir**
   - Verificar con: `SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE 'is_%' OR routine_name LIKE 'get_user_%';`

---

## 🚀 Cómo Aplicar la Solución

### Si el problema vuelve a ocurrir:

1. **Ejecutar en Supabase SQL Editor:**
   ```sql
   -- Copiar y pegar el contenido completo de:
   sql_scripts/FIX_RLS_DEFINITIVO.sql
   ```

2. **Verificar que las políticas se crearon:**
   ```sql
   SELECT tablename, policyname, cmd
   FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('users', 'institutions')
   ORDER BY tablename, policyname;
   ```

3. **Recargar la página** en el navegador (Ctrl+F5)

4. **Verificar el resultado:**
   - Admin-campus debe ver solo usuarios de su institución
   - Admin global debe ver todos los usuarios

---

## 📊 Estructura de Datos

### Tabla `user_institutions`
```sql
CREATE TABLE user_institutions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  institution_id INTEGER REFERENCES institutions(id),
  is_primary BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, institution_id)
);
```

### Roles en el Sistema
```sql
-- ID y nombres de roles
1 - student
2 - teacher
3 - admin (sin restricción de institución)
4 - coordinator (restringido a su institución)
5 - admin-campus (restringido a su institución)
```

---

## 🔍 Diagnóstico Rápido

### Si admin-campus ve todos los usuarios:

```sql
-- 1. Verificar que las políticas existen
SELECT policyname FROM pg_policies 
WHERE tablename = 'users' 
  AND policyname IN ('users_admin_all', 'users_institution_access');

-- 2. Verificar que el usuario tiene institución
SELECT public.get_user_institution_id();  -- Debe devolver un número, no NULL

-- 3. Verificar que las funciones funcionan
SELECT 
  public.is_admin() as soy_admin,
  public.is_admin_campus() as soy_admin_campus,
  public.get_user_institution_id() as mi_institucion;
```

---

## 📚 Referencias

- **Conversación:** Fix Admin-Campus View (2025-11-19)
- **Usuario de prueba:** jorgelinamedi@gmail.com (admin-campus, Institución ID: 3)
- **Documentación Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security

---

**Última actualización:** 2025-11-19  
**Estado:** ✅ FUNCIONANDO CORRECTAMENTE
