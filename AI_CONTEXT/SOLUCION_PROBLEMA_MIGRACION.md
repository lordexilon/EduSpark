# 🔧 Solución: Problema con Migración course_modules → course_units

**Problema Identificado:** La migración no se guardó porque el script usa transacciones pero no hace `COMMIT;` automático.

---

## ⚠️ El Problema

Los scripts `77_migrar_modules_a_units.sql` y `78_migrar_materiales_modules_a_units.sql` tienen:
```sql
BEGIN;
-- ... código de migración ...
-- COMMIT;  ← Comentado, no se ejecuta automáticamente
```

**Resultado:** Los datos se insertan pero se revierten cuando termina la transacción.

---

## ✅ Solución: Script Simplificado SIN Transacción

He creado `sql_scripts/81_migracion_SIMPLE.sql` que **NO usa transacciones** y guarda los cambios inmediatamente.

### Ejecución:

1. **Abre Supabase SQL Editor**

2. **Ejecuta el script completo `81_migracion_SIMPLE.sql`**
   - Copia todo el contenido del archivo
   - Pega en SQL Editor
   - Ejecuta (Run)

3. **Verifica los resultados:**
   - Debes ver "unidades_insertadas: 6"
   - Debes ver "materiales_insertados: 2"
   - Debes ver las 6 unidades del curso 9

---

## 🔍 Verificación Post-Migración

Después de ejecutar `81_migracion_SIMPLE.sql`, verifica:

### Query 1: Verificar unidades del curso 9
```sql
SELECT id, course_id, number, title, order_index
FROM course_units
WHERE course_id = 9
ORDER BY order_index;
```

**Esperado:** 6 filas (Comunicación, Matemática, Química, Biología, Anatomía, Psicotécnico)

### Query 2: Verificar materiales migrados
```sql
SELECT m.id, m.title, m.kind, cu.title as unit_title
FROM materials m
JOIN course_units cu ON m.unit_id = cu.id
WHERE m.metadata->>'migrated_from' = 'course_materials'
ORDER BY cu.order_index;
```

**Esperado:** 2 filas (materiales de Anatomía)

### Query 3: Verificar en el frontend
1. Recarga http://localhost:5173/#/sessions?courseId=9
2. Deberías ver las 6 unidades
3. Ir a http://localhost:5173/#/courses/9
4. Deberías ver las 6 unidades con sus materiales

---

## 📝 Alternativa: Ejecutar Script 77 Manualmente con COMMIT

Si prefieres usar el script original con transacción:

1. Ejecuta `77_migrar_modules_a_units.sql`
2. **INMEDIATAMENTE ejecuta:** `COMMIT;`
3. Ejecuta `78_migrar_materiales_modules_a_units.sql`
4. **INMEDIATAMENTE ejecuta:** `COMMIT;`

---

## ⚠️ Si Sigue Sin Funcionar

Ejecuta el script de diagnóstico:
```sql
-- Script: 80_diagnostico_problema_migracion.sql
```

Comparte los resultados para verificar problemas de permisos RLS.

