# Guía: Activar/Desactivar Instituciones

## 📌 Descripción

Las instituciones pueden estar **activas** o **inactivas**. Solo las instituciones activas aparecen en la landing page pública.

**Estado `is_active = true`:** ✅ Visible en landing page  
**Estado `is_active = false`:** ❌ Oculta en landing page

---

## 🎯 Método 1: Interfaz de Administración (Recomendado)

### Acceso
1. Inicia sesión como **admin global**
2. Ve a `/admin/institutions`

### Pasos
1. **Localiza la institución** que quieres activar/desactivar
2. **Verifica el estado actual:**
   - Badge verde "Activa" = visible en landing
   - Badge gris "Inactiva" = oculta en landing
3. **Click en el botón:**
   - "Activar" (verde) para hacer visible
   - "Desactivar" (naranja) para ocultar
4. **Confirma la acción** en el diálogo
5. **Verifica el cambio:**
   - El badge cambiará de color
   - Aparece mensaje de confirmación
   - Se actualiza el texto "✓ Visible en landing page"

### Permisos
- ✅ **Admin global:** Puede activar/desactivar cualquier institución
- ❌ **Admin-campus/Coordinator:** Solo pueden ver el estado
- ❌ **Teacher/Student:** No tienen acceso a esta página

---

## 🎯 Método 2: SQL Directo (Rápido)

### Opción A: Por ID
```sql
-- Ver todas las instituciones con sus IDs
SELECT id, name, is_active FROM institutions ORDER BY name;

-- Activar institución ID 3
UPDATE institutions
SET is_active = true, updated_at = NOW()
WHERE id = 3;

-- Desactivar institución ID 3
UPDATE institutions
SET is_active = false, updated_at = NOW()
WHERE id = 3;
```

### Opción B: Por Nombre
```sql
-- Activar "Alianza Educativa Internacional"
UPDATE institutions
SET is_active = true, updated_at = NOW()
WHERE name = 'Alianza Educativa Internacional';

-- Desactivar
UPDATE institutions
SET is_active = false, updated_at = NOW()
WHERE name = 'Alianza Educativa Internacional';
```

### Opción C: Toggle (Cambiar al opuesto)
```sql
-- Cambiar al estado contrario
UPDATE institutions
SET is_active = NOT is_active, updated_at = NOW()
WHERE id = 3;
```

---

## 🎯 Método 3: Función SQL Helper

### Uso de la función `toggle_institution_status`

Si ejecutaste el script `UTIL_TOGGLE_INSTITUTIONS.sql`, puedes usar:

```sql
-- Toggle (cambiar al estado opuesto)
SELECT * FROM toggle_institution_status(3);

-- Activar específicamente institución ID 3
SELECT * FROM toggle_institution_status(3, true);

-- Desactivar específicamente institución ID 3
SELECT * FROM toggle_institution_status(3, false);
```

**Retorna:**
- ID de la institución
- Nombre
- Estado anterior
- Estado nuevo
- Mensaje descriptivo

---

## 📊 Consultas Útiles

### Ver estado de todas las instituciones
```sql
SELECT 
    id,
    name,
    is_active,
    CASE 
        WHEN is_active THEN '✓ Visible en landing'
        ELSE '✗ Oculta en landing'
    END as estado_landing
FROM institutions
ORDER BY name;
```

### Ver solo las activas (landing page)
```sql
SELECT id, name, website, logo_url
FROM institutions
WHERE is_active = true
ORDER BY name;
```

### Contar instituciones por estado
```sql
SELECT 
    is_active,
    COUNT(*) as total,
    CASE 
        WHEN is_active THEN 'Visibles en landing'
        ELSE 'Ocultas'
    END as descripcion
FROM institutions
GROUP BY is_active;
```

---

## ⚠️ Importante

### Efectos de la activación/desactivación

#### ✅ Lo que SÍ afecta:
- Visibilidad en la **landing page pública** (`/`)
- La sección "Instituciones que confían en nosotros"

#### ❌ Lo que NO afecta:
- **Acceso de usuarios:** Los usuarios de una institución inactiva SIGUEN teniendo acceso normal
- **Datos:** No se elimina ni modifica ningún dato
- **Relaciones:** Los usuarios siguen asignados a la institución
- **Funcionalidad:** La institución sigue operativa internamente

### Casos de uso comunes

**Activar institución:**
- Nueva institución que quieres mostrar públicamente
- Institución con logo y descripción completa
- Institución que quieres promocionar

**Desactivar institución:**
- Institución en proceso de configuración
- Institución temporal o de prueba
- Institución que ya no quieres mostrar públicamente
- Institución sin logo o información completa

---

## 🔍 Verificación

### Verificar cambios en la base de datos
```sql
SELECT id, name, is_active, updated_at
FROM institutions
WHERE id = 3;  -- Reemplaza con tu ID
```

### Verificar en la aplicación
1. **Landing page:** Ve a `/` (sin estar logueado)
2. Busca la sección "Instituciones que confían en nosotros"
3. Verifica que solo aparezcan las instituciones activas

### Verificar en panel de admin
1. Ingresa a `/admin/institutions`
2. Verifica el badge de estado
3. Confirma el mensaje "✓ Visible en landing page" o "✗ Oculta en landing page"

---

## 🛠️ Troubleshooting

### La institución no aparece en landing page
**Causas posibles:**
1. `is_active = false`
2. Políticas RLS bloqueando (si estás logueado como admin-campus)
3. Error en la carga de datos

**Solución:**
```sql
-- Verificar estado y RLS
SELECT id, name, is_active 
FROM institutions 
WHERE id = TU_ID;

-- Forzar activación
UPDATE institutions 
SET is_active = true, updated_at = NOW() 
WHERE id = TU_ID;
```

### El botón no aparece en la UI
**Causas:**
- No eres **admin global**
- Solo admin puede activar/desactivar vía UI

**Solución:**
- Usa SQL directo
- Solicita a un admin global

### Error de permisos al actualizar
**Causas:**
- Políticas RLS
- Rol sin permisos UPDATE

**Solución:**
```sql
-- Verificar tus permisos actuales
SELECT current_user, is_admin(), get_user_institution_id();

-- Como admin, puedes actualizar cualquier institución
-- Como admin-campus, usa el panel UI
```

---

## 📚 Archivos Relacionados

- **UI:** `pages/InstitutionManagementPage.tsx`
- **Servicio:** `services/institutionService.ts`
- **Landing:** `pages/LandingPage.tsx`
- **Script SQL:** `sql_scripts/UTIL_TOGGLE_INSTITUTIONS.sql`
- **Documentación:** `AI_CONTEXT/IMPLEMENTACION_INSTITUCIONES_UI.md`

---

## 🎓 Ejemplos Prácticos

### Escenario 1: Activar institución nueva
```sql
-- 1. Ver la institución
SELECT id, name, is_active FROM institutions WHERE name LIKE '%Nueva%';

-- 2. Activar (supongamos ID = 5)
UPDATE institutions 
SET is_active = true, updated_at = NOW() 
WHERE id = 5;

-- 3. Verificar
SELECT name, is_active FROM institutions WHERE id = 5;
```

### Escenario 2: Desactivar institución temporal
```sql
-- Desactivar "Institución de Prueba"
UPDATE institutions 
SET is_active = false, updated_at = NOW() 
WHERE name = 'Institución de Prueba';
```

### Escenario 3: Activar todas con logo
```sql
-- Activar solo instituciones que tengan logo
UPDATE institutions
SET is_active = true, updated_at = NOW()
WHERE logo_url IS NOT NULL AND logo_url != '';
```

---

**Última actualización:** 2025-11-19
