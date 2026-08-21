# Corrección del Mapeo de Roles

## 📋 Resumen

Se corrigió el mapeo de roles en todo el sistema para que coincida con la estructura real de la base de datos.

## ✅ Mapeo Correcto de Roles

```
ID  | Nombre        | Descripción
----|---------------|----------------------------------
1   | student       | Estudiante
2   | teacher       | Docente
3   | admin         | Administrador del sistema
4   | coordinator    | Coordinador académico
```

## ⚠️ Regla de Seguridad Crítica

**TODOS los usuarios nuevos se crean SIEMPRE como estudiantes (role_id: 1)**

- El rol solo puede ser cambiado DESPUÉS del registro por un administrador
- Esto previene que alguien se registre como admin durante el proceso de registro
- Ningún usuario puede auto-asignarse un rol diferente a estudiante

## 📝 Archivos Corregidos

### Código Frontend/Backend:
1. ✅ `services/api.ts` - Forza `role_id: 1` en registro
2. ✅ `components/RegisterForm.tsx` - Usa `role_id: 1` por defecto

### Scripts SQL:
1. ✅ `sql_scripts/48_fix_and_test_trigger.sql` - Trigger usa `role_id: 1`
2. ✅ `sql_scripts/46_create_user_registration_rpc.sql` - RPC usa `role_id: 1`
3. ✅ `sql_scripts/50_sync_specific_user.sql` - Sincronización usa `role_id: 1`
4. ✅ `sql_scripts/51_sync_all_missing_users.sql` - Sincronización usa `role_id: 1`

### Documentación:
1. ✅ `AI_CONTEXT/schema_actual.md` - Schema actualizado con mapeo correcto

## 🔍 Script de Verificación

Se creó `sql_scripts/53_verify_and_fix_roles.sql` para verificar que los roles en la base de datos tengan el mapeo correcto.

**Ejecutar este script para:**
- Verificar roles actuales en la base de datos
- Verificar que el mapeo sea correcto (1=student, 2=teacher, 3=admin, 4=coordinator)
- Insertar/actualizar roles si es necesario

## ⚠️ Notas Importantes

1. **Si ya hay usuarios en la base de datos con roles incorrectos**, será necesario migrarlos manualmente.
2. **El rol de coordinador (4) puede no existir** en bases de datos antiguas. El script de verificación lo creará si es necesario.
3. **Todos los nuevos registros** desde ahora usarán `role_id: 1` (estudiante) sin excepción.

## 🎯 Próximos Pasos

1. Ejecutar `sql_scripts/53_verify_and_fix_roles.sql` para verificar/corregir roles
2. Verificar usuarios existentes con roles incorrectos (especialmente el que tiene `role_id: 3` pero debería ser estudiante)
3. Probar registro de un nuevo usuario para confirmar que se crea como estudiante

