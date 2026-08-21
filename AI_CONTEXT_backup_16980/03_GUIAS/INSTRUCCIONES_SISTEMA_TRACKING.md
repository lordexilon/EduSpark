# 📊 Instrucciones: Sistema de Tracking de Participación

## 🚀 Pasos para Activar el Sistema

### Paso 1: Ejecutar Script SQL
1. Abre Supabase Dashboard
2. Ve a SQL Editor
3. Copia y pega el contenido de: `sql_scripts/87_create_unit_session_progress.sql`
4. Click en "Run"
5. Verifica que aparezcan mensajes de éxito

### Paso 2: Verificar Creación
Ejecuta esta query para verificar:
```sql
SELECT 
    COUNT(*) as total_tablas
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('unit_progress', 'session_progress');
```

Deberías ver: `total_tablas: 2`

### Paso 3: Probar en la App
1. Recarga la aplicación
2. Login como estudiante
3. Ve a un curso: `/courses/1`
4. Expande una unidad
5. Lee el contenido
6. Click en "Entendido ✓"
7. Deberías ver mensaje de confirmación

---

## 🔍 Verificar que Funciona

### Query 1: Ver registros creados
```sql
SELECT * FROM unit_progress ORDER BY created_at DESC LIMIT 10;
```

### Query 2: Ver progreso de un estudiante
```sql
SELECT 
    cu.title as unidad,
    up.is_completed as leida,
    up.time_spent_minutes as minutos,
    up.first_accessed_at as primera_vez,
    up.last_accessed_at as ultima_vez
FROM unit_progress up
JOIN course_units cu ON cu.id = up.unit_id
WHERE up.student_id = '228e43a9-d78d-4117-ab00-a01a39df51d3'
  AND up.course_id = 1
ORDER BY up.created_at DESC;
```

---

## ❌ Si Hay Errores

### Error 1: "relation does not exist"
**Problema:** Las tablas no se crearon  
**Solución:** Ejecuta el script SQL de nuevo

### Error 2: "permission denied"
**Problema:** Políticas RLS bloquean  
**Solución:** Verifica que estás logueado como estudiante

### Error 3: "duplicate key"
**Problema:** Intentas crear registro duplicado  
**Solución:** El código ya maneja esto, no debería pasar

---

## 🎯 Qué Registrar

### Al Marcar "Entendido ✓":
1. ✅ Registro en `unit_progress`
2. ✅ Tiempo estimado: 15 minutos
3. ✅ Timestamp de primera y última vez
4. ✅ Actualización automática de `course_enrollments.completion_percentage`

### En el Futuro (No implementado aún):
- Tiempo real de lectura
- Scroll tracking
- Actividades completadas
- Completitud automática

---

## 📊 Cómo Usar los Datos

### Para Docentes:

**Ver progreso de mi curso:**
```sql
SELECT 
    u.email as estudiante,
    COUNT(DISTINCT up.id) FILTER (WHERE up.is_completed) as unidades_leidas,
    COUNT(DISTINCT cu.id) as total_unidades,
    SUM(up.time_spent_minutes) as minutos_totales
FROM course_enrollments ce
JOIN users u ON u.id = ce.student_id
LEFT JOIN unit_progress up ON up.student_id = ce.student_id AND up.course_id = ce.course_id
LEFT JOIN course_units cu ON cu.course_id = ce.course_id
WHERE ce.course_id = 1
GROUP BY ce.id, u.email
ORDER BY unidades_leidas DESC;
```

**Ver estudiantes con bajo progreso:**
```sql
SELECT 
    u.email,
    COUNT(DISTINCT up.id) FILTER (WHERE up.is_completed) * 100.0 / 
    COUNT(DISTINCT cu.id) as porcentaje_progreso
FROM course_enrollments ce
JOIN users u ON u.id = ce.student_id
LEFT JOIN unit_progress up ON up.student_id = ce.student_id AND up.course_id = ce.course_id
LEFT JOIN course_units cu ON cu.course_id = ce.course_id
WHERE ce.course_id = 1
GROUP BY ce.id, u.email
HAVING COUNT(DISTINCT up.id) FILTER (WHERE up.is_completed) * 100.0 / 
       COUNT(DISTINCT cu.id) < 50;
```

---

## 🎉 Estado Actual

**Implementado:**
- ✅ Tablas de tracking (`unit_progress`, `session_progress`)
- ✅ Políticas RLS
- ✅ Servicio `progressService.ts`
- ✅ Botón "Entendido ✓" en unidades
- ✅ Manejo de errores

**Próximos Pasos:**
- ⏳ Tracking en sesiones
- ⏳ Dashboard de progreso para docentes
- ⏳ Indicadores visuales para estudiantes
- ⏳ Medición de tiempo real

